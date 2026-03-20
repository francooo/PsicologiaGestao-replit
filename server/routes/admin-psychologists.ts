import { Router } from "express";
import { db } from "../db";
import {
  users,
  psychologists,
  specializationAreas,
  psychologistSpecializations,
} from "@shared/schema";
import { patients, clinicalSessions } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado." });
  const user = req.user as { role: string };
  if (user.role !== "admin") return res.status(403).json({ error: "Acesso restrito ao administrador." });
  next();
}

router.use(requireAdmin);

function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function monthsAgo(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

async function getSpecializationsForPsych(psychId: number) {
  return db
    .select({ id: specializationAreas.id, name: specializationAreas.name, category: specializationAreas.category })
    .from(psychologistSpecializations)
    .innerJoin(specializationAreas, eq(psychologistSpecializations.specializationAreaId, specializationAreas.id))
    .where(eq(psychologistSpecializations.psychologistId, psychId));
}

// GET /api/admin/psychologists
router.get("/", async (req, res) => {
  try {
    const { search, status, specializationId } = req.query as Record<string, string>;

    let psychList = await db
      .select({ psych: psychologists, user: users })
      .from(psychologists)
      .innerJoin(users, eq(psychologists.userId, users.id))
      .orderBy(users.fullName);

    if (search) {
      const lower = search.toLowerCase();
      psychList = psychList.filter(
        (r) =>
          r.user.fullName.toLowerCase().includes(lower) ||
          r.user.email.toLowerCase().includes(lower)
      );
    }

    if (status === "active") {
      psychList = psychList.filter((r) => r.user.status === "active");
    } else if (status === "inactive") {
      psychList = psychList.filter((r) => r.user.status !== "active");
    }

    const result = await Promise.all(
      psychList.map(async ({ psych, user }) => {
        const specs = await getSpecializationsForPsych(psych.id);

        if (specializationId && !specs.some((s) => s.id === parseInt(specializationId))) {
          return null;
        }

        const activePatientsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(patients)
          .where(and(eq(patients.psychologistId, psych.id), eq(patients.status, "active")));

        const sessionsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(clinicalSessions)
          .where(eq(clinicalSessions.psychologistId, psych.id));

        const { password, ...safeUser } = user;
        return {
          ...psych,
          user: safeUser,
          age: calcAge(user.birthDate),
          specializations: specs,
          activePatientsCount: Number(activePatientsCount[0]?.count ?? 0),
          sessionsCount: Number(sessionsCount[0]?.count ?? 0),
          monthsAtClinic: monthsAgo(psych.startedAtClinic ?? undefined),
        };
      })
    );

    return res.json(result.filter(Boolean));
  } catch (e) {
    console.error("GET /api/admin/psychologists error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// GET /api/admin/psychologists/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [psych] = await db.select().from(psychologists).where(eq(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    const [user] = await db.select().from(users).where(eq(users.id, psych.userId));
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const specs = await getSpecializationsForPsych(psych.id);

    const activePatientsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(and(eq(patients.psychologistId, psych.id), eq(patients.status, "active")));

    const sessionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(clinicalSessions)
      .where(eq(clinicalSessions.psychologistId, psych.id));

    const { password, ...safeUser } = user;
    return res.json({
      ...psych,
      user: safeUser,
      age: calcAge(user.birthDate),
      specializations: specs,
      activePatientsCount: Number(activePatientsCount[0]?.count ?? 0),
      sessionsCount: Number(sessionsCount[0]?.count ?? 0),
      monthsAtClinic: monthsAgo(psych.startedAtClinic ?? undefined),
    });
  } catch (e) {
    console.error("GET /api/admin/psychologists/:id error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// PATCH /api/admin/psychologists/:id — editar dados (incluindo campos exclusivos do admin)
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [psych] = await db.select().from(psychologists).where(eq(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    const { fullName, email, birthDate, status, phone, crpNumber, bio, startedAtClinic } = req.body;

    // Update users table
    const userUpdate: Record<string, any> = {};
    if (fullName !== undefined) userUpdate.fullName = fullName;
    if (email !== undefined) userUpdate.email = email;
    if (birthDate !== undefined) userUpdate.birthDate = birthDate || null;
    if (status !== undefined) userUpdate.status = status;
    if (Object.keys(userUpdate).length > 0) {
      await db.update(users).set(userUpdate).where(eq(users.id, psych.userId));
    }

    // Update psychologists table
    const psychUpdate: Record<string, any> = {};
    if (phone !== undefined) psychUpdate.phone = phone || null;
    if (crpNumber !== undefined) psychUpdate.crpNumber = crpNumber || null;
    if (bio !== undefined) psychUpdate.bio = bio || null;
    if (startedAtClinic !== undefined) psychUpdate.startedAtClinic = startedAtClinic || null;
    if (Object.keys(psychUpdate).length > 0) {
      await db.update(psychologists).set(psychUpdate).where(eq(psychologists.id, id));
    }

    const [updatedUser] = await db.select().from(users).where(eq(users.id, psych.userId));
    const [updatedPsych] = await db.select().from(psychologists).where(eq(psychologists.id, id));
    const specs = await getSpecializationsForPsych(id);

    const { password, ...safeUser } = updatedUser;
    return res.json({
      ...updatedPsych,
      user: safeUser,
      age: calcAge(updatedUser.birthDate),
      specializations: specs,
    });
  } catch (e) {
    console.error("PATCH /api/admin/psychologists/:id error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// PUT /api/admin/psychologists/:id/specializations
router.put("/:id/specializations", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { specializationIds } = req.body as { specializationIds: number[] };

    if (!Array.isArray(specializationIds)) {
      return res.status(400).json({ error: "specializationIds deve ser um array." });
    }

    const [psych] = await db.select().from(psychologists).where(eq(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    await db.delete(psychologistSpecializations).where(eq(psychologistSpecializations.psychologistId, id));

    if (specializationIds.length > 0) {
      await db.insert(psychologistSpecializations).values(
        specializationIds.map((sid) => ({ psychologistId: id, specializationAreaId: sid }))
      );
    }

    const specs = await getSpecializationsForPsych(id);
    return res.json({ specializations: specs });
  } catch (e) {
    console.error("PUT /api/admin/psychologists/:id/specializations error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// POST /api/admin/psychologists/:id/toggle-active
router.post("/:id/toggle-active", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [psych] = await db.select().from(psychologists).where(eq(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    const [user] = await db.select().from(users).where(eq(users.id, psych.userId));
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const newStatus = user.status === "active" ? "inactive" : "active";
    await db.update(users).set({ status: newStatus }).where(eq(users.id, psych.userId));

    return res.json({ status: newStatus, isActive: newStatus === "active" });
  } catch (e) {
    console.error("POST /api/admin/psychologists/:id/toggle-active error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

export default router;
