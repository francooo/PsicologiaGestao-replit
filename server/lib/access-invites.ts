import { db } from "../db";
import { accessInvites, users, type User } from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDefaultCompanyId, upsertMembership } from "./companies";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Applies every pending invite for the user's e-mail — a membership with the invited
 * role in the invite's company — activates the account and marks the invites accepted.
 * Called on first access: Google sign-in and /api/register.
 * Returns the refreshed user when something changed.
 */
export async function applyPendingInvites(user: User): Promise<User> {
  if (!user.email) return user;
  const pending = await db
    .select()
    .from(accessInvites)
    .where(and(sql`lower(${accessInvites.email}) = ${normalizeEmail(user.email)}`, isNull(accessInvites.acceptedAt)));
  if (pending.length === 0) return user;

  for (const invite of pending) {
    // Invites from before companies existed belong to Empresa 1
    const companyId = invite.companyId ?? (await getDefaultCompanyId());
    if (companyId) await upsertMembership(user.id, companyId, invite.role);
  }
  await db.update(users).set({ status: "active" }).where(eq(users.id, user.id));
  await db
    .update(accessInvites)
    .set({ acceptedAt: new Date(), acceptedUserId: user.id })
    .where(and(sql`lower(${accessInvites.email}) = ${normalizeEmail(user.email)}`, isNull(accessInvites.acceptedAt)));
  return { ...user, status: "active" };
}

export async function hasPendingInvite(email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: accessInvites.id })
    .from(accessInvites)
    .where(and(sql`lower(${accessInvites.email}) = ${normalizeEmail(email)}`, isNull(accessInvites.acceptedAt)))
    .limit(1);
  return !!row;
}
