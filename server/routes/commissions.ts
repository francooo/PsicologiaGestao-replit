import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { roomBookings, rooms, psychologists } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function adminOnly(req: any, res: any, next: any) {
    if (!req.user || (req.user as any).role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Somente administradores." });
    }
    next();
}

router.use(adminOnly);

function hoursFromTime(start: string, end: string): number {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

async function calcCommissionPreview(psychologistId: number, periodStart: string, periodEnd: string) {
    const [psychRow] = await db
        .select({ hourlyRate: psychologists.hourlyRate })
        .from(psychologists)
        .where(eq(psychologists.id, psychologistId));

    const hourlyRate = psychRow ? parseFloat(psychRow.hourlyRate) : 0;

    const bookings = await db
        .select({
            id: roomBookings.id,
            date: roomBookings.date,
            startTime: roomBookings.startTime,
            endTime: roomBookings.endTime,
            roomId: roomBookings.roomId,
            roomName: rooms.name,
        })
        .from(roomBookings)
        .leftJoin(rooms, eq(roomBookings.roomId, rooms.id))
        .where(
            and(
                eq(roomBookings.psychologistId, psychologistId),
                gte(roomBookings.date, periodStart),
                lte(roomBookings.date, periodEnd)
            )
        );

    const config = await storage.getActiveCommissionPayoutConfig(psychologistId, periodStart);

    const items = bookings.map((b) => {
        const hours = hoursFromTime(b.startTime, b.endTime);
        const bookingValue = hours * hourlyRate;
        let repasseValue = 0;
        if (config) {
            const val = parseFloat(config.payoutValue);
            repasseValue = config.payoutType === "percentual"
                ? (bookingValue * val) / 100
                : val;
        }
        return {
            bookingId: b.id,
            bookingDate: b.date,
            roomName: b.roomName,
            startTime: b.startTime,
            endTime: b.endTime,
            bookingValue,
            repasseValue,
        };
    });

    const totalRoomsValue = items.reduce((acc, i) => acc + i.bookingValue, 0);
    const totalRepasse = items.reduce((acc, i) => acc + i.repasseValue, 0);

    return { items, totalRoomsValue, totalRepasse, totalBookings: items.length, config };
}

// GET /api/admin/commissions/dashboard
router.get("/dashboard", async (req, res) => {
    try {
        const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
        const data = await storage.getCommissionDashboard(month);
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar dashboard" });
    }
});

// GET /api/admin/commissions
router.get("/", async (req, res) => {
    try {
        const { psychologistId, status, periodStart, periodEnd } = req.query;
        const list = await storage.listCommissions({
            psychologistId: psychologistId ? parseInt(psychologistId as string) : undefined,
            status: status as string | undefined,
            periodStart: periodStart as string | undefined,
            periodEnd: periodEnd as string | undefined,
        });

        const enriched = await Promise.all(
            list.map(async (c) => {
                const psych = await storage.getPsychologist(c.psychologistId);
                const user = psych ? await storage.getUser(psych.userId) : null;
                return { ...c, psychologistName: user?.fullName ?? null };
            })
        );
        res.json(enriched);
    } catch (e) {
        res.status(500).json({ message: "Erro ao listar comissionamentos" });
    }
});

// GET /api/admin/commissions/preview
router.get("/preview", async (req, res) => {
    try {
        const { psychologistId, periodStart, periodEnd } = req.query;
        if (!psychologistId || !periodStart || !periodEnd) {
            return res.status(400).json({ message: "Parâmetros obrigatórios: psychologistId, periodStart, periodEnd" });
        }
        const preview = await calcCommissionPreview(
            parseInt(psychologistId as string),
            periodStart as string,
            periodEnd as string
        );
        res.json(preview);
    } catch (e) {
        res.status(500).json({ message: "Erro ao calcular preview" });
    }
});

// GET /api/admin/commissions/:id
router.get("/:id", async (req, res) => {
    try {
        const c = await storage.getCommission(parseInt(req.params.id));
        if (!c) return res.status(404).json({ message: "Comissionamento não encontrado" });
        const psych = await storage.getPsychologist(c.psychologistId);
        const user = psych ? await storage.getUser(psych.userId) : null;
        res.json({ ...c, psychologistName: user?.fullName ?? null });
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar comissionamento" });
    }
});

// GET /api/admin/commissions/:id/items
router.get("/:id/items", async (req, res) => {
    try {
        const items = await storage.listCommissionItems(parseInt(req.params.id));
        res.json(items);
    } catch (e) {
        res.status(500).json({ message: "Erro ao buscar itens" });
    }
});

// POST /api/admin/commissions/generate
router.post("/generate", async (req, res) => {
    try {
        const schema = z.object({
            psychologistId: z.number(),
            periodStart: z.string(),
            periodEnd: z.string(),
        });
        const { psychologistId, periodStart, periodEnd } = schema.parse(req.body);

        const existing = await storage.listCommissions({ psychologistId, periodStart, periodEnd });
        if (existing.length > 0) {
            return res.status(409).json({ message: "Já existe um comissionamento para este período e psicóloga." });
        }

        const { items, totalRoomsValue, totalRepasse, totalBookings } = await calcCommissionPreview(
            psychologistId, periodStart, periodEnd
        );

        const adminId = (req.user as any).id;
        const commission = await storage.createCommission({
            psychologistId,
            periodStart,
            periodEnd,
            totalBookings,
            totalRoomsValue: totalRoomsValue.toFixed(2),
            totalRepasse: totalRepasse.toFixed(2),
            status: "pending",
            paymentDate: null,
            paymentMethod: null,
            paymentNotes: null,
            createdByAdminId: adminId,
        });

        await storage.createCommissionItems(
            items.map((i) => ({
                commissionId: commission.id,
                bookingId: i.bookingId,
                bookingDate: i.bookingDate,
                roomName: i.roomName,
                startTime: i.startTime,
                endTime: i.endTime,
                bookingValue: i.bookingValue.toFixed(2),
                repasseValue: i.repasseValue.toFixed(2),
            }))
        );

        res.status(201).json(commission);
    } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
        res.status(500).json({ message: "Erro ao gerar comissionamento" });
    }
});

// PATCH /api/admin/commissions/:id/pay
router.patch("/:id/pay", async (req, res) => {
    try {
        const schema = z.object({
            paymentDate: z.string(),
            paymentMethod: z.string().optional(),
            paymentNotes: z.string().optional(),
        });
        const data = schema.parse(req.body);
        const c = await storage.getCommission(parseInt(req.params.id));
        if (!c) return res.status(404).json({ message: "Comissionamento não encontrado" });
        if (c.status === "cancelled") return res.status(400).json({ message: "Não é possível pagar um comissionamento cancelado." });
        const updated = await storage.updateCommission(c.id, { ...data, status: "paid" });
        res.json(updated);
    } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
        res.status(500).json({ message: "Erro ao registrar pagamento" });
    }
});

// PATCH /api/admin/commissions/:id/cancel
router.patch("/:id/cancel", async (req, res) => {
    try {
        const c = await storage.getCommission(parseInt(req.params.id));
        if (!c) return res.status(404).json({ message: "Comissionamento não encontrado" });
        if (c.status === "paid") return res.status(400).json({ message: "Não é possível cancelar um comissionamento já pago." });
        const updated = await storage.updateCommission(c.id, { status: "cancelled" });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ message: "Erro ao cancelar comissionamento" });
    }
});

// ─── Payout Configs ───────────────────────────────────────────────────────────

// GET /api/admin/commission-configs
router.get("/configs/list", async (req, res) => {
    try {
        const { psychologistId } = req.query;
        const configs = await storage.listCommissionPayoutConfigs(
            psychologistId ? parseInt(psychologistId as string) : undefined
        );

        const enriched = await Promise.all(
            configs.map(async (c) => {
                const psych = await storage.getPsychologist(c.psychologistId);
                const user = psych ? await storage.getUser(psych.userId) : null;
                return { ...c, psychologistName: user?.fullName ?? null };
            })
        );
        res.json(enriched);
    } catch (e) {
        res.status(500).json({ message: "Erro ao listar configurações" });
    }
});

// POST /api/admin/commission-configs
router.post("/configs", async (req, res) => {
    try {
        const schema = z.object({
            psychologistId: z.number(),
            payoutType: z.enum(["percentual", "fixed"]),
            payoutValue: z.union([z.string().transform(parseFloat), z.number()]),
            validFrom: z.string(),
            validUntil: z.string().nullable().optional(),
        });
        const data = schema.parse(req.body);
        const config = await storage.createCommissionPayoutConfig({
            ...data,
            validUntil: data.validUntil ?? null,
        });
        res.status(201).json(config);
    } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
        res.status(500).json({ message: "Erro ao criar configuração" });
    }
});

// PUT /api/admin/commission-configs/:id
router.put("/configs/:id", async (req, res) => {
    try {
        const schema = z.object({
            payoutType: z.enum(["percentual", "fixed"]).optional(),
            payoutValue: z.union([z.string().transform(parseFloat), z.number()]).optional(),
            validFrom: z.string().optional(),
            validUntil: z.string().nullable().optional(),
        });
        const data = schema.parse(req.body);
        const updated = await storage.updateCommissionPayoutConfig(parseInt(req.params.id), data as any);
        if (!updated) return res.status(404).json({ message: "Configuração não encontrada" });
        res.json(updated);
    } catch (e: any) {
        if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
        res.status(500).json({ message: "Erro ao atualizar configuração" });
    }
});

export default router;
