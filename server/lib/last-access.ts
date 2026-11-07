import type { Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db";

// Last access per user (owner panel): only timestamps, no IP or device.
// Writes are awaited (Vercel may freeze the function right after the response) but never fail the request.

const SEEN_INTERVAL_MS = 5 * 60 * 1000;
// Per-instance cache, so most requests skip the query
const lastTouched = new Map<number, number>();

/** A successful login (e-mail/senha, Google, app or sign-up). */
export async function recordLogin(userId: number) {
  try {
    await db.execute(sql`UPDATE users SET last_login_at = now(), last_seen_at = now() WHERE id = ${userId}`);
    lastTouched.set(userId, Date.now());
  } catch (error) {
    console.error("recordLogin:", error);
  }
}

/** Middleware: marks the signed-in user as seen, at most once every 5 minutes. Register after passport.session(). */
export function touchLastSeen() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.isAuthenticated?.() ? req.user?.id : undefined;
    const now = Date.now();
    if (userId && now - (lastTouched.get(userId) ?? 0) >= SEEN_INTERVAL_MS) {
      lastTouched.set(userId, now);
      try {
        await db.execute(sql`
          UPDATE users SET last_seen_at = now()
          WHERE id = ${userId} AND (last_seen_at IS NULL OR last_seen_at < now() - interval '5 minutes')
        `);
      } catch (error) {
        console.error("touchLastSeen:", error);
      }
    }
    next();
  };
}
