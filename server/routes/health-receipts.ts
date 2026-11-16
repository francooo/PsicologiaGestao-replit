import { Router, type Request } from "express";
import { z } from "zod";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { appointments, healthReceipts, psychologists, users } from "@shared/schema";
import { requireAuth, requireCompany } from "../middleware/auth-guards";
import { storage } from "../storage";
import { findPatient, patientIndex, type PatientRow } from "../lib/patient-phone";

// Mounted at /api/health-receipts — Receita Saúde assistant. The receipt is issued in the Receita's
// app (there's no public API); here the psychologist sees the month's completed sessions with the
// receipt data ready to copy and marks each one as issued.
const router = Router();
router.use(requireAuth, requireCompany);

const STAFF = ["admin", "receptionist"];
type User = { id: number; role: string };

export type ReceiptIssue =
  | "patient_not_found"
  | "ambiguous"
  | "no_patient_cpf"
  | "no_payer_cpf"
  | "no_psychologist_cpf"
  | "no_crp";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
const validCpf = (s: string | null | undefined) => digits(s).length === 11;

/** Psychologists only reach their own sessions; admin and reception reach the whole clinic. */
async function ownPsychologistId(req: Request) {
  const user = req.user as User;
  if (STAFF.includes(user.role)) return null;
  const profile = await storage.getPsychologistByUserId(req.companyId!, user.id);
  return profile?.id ?? -1;
}

function ageOn(birthDate: string | null, on: string) {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/**
 * Who pays (the receipt's "pagador") and who was treated ("beneficiário"). A minor, or a patient
 * with a legal guardian on file, is paid for by the guardian; otherwise the patient pays.
 */
function parties(p: PatientRow, sessionDate: string) {
  const age = ageOn(p.birthDate, sessionDate);
  const guardianPays = !!p.legalGuardianName?.trim() && (age === null || age < 18);
  const beneficiary = { name: p.fullName, cpf: digits(p.cpf) || null };
  const payer = guardianPays
    ? { name: p.legalGuardianName!.trim(), cpf: digits(p.legalGuardianCpf) || null, isGuardian: true }
    : { ...beneficiary, isGuardian: false };
  return { payer, beneficiary, minor: age !== null && age < 18 };
}

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

async function loadSessions(companyId: number, from: string, to: string, psychologistId: number | null, appointmentId?: number) {
  const conds = [
    eq(appointments.companyId, companyId),
    eq(appointments.status, "completed"),
    gte(appointments.date, from),
    lte(appointments.date, to),
  ];
  if (psychologistId !== null) conds.push(eq(appointments.psychologistId, psychologistId));
  if (appointmentId !== undefined) conds.push(eq(appointments.id, appointmentId));
  return db
    .select({
      id: appointments.id,
      date: appointments.date,
      startTime: appointments.startTime,
      patientName: appointments.patientName,
      psychologistId: appointments.psychologistId,
      psychologistName: users.fullName,
      crp: psychologists.crpNumber,
      psychologistCpf: psychologists.cpf,
      sessionRate: psychologists.hourlyRate,
      receiptId: healthReceipts.id,
      receiptAmount: healthReceipts.amount,
      receiptPayerCpf: healthReceipts.payerCpf,
      issuedAt: healthReceipts.issuedAt,
    })
    .from(appointments)
    .leftJoin(psychologists, eq(psychologists.id, appointments.psychologistId))
    .leftJoin(users, eq(users.id, psychologists.userId))
    .leftJoin(healthReceipts, eq(healthReceipts.appointmentId, appointments.id))
    .where(and(...conds))
    .orderBy(asc(appointments.date), asc(appointments.startTime));
}

type SessionRow = Awaited<ReturnType<typeof loadSessions>>[number];

function buildItem(s: SessionRow, byName: Awaited<ReturnType<typeof patientIndex>>) {
  const { patient, issue } = findPatient(s, byName);
  const issues: ReceiptIssue[] = [];
  if (issue === "not_found") issues.push("patient_not_found");
  if (issue === "ambiguous") issues.push("ambiguous");
  const p = patient ? parties(patient, s.date) : null;
  if (p) {
    if (!validCpf(p.beneficiary.cpf)) issues.push("no_patient_cpf");
    if (p.payer.isGuardian && !validCpf(p.payer.cpf)) issues.push("no_payer_cpf");
  }
  if (!validCpf(s.psychologistCpf)) issues.push("no_psychologist_cpf");
  if (!s.crp?.trim()) issues.push("no_crp");
  return {
    appointmentId: s.id,
    date: s.date,
    startTime: s.startTime.slice(0, 5),
    patientName: s.patientName,
    patientId: patient?.id ?? null,
    beneficiary: p?.beneficiary ?? null,
    payer: p ? { name: p.payer.name, cpf: p.payer.cpf, isGuardian: p.payer.isGuardian } : null,
    psychologist: {
      id: s.psychologistId,
      name: s.psychologistName ?? "",
      crp: s.crp ?? null,
      cpf: digits(s.psychologistCpf) || null,
    },
    suggestedAmount: s.sessionRate ? Number(s.sessionRate) : null,
    receipt: s.receiptId
      ? { amount: Number(s.receiptAmount), payerCpf: s.receiptPayerCpf, issuedAt: s.issuedAt }
      : null,
    issues,
  };
}

export type ReceiptItem = ReturnType<typeof buildItem>;

router.get("/", async (req, res) => {
  const month = monthSchema.safeParse(req.query.month);
  if (!month.success) return res.status(400).json({ message: "Mês inválido (use AAAA-MM)" });
  try {
    const companyId = req.companyId!;
    const own = await ownPsychologistId(req);
    const filter = own ?? (req.query.psychologistId ? Number(req.query.psychologistId) || null : null);
    const { from, to } = monthRange(month.data);
    const [sessions, byName] = await Promise.all([loadSessions(companyId, from, to, filter), patientIndex(companyId)]);
    const items = sessions.map((s) => buildItem(s, byName));
    // Only what blocks issuing counts as a problem for the summary: an issued receipt is done
    const blocked = (i: ReceiptItem) => !i.receipt && i.issues.length > 0;
    res.json({
      month: month.data,
      items,
      summary: {
        total: items.length,
        issued: items.filter((i) => i.receipt).length,
        pending: items.filter((i) => !i.receipt).length,
        withIssues: items.filter(blocked).length,
        issuedAmount: items.reduce((sum, i) => sum + (i.receipt?.amount ?? 0), 0),
      },
    });
  } catch (error) {
    console.error("health-receipts list error:", error);
    res.status(500).json({ message: "Erro ao carregar os recibos" });
  }
});

const markSchema = z.object({
  appointmentId: z.number().int().positive(),
  amount: z.number().positive().max(100000),
});

/** The session, if the user may handle its receipt (same company, completed, own for a psychologist). */
async function reachableSession(req: Request, appointmentId: number) {
  const own = await ownPsychologistId(req);
  const [appt] = await db
    .select({ date: appointments.date })
    .from(appointments)
    .where(and(eq(appointments.companyId, req.companyId!), eq(appointments.id, appointmentId)));
  if (!appt) return null;
  const [s] = await loadSessions(req.companyId!, appt.date, appt.date, own, appointmentId);
  return s ?? null;
}

router.post("/", async (req, res) => {
  const body = markSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: "Dados inválidos" });
  try {
    const s = await reachableSession(req, body.data.appointmentId);
    if (!s) return res.status(404).json({ message: "Sessão não encontrada ou não concluída" });
    const item = buildItem(s, await patientIndex(req.companyId!));
    if (!item.payer || !validCpf(item.payer.cpf)) {
      return res.status(400).json({ message: "Cadastre o CPF de quem pagou a sessão antes de marcar o recibo" });
    }
    const [saved] = await db
      .insert(healthReceipts)
      .values({
        companyId: req.companyId!,
        appointmentId: s.id,
        psychologistId: s.psychologistId,
        patientId: item.patientId,
        amount: body.data.amount.toFixed(2),
        payerCpf: item.payer.cpf!,
        beneficiaryCpf: item.beneficiary?.cpf ?? null,
        issuedBy: (req.user as User).id,
      })
      .onConflictDoNothing({ target: healthReceipts.appointmentId })
      .returning();
    if (!saved) return res.status(409).json({ message: "Esse recibo já está marcado como emitido" });
    res.status(201).json(saved);
  } catch (error) {
    console.error("health-receipts mark error:", error);
    res.status(500).json({ message: "Erro ao marcar o recibo" });
  }
});

router.delete("/:appointmentId", async (req, res) => {
  const appointmentId = Number(req.params.appointmentId);
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) return res.status(400).json({ message: "Sessão inválida" });
  try {
    const own = await ownPsychologistId(req);
    const conds = [eq(healthReceipts.companyId, req.companyId!), eq(healthReceipts.appointmentId, appointmentId)];
    if (own !== null) conds.push(eq(healthReceipts.psychologistId, own));
    const deleted = await db.delete(healthReceipts).where(and(...conds)).returning({ id: healthReceipts.id });
    if (deleted.length === 0) return res.status(404).json({ message: "Recibo não encontrado" });
    res.status(204).end();
  } catch (error) {
    console.error("health-receipts unmark error:", error);
    res.status(500).json({ message: "Erro ao desfazer o recibo" });
  }
});

export default router;
