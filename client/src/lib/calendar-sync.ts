/** Server's `googleCalendar` field on a saved appointment / room booking (see server/lib/calendar-sync.ts). */
export type CalendarSync = "synced" | "removed" | "not_connected" | "skipped" | "failed";

/** Extra line for the success toast when the save did not reach the psychologist's Google Calendar. */
export function calendarSyncNote(status?: CalendarSync): string | null {
  if (status === "not_connected") return "Não foi para o Google Calendar: a psicóloga selecionada não conectou a agenda em Configurações.";
  if (status === "failed") return "Não foi possível enviar para o Google Calendar agora.";
  return null;
}
