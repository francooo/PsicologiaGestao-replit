import { eq } from "drizzle-orm";
import { db } from "../db";
import { calendarEvents, roomBookingEvents, type Appointment, type RoomBooking } from "@shared/schema";
import { storage } from "../storage";
import { addEventToCalendar, deleteCalendarEvent, isUserAuthenticated, updateCalendarEvent } from "../services/google-calendar";

// Consultas e reservas de sala → agenda Google da psicóloga delas (com o token dela), quando ela
// conectou o Google Calendar. Nunca derruba o salvamento: falhas só vão para o log.

type Mapping = { id: number; googleEventId: string; userId: number };
type EventData = { summary: string; description: string; location?: string; startDateTime: string; endDateTime: string };

/** Where each kind keeps its "row ↔ Google event" link. */
const stores = {
  appointment: {
    table: calendarEvents,
    find: async (id: number) => (await db.select().from(calendarEvents).where(eq(calendarEvents.appointmentId, id)))[0] as Mapping | undefined,
    insert: (id: number, googleEventId: string, userId: number) => db.insert(calendarEvents).values({ appointmentId: id, googleEventId, userId }),
  },
  booking: {
    table: roomBookingEvents,
    find: async (id: number) => (await db.select().from(roomBookingEvents).where(eq(roomBookingEvents.bookingId, id)))[0] as Mapping | undefined,
    insert: (id: number, googleEventId: string, userId: number) => db.insert(roomBookingEvents).values({ bookingId: id, googleEventId, userId }),
  },
};
type Kind = keyof typeof stores;

const hhmmss = (t: string) => (t.length === 5 ? `${t}:00` : t.slice(0, 8));
const times = (r: { date: string; startTime: string; endTime: string }) => ({
  startDateTime: `${r.date}T${hhmmss(r.startTime)}`,
  endDateTime: `${r.date}T${hhmmss(r.endTime)}`,
});

async function drop(kind: Kind, id: number) {
  const store = stores[kind];
  const row = await store.find(id);
  if (!row) return;
  await deleteCalendarEvent(row.userId, row.googleEventId);
  await db.delete(store.table).where(eq(store.table.id, row.id));
}

/** What happened to the Google side of a save; the routes return it so the screen can explain it. */
export type CalendarSync = "synced" | "removed" | "not_connected" | "skipped" | "failed";

/** Creates or updates the Google event of a row, in the calendar of its psychologist. */
async function upsert(kind: Kind, id: number, companyId: number, psychologistId: number, event: EventData): Promise<CalendarSync> {
  const store = stores[kind];
  const userId = (await storage.getPsychologist(companyId, psychologistId))?.userId;
  const existing = await store.find(id);

  // Moved to another psychologist: the event leaves the previous one's calendar
  if (existing && existing.userId !== userId) await drop(kind, id);
  if (!userId || !(await isUserAuthenticated(userId))) {
    console.log(`Google Calendar: ${kind} ${id} não enviado — a psicóloga ${psychologistId} (usuário ${userId ?? "nenhum"}) não conectou o Google Calendar`);
    return "not_connected";
  }

  const current = existing && existing.userId === userId ? existing : undefined;
  if (current && (await updateCalendarEvent(userId, current.googleEventId, event))) {
    await db.update(store.table).set({ lastSynced: new Date() }).where(eq(store.table.id, current.id));
    console.log(`Google Calendar: ${kind} ${id} atualizado na agenda do usuário ${userId}`);
    return "synced";
  }

  // New row, or its event was deleted in Google: create it (again)
  const googleEventId = await addEventToCalendar(userId, event);
  if (!googleEventId) {
    console.error(`Google Calendar: não foi possível criar o evento (${kind} ${id}, usuário ${userId})`);
    return "failed";
  }
  if (current) await db.update(store.table).set({ googleEventId, lastSynced: new Date() }).where(eq(store.table.id, current.id));
  else await store.insert(id, googleEventId, userId);
  console.log(`Google Calendar: ${kind} ${id} criado na agenda do usuário ${userId}`);
  return "synced";
}

async function safely(what: string, fn: () => Promise<CalendarSync | void>): Promise<CalendarSync> {
  try {
    return (await fn()) ?? "removed";
  } catch (error) {
    console.error(`Google Calendar: falha ao sincronizar ${what}:`, error);
    return "failed";
  }
}

/** Creates or updates the Google event of an appointment (removes it when the appointment was canceled). */
export function syncAppointmentToCalendar(companyId: number, appointment: Appointment) {
  return safely(`a consulta ${appointment.id}`, async () => {
    if (appointment.status === "canceled" || appointment.status === "cancelled") return drop("appointment", appointment.id);
    const room = await storage.getRoom(companyId, appointment.roomId);
    const type = appointment.sessionType ? ` (${appointment.sessionType})` : "";
    const pending = appointment.status === "pending-confirmation" ? " – a confirmar" : "";
    // No clinical notes in Google: only who, when and where (see the Privacy Policy)
    return upsert("appointment", appointment.id, companyId, appointment.psychologistId, {
      summary: `Consulta: ${appointment.patientName}${type}${pending}`,
      description: "Consulta agendada no ConsultaPsi.",
      location: room?.name,
      ...times(appointment),
    });
  });
}

/** Removes the appointment's Google event and its mapping; call before deleting the appointment. */
export async function removeAppointmentFromCalendar(appointmentId: number) {
  await safely(`a consulta ${appointmentId}`, () => drop("appointment", appointmentId));
  // The mapping references the appointment: it must go even if Google failed
  await db.delete(calendarEvents).where(eq(calendarEvents.appointmentId, appointmentId));
}

// Bookings the appointment routes create next to each appointment: the appointment's own event covers them
const fromAppointment = (b: RoomBooking) => /^(Appointment with|Agendamento online com) /.test(b.purpose ?? "");

/** Creates or updates the Google event of a room booking. */
export function syncRoomBookingToCalendar(companyId: number, booking: RoomBooking) {
  return safely(`a reserva ${booking.id}`, async () => {
    if (fromAppointment(booking)) return "skipped";
    const room = await storage.getRoom(companyId, booking.roomId);
    const roomName = room?.name ?? "Sala";
    return upsert("booking", booking.id, companyId, booking.psychologistId, {
      summary: `Reserva: ${roomName}`,
      description: booking.purpose ? `Reserva de sala no ConsultaPsi.\nFinalidade: ${booking.purpose}` : "Reserva de sala no ConsultaPsi.",
      location: roomName,
      ...times(booking),
    });
  });
}

/** Removes a room booking's Google event; call before deleting the booking. */
export function removeRoomBookingFromCalendar(bookingId: number) {
  return safely(`a reserva ${bookingId}`, () => drop("booking", bookingId));
}
