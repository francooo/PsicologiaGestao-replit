import { eq } from "drizzle-orm";
import { db } from "../db";
import { patients } from "@shared/patient-schema";
import { formatPhoneNumber } from "../services/whatsapp";

// Appointments only keep the patient's name: the phone comes from the clinic's patient with that
// name (accents and case ignored). Shared by the wa.me reminders and the automatic ones (Twilio).

export type PhoneIssue = "not_found" | "no_phone" | "invalid" | "ambiguous" | null;
type PatientRow = { id: number; fullName: string; phone: string; psychologistId: number | null };
export type PatientIndex = Map<string, PatientRow[]>;

export const normalizeName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** The clinic's patients grouped by normalized name. */
export async function patientIndex(companyId: number): Promise<PatientIndex> {
  const rows = await db
    .select({ id: patients.id, fullName: patients.fullName, phone: patients.phone, psychologistId: patients.psychologistId })
    .from(patients)
    .where(eq(patients.companyId, companyId));
  const byName: PatientIndex = new Map();
  for (const p of rows) {
    const k = normalizeName(p.fullName);
    byName.set(k, [...(byName.get(k) ?? []), p]);
  }
  return byName;
}

/** Two patients with the same name and different phones → ambiguous (the psychologist's own wins). */
export function findPhone(appt: { patientName: string; psychologistId: number }, byName: PatientIndex) {
  let found = byName.get(normalizeName(appt.patientName)) ?? [];
  if (found.length === 0) return { patientId: null, phone: null, issue: "not_found" as PhoneIssue };
  if (found.length > 1) {
    const own = found.filter((p) => p.psychologistId === appt.psychologistId);
    if (own.length > 0) found = own;
  }
  const phones = Array.from(new Set(found.map((p) => formatPhoneNumber(p.phone ?? "")).filter((p): p is string => !!p)));
  const patientId = found.length === 1 ? found[0].id : null;
  if (phones.length === 1) return { patientId: found[0].id, phone: phones[0], issue: null };
  if (phones.length > 1) return { patientId, phone: null, issue: "ambiguous" as PhoneIssue };
  return { patientId, phone: null, issue: (found.some((p) => p.phone?.trim()) ? "invalid" : "no_phone") as PhoneIssue };
}

export const PHONE_ISSUE_TEXT: Record<Exclude<PhoneIssue, null>, string> = {
  not_found: "Paciente não encontrado no cadastro de pacientes",
  no_phone: "Cadastro do paciente sem telefone",
  invalid: "Telefone do cadastro incompleto",
  ambiguous: "Mais de um paciente com esse nome e telefones diferentes",
};
