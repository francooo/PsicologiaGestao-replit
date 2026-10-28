import type { Request } from "express";
import { db } from "../db";
import { companies, companyMemberships, DEFAULT_COMPANY_SLUG, type CompanySummary, type User } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { normalizeEmail } from "./access-invites";

declare module "express-session" {
  interface SessionData {
    companyId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      /** Active company of the logged-in user (set by companyContext). */
      companyId?: number;
    }
  }
}

/** Role a logged-in user gets while no company is active: matches no route guard. */
export const NO_COMPANY_ROLE = "none";

/** Platform (super) admins come from PLATFORM_ADMIN_EMAILS, a comma-separated list. */
export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
  return allowed.includes(normalizeEmail(email));
}

/** Active companies where the user has an active membership. */
export async function listUserCompanies(userId: number): Promise<CompanySummary[]> {
  return db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl, role: companyMemberships.role })
    .from(companyMemberships)
    .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
    .where(and(eq(companyMemberships.userId, userId), eq(companyMemberships.status, "active"), eq(companies.status, "active")))
    .orderBy(companies.name);
}

/**
 * The company the user may act in: their membership, or — for platform admins —
 * any active company, as admin (support access).
 */
export async function findCompanyAccess(user: User, companyId: number): Promise<CompanySummary | undefined> {
  const [own] = (await listUserCompanies(user.id)).filter((c) => c.id === companyId);
  if (own) return own;
  if (!isPlatformAdmin(user.email)) return undefined;
  const [company] = await db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl })
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.status, "active")));
  return company ? { ...company, role: "admin" } : undefined;
}

/** Creates the membership, or updates its role and reactivates it. */
export async function upsertMembership(userId: number, companyId: number, role: string) {
  await db
    .insert(companyMemberships)
    .values({ userId, companyId, role, status: "active" })
    .onConflictDoUpdate({
      target: [companyMemberships.userId, companyMemberships.companyId],
      set: { role, status: "active" },
    });
}

export async function getDefaultCompanyId(): Promise<number | undefined> {
  const [row] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, DEFAULT_COMPANY_SLUG));
  return row?.id;
}

/**
 * Resolves the active company for the request: keeps the one in the session while it
 * is still allowed, otherwise picks the user's only company. Overrides req.user.role
 * with the role in that company (NO_COMPANY_ROLE when there is none).
 */
export async function resolveCompanyContext(req: Request): Promise<CompanySummary | undefined> {
  if (!req.user) return undefined;
  let active: CompanySummary | undefined;

  if (req.session.companyId) {
    active = await findCompanyAccess(req.user, req.session.companyId);
    if (!active) delete req.session.companyId;
  }
  if (!active) {
    const own = await listUserCompanies(req.user.id);
    if (own.length === 1) {
      active = own[0];
      req.session.companyId = active.id;
    }
  }

  req.companyId = active?.id;
  req.user.role = active?.role ?? NO_COMPANY_ROLE;
  return active;
}

/** /api/user shape: the user (without password) plus their companies. */
export async function userPayload(req: Request) {
  const { password, ...user } = req.user as User;
  const companiesList = await listUserCompanies(user.id);
  const activeCompany =
    companiesList.find((c) => c.id === req.companyId) ??
    (req.companyId ? await findCompanyAccess(req.user!, req.companyId) : undefined) ??
    null;
  return { ...user, isPlatformAdmin: isPlatformAdmin(user.email), activeCompany, companies: companiesList };
}
