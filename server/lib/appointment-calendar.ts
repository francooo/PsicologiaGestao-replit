import { eq } from "drizzle-orm";
import { db } from "../db";
import { calendarEvents, type Appointment } from "@shared/schema";
import { storage } from "../storage";
import { addEventToCalendar, deleteCalendarEvent, isUserAuthenticated, updateCalendarEvent } from "../services/google-calendar";

// Consultas → agenda Google da psicóloga da consulta (com o token dela), quando ela conectou o
// Google Calendar. Nunca derruba o salvamento: falhas só vão para o log.

const SESSION_TYPE = (a: Appointment) => (a.sessionType ? ` (${a.sessionType})` : "");
const hhmmss = (t: string) => (t.length === 5 ? `${t}:00` : t.slice(0, 8));

async function mappingFor(appointmentId: number) {
  const [row] = await db.select().from(calendarEvents).where(eq(calendarEvents.appointmentId, appointmentId));
  return row;
}

async function dropMapping(appointmentId: number) {
  const row = await mappingFor(appointmentId);
  if (!row) return;
  await deleteCalendarEvent(row.userId, row.googleEventId);
  await db.delete(calendarEvents).where(eq(calendarEvents.id, row.id));
}

/** Creates or updates the Google event of an appointment (removes it when the appointment was canceled). */
export async function syncAppointmentToCalendar(companyId: number, appointment: Appointment) {
  try {
    if (appointment.status === "canceled" || appointment.status === "cancelled") return await dropMapping(appointment.id);

    const psychologist = await storage.getPsychologist(companyId, appointment.psychologistId);
    const userId = psychologist?.userId;
    const existing = await mappingFor(appointment.id);

    // Moved to another psychologist: the event leaves the previous one's calendar
    if (existing && existing.userId !== userId) await dropMapping(appointment.id);
    if (!userId || !(await isUserAuthenticated(userId))) return;

    const room = await storage.getRoom(companyId, appointment.roomId);
    const pending = appointment.status === "pending-confirmation" ? " – a confirmar" : "";
    // No clinical notes in Google: only who, when and where (see the Privacy Policy)
    const event = {
      summary: `Consulta: ${appointment.patientName}${SESSION_TYPE(appointment)}${pending}`,
      description: "Consulta agendada no ConsultaPsi.",
      location: room?.name,
      startDateTime: `${appointment.date}T${hhmmss(appointment.startTime)}`,
      endDateTime: `${appointment.date}T${hhmmss(appointment.endTime)}`,
    };

    const current = existing && existing.userId === userId ? existing : undefined;
    if (current && (await updateCalendarEvent(userId, current.googleEventId, event))) {
      await db.update(calendarEvents).set({ lastSynced: new Date() }).where(eq(calendarEvents.id, current.id));
      return;
    }

    // New appointment, or its event was deleted in Google: create it (again)
    const googleEventId = await addEventToCalendar(userId, event);
    if (!googleEventId) {
      console.error(`Google Calendar: não foi possível criar o evento da consulta ${appointment.id} (usuário ${userId})`);
      return;
    }
    if (current) await db.update(calendarEvents).set({ googleEventId, lastSynced: new Date() }).where(eq(calendarEvents.id, current.id));
    else await db.insert(calendarEvents).values({ appointmentId: appointment.id, googleEventId, userId });
  } catch (error) {
    console.error(`Google Calendar: falha ao sincronizar a consulta ${appointment.id}:`, error);
  }
}

/** Removes the appointment's Google event and its mapping; call before deleting the appointment. */
export async function removeAppointmentFromCalendar(appointmentId: number) {
  try {
    await dropMapping(appointmentId);
  } catch (error) {
    console.error(`Google Calendar: falha ao remover o evento da consulta ${appointmentId}:`, error);
    // The mapping references the appointment: it must go even if Google failed
    await db.delete(calendarEvents).where(eq(calendarEvents.appointmentId, appointmentId));
  }
}
