import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { agentActions, agentMessages, agentConversations, commissionItems, type AgentAction } from "@shared/schema";
import { storage } from "../storage";
import { BookingError, checkRoomBooking, normalizeTime } from "../lib/room-bookings";
import type { AgentContext } from "./context";

/** A proposed action waits this long for the user's click. */
export const ACTION_TTL_MS = 15 * 60 * 1000;

/** Booking hours the assistant accepts (the clinic's working day). */
const OPENS = "06:00:00";
const CLOSES = "22:00:00";

export type BookingPayload = {
  roomId: number;
  psychologistId: number;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  roomName: string;
  psychologistName: string;
};
export type CancelPayload = Omit<BookingPayload, "purpose"> & { bookingId: number };

export class ActionError extends Error {
  constructor(message: string, public status: number, public action?: ReturnType<typeof presentAction>) {
    super(message);
  }
}

const isStaff = (ctx: AgentContext) => ctx.role === "admin" || ctx.role === "receptionist";

export async function psychologistName(companyId: number, psychologistId: number) {
  const psych = await storage.getPsychologist(companyId, psychologistId);
  const user = psych ? await storage.getUser(psych.userId) : undefined;
  return user?.fullName ?? `Psicóloga #${psychologistId}`;
}

/** Same checks on proposal and on confirmation: the room may have been taken in between. */
async function checkBooking(ctx: AgentContext, p: { roomId: number; psychologistId: number; date: string; startTime: string; endTime: string; purpose: string | null }) {
  if (!isStaff(ctx) && p.psychologistId !== ctx.ownPsychologistId) {
    throw new BookingError("Você só pode reservar salas para você mesma.", 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || Number.isNaN(Date.parse(p.date))) throw new BookingError("Data inválida.", 400);
  if (p.date < ctx.today) throw new BookingError("Não dá para reservar em uma data que já passou.", 400);
  const start = normalizeTime(p.startTime);
  const end = normalizeTime(p.endTime);
  if (start && end && (start < OPENS || end > CLOSES)) throw new BookingError("Reservas vão das 06:00 às 22:00.", 400);
  return checkRoomBooking(ctx.companyId, p);
}

export async function proposeRoomBooking(
  ctx: AgentContext,
  conversationId: number,
  args: { roomId: number; psychologistId: number; date: string; startTime: string; endTime: string; purpose?: string | null }
) {
  const checked = await checkBooking(ctx, { ...args, purpose: args.purpose?.trim() || null });
  const room = await storage.getRoom(ctx.companyId, checked.roomId);
  const payload: BookingPayload = {
    roomId: checked.roomId,
    psychologistId: checked.psychologistId,
    date: checked.date,
    startTime: checked.startTime,
    endTime: checked.endTime,
    purpose: checked.purpose ?? null,
    roomName: room!.name,
    psychologistName: await psychologistName(ctx.companyId, checked.psychologistId),
  };
  return insertAction(ctx, conversationId, "room_booking.create", payload);
}

export async function proposeBookingCancel(ctx: AgentContext, conversationId: number, bookingId: number) {
  const booking = await storage.getRoomBooking(ctx.companyId, bookingId);
  if (!booking) throw new BookingError("Reserva não encontrada.", 400);
  if (!isStaff(ctx) && booking.psychologistId !== ctx.ownPsychologistId) {
    throw new BookingError("Você só pode cancelar as suas próprias reservas.", 400);
  }
  if (String(booking.date) < ctx.today) throw new BookingError("Essa reserva já passou.", 400);
  const room = await storage.getRoom(ctx.companyId, booking.roomId);
  const payload: CancelPayload = {
    bookingId: booking.id,
    roomId: booking.roomId,
    psychologistId: booking.psychologistId,
    date: String(booking.date),
    startTime: booking.startTime,
    endTime: booking.endTime,
    roomName: room?.name ?? `Sala #${booking.roomId}`,
    psychologistName: await psychologistName(ctx.companyId, booking.psychologistId),
  };
  return insertAction(ctx, conversationId, "room_booking.cancel", payload);
}

async function insertAction(ctx: AgentContext, conversationId: number, type: string, payload: object) {
  const [action] = await db
    .insert(agentActions)
    .values({ companyId: ctx.companyId, userId: ctx.userId, conversationId, type, payload })
    .returning();
  return action;
}

/** What the client needs to draw the confirmation card. */
export function presentAction(action: AgentAction) {
  const expired = action.status === "pending" && Date.now() - new Date(action.createdAt).getTime() > ACTION_TTL_MS;
  return {
    id: action.id,
    type: action.type,
    status: expired ? "expired" : action.status,
    payload: action.payload as BookingPayload | CancelPayload,
    result: action.result as { error?: string; bookingId?: number } | null,
    expiresAt: new Date(new Date(action.createdAt).getTime() + ACTION_TTL_MS).toISOString(),
  };
}

async function ownAction(ctx: AgentContext, id: number) {
  const [action] = await db
    .select()
    .from(agentActions)
    .where(and(eq(agentActions.id, id), eq(agentActions.companyId, ctx.companyId), eq(agentActions.userId, ctx.userId)));
  if (!action) throw new ActionError("Ação não encontrada.", 404);
  if (action.status !== "pending") throw new ActionError("Esta ação já foi resolvida.", 409);
  if (presentAction(action).status === "expired") {
    await resolve(action.id, "expired", null);
    throw new ActionError("Esta proposta expirou. Peça de novo ao assistente.", 410);
  }
  return action;
}

/** Moves an action out of `from`; returns undefined when another request got there first. */
async function resolve(id: number, status: string, result: object | null, from = "pending") {
  const [row] = await db
    .update(agentActions)
    .set({ status, result, resolvedAt: status === "processing" ? null : new Date() })
    .where(and(eq(agentActions.id, id), eq(agentActions.status, from)))
    .returning();
  return row;
}

/** Leaves a note in the transcript so the assistant knows what happened to its proposal. */
async function note(action: AgentAction, content: string) {
  const [message] = await db
    .insert(agentMessages)
    .values({ conversationId: action.conversationId, role: "assistant", content, actionId: action.id })
    .returning();
  await db.update(agentConversations).set({ updatedAt: new Date() }).where(eq(agentConversations.id, action.conversationId));
  return message;
}

const when = (p: { date: string; startTime: string; endTime: string }) =>
  `${p.date.split("-").reverse().join("/")} das ${p.startTime.slice(0, 5)} às ${p.endTime.slice(0, 5)}`;

export async function confirmAction(ctx: AgentContext, id: number) {
  const action = await ownAction(ctx, id);
  // Claim it first, so a double click or two tabs never book twice
  if (!(await resolve(action.id, "processing", null))) throw new ActionError("Esta ação já foi resolvida.", 409);
  const finish = (status: string, result: object) => resolve(action.id, status, result, "processing");
  try {
    if (action.type === "room_booking.create") {
      const p = action.payload as BookingPayload;
      const booking = await storage.createRoomBooking(ctx.companyId, await checkBooking(ctx, p));
      await audit(ctx, "agent_room_booking_create", booking.id, p);
      const done = await finish("confirmed", { bookingId: booking.id });
      return { action: presentAction(done ?? action), message: await note(action, `Reserva feita: ${p.roomName} para ${p.psychologistName}, ${when(p)}.`) };
    }
    if (action.type === "room_booking.cancel") {
      const p = action.payload as CancelPayload;
      const inPayout = await db.select({ id: commissionItems.id }).from(commissionItems).where(inArray(commissionItems.bookingId, [p.bookingId]));
      if (inPayout.length) throw new BookingError("Esta reserva já entrou em um repasse e não pode ser cancelada por aqui.", 409);
      if (!(await storage.deleteRoomBooking(ctx.companyId, p.bookingId))) throw new BookingError("Essa reserva não existe mais.", 409);
      await audit(ctx, "agent_room_booking_cancel", p.bookingId, p);
      const done = await finish("confirmed", { bookingId: p.bookingId });
      return { action: presentAction(done ?? action), message: await note(action, `Reserva cancelada: ${p.roomName}, ${when(p)}.`) };
    }
    throw new BookingError("Ação desconhecida.", 400);
  } catch (error) {
    if (!(error instanceof BookingError)) {
      await finish("failed", { error: "Erro inesperado." });
      throw error;
    }
    const failed = await finish("failed", { error: error.message });
    await note(action, `Não foi possível concluir: ${error.message}`);
    throw new ActionError(error.message, 409, presentAction(failed ?? action));
  }
}

export async function cancelAction(ctx: AgentContext, id: number) {
  const action = await ownAction(ctx, id);
  const done = await resolve(action.id, "cancelled", null);
  const text = action.type === "room_booking.cancel" ? "Tudo bem, a reserva continua de pé." : "Tudo bem, não fiz a reserva.";
  return { action: presentAction(done ?? action), message: await note(action, text) };
}

async function audit(ctx: AgentContext, action: string, bookingId: number, details: object) {
  await storage.createAuditLog(ctx.companyId, {
    userId: ctx.userId,
    action,
    resourceType: "room_booking",
    resourceId: bookingId,
    patientId: null,
    ipAddress: null,
    userAgent: null,
    details,
  });
}
