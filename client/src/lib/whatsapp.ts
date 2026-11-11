import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Reminders opened in WhatsApp with wa.me links (server/routes/whatsapp.ts).

export type PhoneIssue = "not_found" | "no_phone" | "invalid" | "ambiguous" | null;

export type ReminderItem = {
  appointmentId: number;
  patientId: number | null;
  patientName: string;
  psychologistId: number;
  psychologistName: string | null;
  roomName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  phone: string | null;
  phoneDisplay: string | null;
  phoneIssue: PhoneIssue;
  message: string;
  reminderSentAt: string | null;
  reminderSentByName: string | null;
  /** Automatic reminder (Twilio): sending, sent, delivered, read, failed, undelivered, skipped */
  autoStatus: string | null;
  autoError: string | null;
  autoAt: string | null;
};

export type RemindersResponse = { date: string; tomorrow: string; items: ReminderItem[] };

export const REMINDERS_KEY = ["/api/whatsapp/reminders"];
export const reminderKey = (appointmentId: number) => ["/api/whatsapp/appointments", appointmentId, "reminder"];

export const PHONE_ISSUE_TEXT: Record<Exclude<PhoneIssue, null>, string> = {
  not_found: "Não encontramos esse paciente no cadastro de pacientes.",
  no_phone: "O cadastro do paciente está sem telefone.",
  invalid: "O telefone do cadastro do paciente está incompleto.",
  ambiguous: "Há mais de um paciente com esse nome e telefones diferentes.",
};

/** The automatic (Twilio) reminder already reached the patient's WhatsApp, or is on its way. */
export const autoSent = (item: Pick<ReminderItem, "autoStatus">) => ["sending", "sent", "delivered", "read"].includes(item.autoStatus ?? "");

export const AUTO_STATUS_TEXT: Record<string, string> = {
  sending: "Enviando automaticamente",
  sent: "Enviado automaticamente",
  delivered: "Entregue automaticamente",
  read: "Lido pelo paciente",
  failed: "Falha no envio automático",
  undelivered: "Não entregue",
  skipped: "Não enviado automaticamente",
};

/** "2026-11-04" -> "quarta-feira, 04/11" */
export const reminderDay = (date: string) => format(new Date(`${date}T12:00:00`), "EEEE, dd/MM", { locale: ptBR });

export const sentLabel = (item: Pick<ReminderItem, "reminderSentAt" | "reminderSentByName">) =>
  item.reminderSentAt
    ? `Lembrete enviado em ${format(new Date(item.reminderSentAt), "dd/MM 'às' HH:mm")}${item.reminderSentByName ? ` por ${item.reminderSentByName}` : ""}`
    : null;

/** Wraps the selected text with a WhatsApp marker (*, _, ~); with nothing selected, inserts the pair. */
export function wrapSelection(text: string, start: number, end: number, mark: string) {
  const selected = text.slice(start, end);
  const next = text.slice(0, start) + mark + selected + mark + text.slice(end);
  return { text: next, start: start + mark.length, end: end + mark.length };
}
