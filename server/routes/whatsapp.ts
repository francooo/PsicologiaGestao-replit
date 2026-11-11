import { Router, type Request } from "express";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { appointmentReminders, appointments, companies, messageTemplates, psychologists, rooms, users, whatsappMessages } from "@shared/schema";
import { DEFAULT_MESSAGES, MESSAGE_KEYS, MESSAGE_MAX_LENGTH, fillMessage, type MessageKey } from "@shared/whatsapp-message";
import { requireAdmin, requireAuth, requireCompany } from "../middleware/auth-guards";
import { storage } from "../storage";
import { findPhone, patientIndex } from "../lib/patient-phone";
import { LEAD_HOURS, REMINDER_KIND } from "../lib/auto-reminders";
import { isTwilioConfigured } from "../services/twilio";

// Mounted at /api/whatsapp — reminders sent through wa.me links: the client opens the WhatsApp of
// whoever is using the system, with the patient's number and the clinic's text already filled.
const router = Router();
router.use(requireAuth, requireCompany);

const STAFF = ["admin", "receptionist"];
const TZ = "America/Sao_Paulo";

type User = { id: number; role: string; fullName: string };

const dateKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
function tomorrowKey() {
  const d = new Date(`${dateKey(new Date())}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const displayPhone = (digits: string) => {
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  const m = local.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${digits}`;
};

/** Psychologists only reach their own appointments; admin and reception reach the whole clinic. */
async function ownPsychologistId(req: Request) {
  const user = req.user as User;
  if (STAFF.includes(user.role)) return null;
  const profile = await storage.getPsychologistByUserId(req.companyId!, user.id);
  return profile?.id ?? -1;
}

async function templateBody(companyId: number, key: MessageKey) {
  const [row] = await db
    .select({ body: messageTemplates.body })
    .from(messageTemplates)
    .where(and(eq(messageTemplates.companyId, companyId), eq(messageTemplates.key, key)));
  return row?.body ?? null;
}

const appointmentColumns = {
  id: appointments.id,
  patientName: appointments.patientName,
  psychologistId: appointments.psychologistId,
  roomId: appointments.roomId,
  date: appointments.date,
  startTime: appointments.startTime,
  endTime: appointments.endTime,
  status: appointments.status,
  psychologistName: users.fullName,
  roomName: rooms.name,
  reminderSentAt: appointmentReminders.sentAt,
  reminderSentBy: appointmentReminders.sentBy,
  autoStatus: whatsappMessages.status,
  autoError: whatsappMessages.error,
  autoAt: whatsappMessages.updatedAt,
};

function appointmentQuery(companyId: number) {
  return db
    .select(appointmentColumns)
    .from(appointments)
    .leftJoin(psychologists, eq(psychologists.id, appointments.psychologistId))
    .leftJoin(users, eq(users.id, psychologists.userId))
    .leftJoin(rooms, and(eq(rooms.id, appointments.roomId), eq(rooms.companyId, companyId)))
    .leftJoin(appointmentReminders, eq(appointmentReminders.appointmentId, appointments.id))
    .leftJoin(whatsappMessages, and(eq(whatsappMessages.appointmentId, appointments.id), eq(whatsappMessages.kind, REMINDER_KIND)))
    .$dynamic();
}

type Row = Awaited<ReturnType<ReturnType<typeof appointmentQuery>["execute"]>>[number];

async function buildItems(req: Request, rows: Row[]) {
  const companyId = req.companyId!;
  const user = req.user as User;
  if (rows.length === 0) return [];

  const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId));
  const body = (await templateBody(companyId, "appointment_reminder")) ?? DEFAULT_MESSAGES.appointment_reminder;
  const byName = await patientIndex(companyId);
  const senderIds = Array.from(new Set(rows.map((r) => r.reminderSentBy).filter((id): id is number => !!id)));
  const senders = new Map<number, string>();
  for (const id of senderIds) {
    const u = await storage.getUser(id);
    if (u) senders.set(id, u.fullName);
  }

  return rows.map((a) => {
    const date = String(a.date).slice(0, 10);
    const noon = new Date(`${date}T12:00:00Z`);
    const room = a.roomId === 0 ? "Online" : a.roomName ?? "";
    const vars = {
      paciente: a.patientName.trim().split(/\s+/)[0] ?? "",
      paciente_nome_completo: a.patientName.trim(),
      psicologa: a.psychologistName ?? "",
      data: noon.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
      dia_semana: noon.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" }),
      horario: String(a.startTime).slice(0, 5),
      horario_fim: String(a.endTime).slice(0, 5),
      sala: room,
      clinica: company?.name ?? "",
      quem_envia: user.fullName,
    };
    const { patientId, phone, issue } = findPhone(a, byName);
    return {
      appointmentId: a.id,
      patientId,
      patientName: a.patientName,
      psychologistId: a.psychologistId,
      psychologistName: a.psychologistName,
      roomName: room || null,
      date,
      startTime: vars.horario,
      endTime: vars.horario_fim,
      status: a.status,
      phone,
      phoneDisplay: phone ? displayPhone(phone) : null,
      phoneIssue: issue,
      message: fillMessage(body, vars),
      reminderSentAt: a.reminderSentAt,
      reminderSentByName: a.reminderSentBy ? senders.get(a.reminderSentBy) ?? null : null,
      // Automatic reminder (Twilio): sending, sent, delivered, read, failed, undelivered, skipped
      autoStatus: a.autoStatus ?? null,
      autoError: a.autoError ?? null,
      autoAt: a.autoAt ?? null,
    };
  });
}

// GET /api/whatsapp/reminders?date=YYYY-MM-DD — appointments of the day (default: tomorrow) with the
// reminder ready to open in WhatsApp
router.get("/reminders", async (req, res) => {
  try {
    const date = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : tomorrowKey();
    const own = await ownPsychologistId(req);
    const rows = await appointmentQuery(req.companyId!)
      .where(
        and(
          eq(appointments.companyId, req.companyId!),
          eq(appointments.date, date),
          ne(appointments.status, "canceled"),
          own === null ? undefined : eq(appointments.psychologistId, own),
        ),
      )
      .orderBy(appointments.startTime, appointments.patientName);
    res.json({ date, tomorrow: tomorrowKey(), items: await buildItems(req, rows) });
  } catch (error) {
    console.error("whatsapp reminders error:", error);
    res.status(500).json({ message: "Não foi possível carregar os lembretes." });
  }
});

async function findAppointment(req: Request) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return null;
  const own = await ownPsychologistId(req);
  const [row] = await appointmentQuery(req.companyId!).where(
    and(
      eq(appointments.id, id),
      eq(appointments.companyId, req.companyId!),
      own === null ? undefined : eq(appointments.psychologistId, own),
    ),
  );
  return row ?? null;
}

// GET /api/whatsapp/appointments/:id/reminder — the reminder of one appointment
router.get("/appointments/:id/reminder", async (req, res) => {
  try {
    const row = await findAppointment(req);
    if (!row) return res.status(404).json({ message: "Consulta não encontrada." });
    const [item] = await buildItems(req, [row]);
    res.json(item);
  } catch (error) {
    console.error("whatsapp reminder error:", error);
    res.status(500).json({ message: "Não foi possível montar o lembrete." });
  }
});

// POST /api/whatsapp/appointments/:id/reminder-sent — WhatsApp was opened with the reminder
router.post("/appointments/:id/reminder-sent", async (req, res) => {
  try {
    const row = await findAppointment(req);
    if (!row) return res.status(404).json({ message: "Consulta não encontrada." });
    const user = req.user as User;
    const sentAt = new Date();
    await db
      .insert(appointmentReminders)
      .values({ appointmentId: row.id, companyId: req.companyId!, sentBy: user.id, sentAt })
      .onConflictDoUpdate({ target: appointmentReminders.appointmentId, set: { sentBy: user.id, sentAt } });
    res.json({ reminderSentAt: sentAt, reminderSentByName: user.fullName });
  } catch (error) {
    console.error("whatsapp reminder-sent error:", error);
    res.status(500).json({ message: "Não foi possível registrar o lembrete." });
  }
});

// GET /api/whatsapp/auto-settings — the clinic's automatic reminder (Twilio) switch and lead time
router.get("/auto-settings", async (req, res) => {
  const [row] = await db
    .select({ enabled: companies.whatsappAutoReminders, leadHours: companies.reminderLeadHours })
    .from(companies)
    .where(eq(companies.id, req.companyId!));
  res.json({
    enabled: !!row?.enabled,
    leadHours: row?.leadHours ?? 24,
    leadOptions: LEAD_HOURS,
    twilioConfigured: isTwilioConfigured(),
    approvedTemplate: !!process.env.TWILIO_REMINDER_CONTENT_SID,
  });
});

const autoSettingsSchema = z.object({
  enabled: z.boolean(),
  leadHours: z.number().refine((h) => (LEAD_HOURS as readonly number[]).includes(h), "Antecedência inválida."),
});

// PUT /api/whatsapp/auto-settings — admin turns the automatic reminder on/off and picks the lead time
router.put("/auto-settings", requireAdmin, async (req, res) => {
  const parsed = autoSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  try {
    await db
      .update(companies)
      .set({ whatsappAutoReminders: parsed.data.enabled, reminderLeadHours: parsed.data.leadHours })
      .where(eq(companies.id, req.companyId!));
    res.json({ ...parsed.data, leadOptions: LEAD_HOURS, twilioConfigured: isTwilioConfigured(), approvedTemplate: !!process.env.TWILIO_REMINDER_CONTENT_SID });
  } catch (error) {
    console.error("whatsapp auto-settings error:", error);
    res.status(500).json({ message: "Não foi possível salvar a configuração." });
  }
});

const isKey = (k: string): k is MessageKey => (MESSAGE_KEYS as readonly string[]).includes(k);

// GET /api/whatsapp/templates/:key — the clinic's text (or the default one)
router.get("/templates/:key", async (req, res) => {
  const key = req.params.key;
  if (!isKey(key)) return res.status(404).json({ message: "Modelo não encontrado." });
  const body = await templateBody(req.companyId!, key);
  res.json({ key, body: body ?? DEFAULT_MESSAGES[key], isDefault: body === null, defaultBody: DEFAULT_MESSAGES[key] });
});

const templateSchema = z.object({ body: z.string().max(MESSAGE_MAX_LENGTH, `Use no máximo ${MESSAGE_MAX_LENGTH} caracteres.`) });

// PUT /api/whatsapp/templates/:key — admin edits the clinic's text; an empty text goes back to the default
router.put("/templates/:key", requireAdmin, async (req, res) => {
  const key = req.params.key;
  if (!isKey(key)) return res.status(404).json({ message: "Modelo não encontrado." });
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const companyId = req.companyId!;
  const body = parsed.data.body.replace(/\r\n/g, "\n").trim();
  try {
    if (!body || body === DEFAULT_MESSAGES[key]) {
      await db.delete(messageTemplates).where(and(eq(messageTemplates.companyId, companyId), eq(messageTemplates.key, key)));
      return res.json({ key, body: DEFAULT_MESSAGES[key], isDefault: true, defaultBody: DEFAULT_MESSAGES[key] });
    }
    const updatedBy = (req.user as User).id;
    await db
      .insert(messageTemplates)
      .values({ companyId, key, body, updatedBy })
      .onConflictDoUpdate({ target: [messageTemplates.companyId, messageTemplates.key], set: { body, updatedBy, updatedAt: new Date() } });
    res.json({ key, body, isDefault: false, defaultBody: DEFAULT_MESSAGES[key] });
  } catch (error) {
    console.error("whatsapp template error:", error);
    res.status(500).json({ message: "Não foi possível salvar o modelo." });
  }
});

export default router;
