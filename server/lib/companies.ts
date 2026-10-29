import type { Request } from "express";
import { db } from "../db";
import { accessInvites, companies, companyMemberships, users, DEFAULT_COMPANY_SLUG, type CompanySummary, type User } from "@shared/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { normalizeEmail } from "./access-invites";
import { storage } from "../storage";

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

/**
 * A psychologist needs a profile in each company she works in. Created on login and when the
 * platform admin links an account, so the agenda works without logging in again.
 */
export async function ensurePsychologistProfileFor(companyId: number, userId: number) {
  const existingProfile = await storage.getPsychologistByUserId(companyId, userId);
  if (existingProfile) return;
  const newProfile = await storage.createPsychologist(companyId, {
    userId,
    specialization: null,
    bio: null,
    hourlyRate: 0,
  });
  // Fix any existing appointments/bookings that were saved with psychologistId=0
  // (caused by missing profile at creation time)
  const allAppointments = await storage.getAllAppointments(companyId);
  const orphaned = allAppointments.filter(a => a.psychologistId === 0);
  for (const appt of orphaned) {
    await storage.updateAppointment(companyId, appt.id, { psychologistId: newProfile.id });
  }
}

const adminColumns = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  username: users.username,
  status: users.status,
  avatarUrl: users.avatarUrl,
};

export type AddAdminResult =
  | { type: "promoted"; admin: Record<string, unknown> }
  | { type: "invited"; invite: { id: number; email: string; role: string; createdAt: Date } }
  | { type: "conflict"; message: string };

/**
 * Makes `email` an admin of the company: promotes the existing account, or pre-authorizes
 * the e-mail (access_invites) so the first access — Google or sign-up — joins as admin.
 */
export async function addCompanyAdmin(companyId: number, rawEmail: string, invitedByUserId: number): Promise<AddAdminResult> {
  const email = normalizeEmail(rawEmail);
  const [existing] = await db.select(adminColumns).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (existing) {
    const [current] = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(
        and(
          eq(companyMemberships.companyId, companyId),
          eq(companyMemberships.userId, existing.id),
          eq(companyMemberships.role, "admin"),
          eq(companyMemberships.status, "active")
        )
      );
    if (current) return { type: "conflict", message: "Este e-mail já é administrador." };
    await upsertMembership(existing.id, companyId, "admin");
    await db.update(users).set({ status: "active" }).where(eq(users.id, existing.id));
    return { type: "promoted", admin: { ...existing, status: "active" } };
  }

  const sameInvite = and(sql`lower(${accessInvites.email}) = ${email}`, eq(accessInvites.companyId, companyId));
  const [pending] = await db
    .select({ id: accessInvites.id })
    .from(accessInvites)
    .where(and(sameInvite, isNull(accessInvites.acceptedAt)))
    .limit(1);
  if (pending) return { type: "conflict", message: "Este e-mail já está pré-autorizado." };

  // A previously accepted invite for the same e-mail would hit the unique index; reuse it.
  await db.delete(accessInvites).where(sameInvite);
  const [invite] = await db
    .insert(accessInvites)
    .values({ email, role: "admin", companyId, invitedByUserId })
    .returning({ id: accessInvites.id, email: accessInvites.email, role: accessInvites.role, createdAt: accessInvites.createdAt });
  return { type: "invited", invite };
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

const DEFAULT_COMPANY_NAME = "Empresa 1";

/**
 * Clinic name and logo shown to patients (public pages, care forms and e-mails). The
 * default company keeps the CLINIC_NAME branding it had before companies existed, until
 * someone renames it.
 */
export async function publicClinic(companyId: number | null | undefined): Promise<{ name: string; logoUrl: string | null }> {
  const fallback = { name: process.env.CLINIC_NAME || "ConsultaPsi", logoUrl: null };
  if (!companyId) return fallback;
  const [company] = await db
    .select({ name: companies.name, slug: companies.slug, logoUrl: companies.logoUrl })
    .from(companies)
    .where(eq(companies.id, companyId));
  if (!company) return fallback;
  const untouchedDefault = company.slug === DEFAULT_COMPANY_SLUG && company.name === DEFAULT_COMPANY_NAME;
  return { name: untouchedDefault ? fallback.name : company.name, logoUrl: company.logoUrl };
}

export const companyNameSchema = z.string().trim().min(2, "Informe o nome da empresa.").max(120);

/** Accepts the CNPJ with or without punctuation; stores the 14 digits (empty = none). */
export const cnpjSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 14, "CNPJ deve ter 14 dígitos.")
  .transform((v) => v || null);

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
