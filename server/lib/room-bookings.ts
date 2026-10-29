import { storage } from "../storage";
import type { InsertRoomBooking } from "@shared/schema";

/** A booking rule was broken; status is what the HTTP route answers. */
export class BookingError extends Error {
  constructor(message: string, public status: 400 | 409) {
    super(message);
    this.name = "BookingError";
  }
}

/**
 * "9:00" / "09:00" / "09:00:00" -> "09:00:00". The overlap check compares strings with the
 * stored HH:MM:SS, and "14:00" < "14:00:00" would flag back-to-back bookings as a conflict.
 */
export function normalizeTime(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [h, min, s = "00"] = [Number(m[1]), m[2], m[3]];
  if (h > 23 || Number(min) > 59 || Number(s) > 59) return null;
  return `${String(h).padStart(2, "0")}:${min}:${s}`;
}

/**
 * The rules every new room booking follows (the /api/room-bookings route and the assistant):
 * room and psychologist belong to the active company, and the room is free at that time.
 */
export async function checkRoomBooking(companyId: number, data: InsertRoomBooking): Promise<InsertRoomBooking> {
  const startTime = normalizeTime(data.startTime);
  const endTime = normalizeTime(data.endTime);
  if (!startTime || !endTime) throw new BookingError("Horário inválido.", 400);
  if (startTime >= endTime) throw new BookingError("O horário de início precisa ser antes do fim.", 400);
  if (!(await storage.getRoom(companyId, Number(data.roomId)))) throw new BookingError("Sala não encontrada.", 400);
  if (!(await storage.getPsychologist(companyId, Number(data.psychologistId)))) throw new BookingError("Psicóloga não encontrada.", 400);

  const free = await storage.checkRoomAvailability(companyId, data.roomId, new Date(data.date), startTime, endTime);
  if (!free) throw new BookingError("A sala já está reservada nesse horário.", 409);
  return { ...data, startTime, endTime };
}

export async function createRoomBookingChecked(companyId: number, data: InsertRoomBooking) {
  return storage.createRoomBooking(companyId, await checkRoomBooking(companyId, data));
}
