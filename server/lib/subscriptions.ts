import { z } from "zod";
import { db } from "../db";
import { subscriptionEvents } from "@shared/schema";

/** Calendar date (YYYY-MM-DD) of an instant in São Paulo. */
export const saoPauloDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);

const toUtc = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** YYYY-MM-DD that exists in the calendar (rejects 2026-02-30). */
export const isValidDate = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(toUtc(v)).toISOString().slice(0, 10) === v;

export const dateSchema = (message: string) =>
  z.string({ required_error: message, invalid_type_error: message }).refine(isValidDate, message);

/** Calendar months later, clamping the day to the month end (Jan 31 + 1 = Feb 28/29). */
export function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((toUtc(to) - toUtc(from)) / 86_400_000);

/** Whole months from `start` to `end` (0 when end is before start). */
export function monthsBetween(start: string, end: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const months = (ey - sy) * 12 + (em - sm) - (ed < sd ? 1 : 0);
  return Math.max(0, months);
}

/** The 12 months (YYYY-MM) ending at the month of `today`, oldest first. */
export function lastTwelveMonths(today: string) {
  const first = `${today.slice(0, 7)}-01`;
  return Array.from({ length: 12 }, (_, i) => addMonths(first, i - 11).slice(0, 7));
}

/** Numeric columns come back from Postgres as strings. */
export const toNumber = (v: string | number | null | undefined) => (v === null || v === undefined ? null : Number(v));

export type SubscriptionEventType =
  | "created"
  | "plan_changed"
  | "price_changed"
  | "start_changed"
  | "validity_changed"
  | "payment_added"
  | "payment_removed"
  | "ai_toggled"
  | "suspended"
  | "reactivated"
  | "renamed";

type Executor = Pick<typeof db, "insert">;

export async function recordSubscriptionEvent(
  companyId: number,
  type: SubscriptionEventType,
  details: Record<string, unknown> | null,
  userId: number | null,
  executor: Executor = db
) {
  await executor.insert(subscriptionEvents).values({ companyId, type, details, userId });
}
