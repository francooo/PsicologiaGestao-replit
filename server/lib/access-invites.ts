import { db } from "../db";
import { accessInvites, users, type User } from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Applies every pending invite for the user's e-mail (role + active status) and
 * marks them accepted. Called on first access: Google sign-in and /api/register.
 * Returns the refreshed user when something changed.
 */
export async function applyPendingInvites(user: User): Promise<User> {
  if (!user.email) return user;
  const pending = await db
    .select()
    .from(accessInvites)
    .where(and(sql`lower(${accessInvites.email}) = ${normalizeEmail(user.email)}`, isNull(accessInvites.acceptedAt)));
  if (pending.length === 0) return user;

  const role = pending.some((i) => i.role === "admin") ? "admin" : pending[0].role;
  await db.update(users).set({ role, status: "active" }).where(eq(users.id, user.id));
  await db
    .update(accessInvites)
    .set({ acceptedAt: new Date(), acceptedUserId: user.id })
    .where(and(sql`lower(${accessInvites.email}) = ${normalizeEmail(user.email)}`, isNull(accessInvites.acceptedAt)));
  return { ...user, role, status: "active" };
}

export async function hasPendingInvite(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: accessInvites.id })
    .from(accessInvites)
    .where(and(sql`lower(${accessInvites.email}) = ${normalizeEmail(email)}`, isNull(accessInvites.acceptedAt)))
    .limit(1);
  return !!row;
}
