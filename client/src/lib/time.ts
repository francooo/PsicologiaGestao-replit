import { format } from "date-fns";

/** "14:30" or "14:30:00" -> minutes since midnight */
export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Local calendar date as yyyy-MM-dd (toISOString() is UTC and shifts the day at night in BRT). */
export function toDateKey(date: Date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

/** True if [startA, endA) overlaps [startB, endB) — times as "HH:mm[:ss]". */
export function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(startB) < timeToMinutes(endA);
}
