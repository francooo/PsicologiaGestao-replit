import { and, eq, gte, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { db } from "../db";
import { appointments, companies, messageTemplates, psychologists, rooms, users, whatsappMessages } from "@shared/schema";
import { DEFAULT_MESSAGES, fillMessage } from "@shared/whatsapp-message";
import { PHONE_ISSUE_TEXT, findPhone, patientIndex, toWhatsAppNumber } from "./patient-phone";
import { isTwilioConfigured, sendWhatsApp } from "../services/twilio";
import { getAppUrl } from "../services/email";

// Automatic appointment reminders (WhatsApp via Twilio). Called every ~15 min by an external
// scheduler (cron-job.org) and once a day by Vercel Cron: each clinic that turned it on gets a
// reminder for every appointment starting within its lead time (24h, 12h or 2h).

export const REMINDER_KIND = "appointment_reminder";
export const LEAD_HOURS = [24, 12, 2] as const;
const MAX_PER_RUN = 40; // keeps a run well inside the 60s serverless limit
const SKIP_STATUSES = ["canceled", "completed"];

// Brazil has had no daylight saving time since 2019: São Paulo is always UTC-3
const startsAt = (date: string, time: string) => new Date(`${date}T${time.slice(0, 5)}:00-03:00`);
const spDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

export type ReminderRunSummary = { configured: boolean; clinics: number; sent: number; skipped: number; failed: number };

export async function runAutoReminders(now = new Date()): Promise<ReminderRunSummary> {
  const summary: ReminderRunSummary = { configured: isTwilioConfigured(), clinics: 0, sent: 0, skipped: 0, failed: 0 };
  if (!summary.configured) return summary;

  const today = spDate(now);
  const clinics = await db
    .select({ id: companies.id, name: companies.name, leadHours: companies.reminderLeadHours })
    .from(companies)
    .where(
      and(
        eq(companies.whatsappAutoReminders, true),
        eq(companies.status, "active"),
        or(isNull(companies.accessValidUntil), gte(companies.accessValidUntil, today)),
      ),
    );
  summary.clinics = clinics.length;

  let budget = MAX_PER_RUN;
  for (const clinic of clinics) {
    if (budget <= 0) break;
    const lead = clinic.leadHours * 3600_000;
    const until = spDate(new Date(now.getTime() + lead));

    // Candidates: not canceled/completed, from today up to the end of the lead window, and no
    // reminder row yet (or only a "skipped" one — the phone may have been fixed since).
    const rows = await db
      .select({
        id: appointments.id,
        patientName: appointments.patientName,
        psychologistId: appointments.psychologistId,
        date: appointments.date,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        roomId: appointments.roomId,
        psychologistName: users.fullName,
        roomName: rooms.name,
      })
      .from(appointments)
      .leftJoin(psychologists, eq(psychologists.id, appointments.psychologistId))
      .leftJoin(users, eq(users.id, psychologists.userId))
      .leftJoin(rooms, and(eq(rooms.id, appointments.roomId), eq(rooms.companyId, clinic.id)))
      .leftJoin(
        whatsappMessages,
        and(eq(whatsappMessages.appointmentId, appointments.id), eq(whatsappMessages.kind, REMINDER_KIND)),
      )
      .where(
        and(
          eq(appointments.companyId, clinic.id),
          gte(appointments.date, today),
          lte(appointments.date, until),
          notInArray(appointments.status, SKIP_STATUSES),
          or(isNull(whatsappMessages.id), eq(whatsappMessages.status, "skipped")),
        ),
      )
      .orderBy(appointments.date, appointments.startTime);

    const due = rows.filter((a) => {
      const ms = startsAt(String(a.date).slice(0, 10), String(a.startTime)).getTime() - now.getTime();
      return ms > 0 && ms <= lead;
    });
    if (due.length === 0) continue;

    const byName = await patientIndex(clinic.id);
    const [custom] = await db
      .select({ body: messageTemplates.body })
      .from(messageTemplates)
      .where(and(eq(messageTemplates.companyId, clinic.id), eq(messageTemplates.key, REMINDER_KIND)));
    const freeText = custom?.body ?? DEFAULT_MESSAGES.appointment_reminder;

    for (const a of due) {
      if (budget <= 0) break;
      const found = findPhone(a, byName);
      const issue = found.issue;
      // Sent to the number WhatsApp knows (Brazil's 9th digit depends on the DDD)
      const phone = found.phone ? toWhatsAppNumber(found.phone) : null;

      // Claim the appointment first: a parallel run (or a retry) can't send it twice
      const [claimed] = await db
        .insert(whatsappMessages)
        .values({ companyId: clinic.id, appointmentId: a.id, kind: REMINDER_KIND, toPhone: phone, status: "sending" })
        .onConflictDoUpdate({
          target: [whatsappMessages.appointmentId, whatsappMessages.kind],
          set: { status: "sending", toPhone: phone, error: null, updatedAt: new Date() },
          where: eq(whatsappMessages.status, "skipped"),
        })
        .returning({ id: whatsappMessages.id });
      if (!claimed) continue;

      if (!phone) {
        await db
          .update(whatsappMessages)
          .set({ status: "skipped", error: PHONE_ISSUE_TEXT[issue ?? "no_phone"], updatedAt: new Date() })
          .where(eq(whatsappMessages.id, claimed.id));
        summary.skipped++;
        continue;
      }

      budget--;
      const date = String(a.date).slice(0, 10);
      const noon = new Date(`${date}T12:00:00Z`);
      const firstName = a.patientName.trim().split(/\s+/)[0] ?? "";
      const day = `${noon.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" })}, ${noon.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}`;
      const time = String(a.startTime).slice(0, 5);
      const contentSid = process.env.TWILIO_REMINDER_CONTENT_SID || undefined;

      const result = await sendWhatsApp({
        to: phone,
        // Approved template (production): {{1}} first name, {{2}} clinic, {{3}} day, {{4}} time
        contentSid,
        contentVariables: { "1": firstName, "2": clinic.name, "3": day, "4": time },
        // Without a template (Sandbox): the clinic's own reminder text
        body: contentSid
          ? undefined
          : fillMessage(freeText, {
              paciente: firstName,
              paciente_nome_completo: a.patientName.trim(),
              psicologa: a.psychologistName ?? "",
              data: noon.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }),
              dia_semana: noon.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" }),
              horario: time,
              horario_fim: String(a.endTime).slice(0, 5),
              sala: a.roomId === 0 ? "Online" : a.roomName ?? "",
              clinica: clinic.name,
              quem_envia: clinic.name,
            }),
        statusCallback: `${getAppUrl()}/api/twilio/status`,
      });

      await db
        .update(whatsappMessages)
        .set(
          result.ok
            ? { status: "sent", twilioSid: result.sid, error: null, updatedAt: new Date() }
            : { status: "failed", error: result.error.slice(0, 500), updatedAt: new Date() },
        )
        .where(eq(whatsappMessages.id, claimed.id));
      if (result.ok) summary.sent++;
      else summary.failed++;
    }
  }
  return summary;
}

/** Twilio status callback: queued/sent/delivered/read/failed/undelivered for one message. */
export async function updateMessageStatus(sid: string, status: string, errorCode?: string) {
  const known = ["sent", "delivered", "read", "failed", "undelivered"];
  if (!known.includes(status)) return;
  // Never move back (a late "sent" must not overwrite "read")
  const order = sql`array_position(ARRAY['sending','sent','delivered','read']::text[], ${whatsappMessages.status})`;
  await db
    .update(whatsappMessages)
    .set({ status, error: errorCode ? `Twilio ${errorCode}` : null, updatedAt: new Date() })
    .where(
      and(
        eq(whatsappMessages.twilioSid, sid),
        ["failed", "undelivered"].includes(status)
          ? undefined
          : or(
              sql`${order} IS NULL`,
              sql`${order} < array_position(ARRAY['sending','sent','delivered','read']::text[], ${status})`,
            ),
      ),
    );
}

