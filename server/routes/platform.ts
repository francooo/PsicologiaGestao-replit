import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { accessInvites, companies, companyMemberships, users } from "@shared/schema";
import { and, asc, count, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { requirePlatformAdmin } from "../middleware/auth-guards";
import { storage } from "../storage";
import {
  addCompanyAdmin,
  cnpjSchema,
  companyNameSchema as nameSchema,
  ensurePsychologistProfileFor,
  isPlatformAdmin,
  upsertMembership,
} from "../lib/companies";

// Mounted at /api/platform — the platform (super) admin manages the companies (clínicas).
// Companies are never deleted here, only suspended, so their data stays intact.
const router = Router();
router.use(requirePlatformAdmin);

const companyColumns = {
  id: companies.id,
  name: companies.name,
  slug: companies.slug,
  cnpj: companies.cnpj,
  logoUrl: companies.logoUrl,
  status: companies.status,
  createdAt: companies.createdAt,
};


function slugify(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "empresa"
  );
}

/** First free slug: name, name-2, name-3... */
async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [taken] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug));
    if (!taken) return slug;
  }
}

const parseId = (raw: string) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/platform/companies — every company with member/admin/pending counts
router.get("/companies", async (_req, res) => {
  try {
    const list = await db.select(companyColumns).from(companies).orderBy(asc(companies.name));
    const members = await db
      .select({ companyId: companyMemberships.companyId, role: companyMemberships.role, total: count() })
      .from(companyMemberships)
      .where(eq(companyMemberships.status, "active"))
      .groupBy(companyMemberships.companyId, companyMemberships.role);
    const pending = await db
      .select({ companyId: accessInvites.companyId, total: count() })
      .from(accessInvites)
      .where(isNull(accessInvites.acceptedAt))
      .groupBy(accessInvites.companyId);

    res.json(
      list.map((c) => {
        const rows = members.filter((m) => m.companyId === c.id);
        return {
          ...c,
          membersCount: rows.reduce((acc, m) => acc + Number(m.total), 0),
          adminsCount: Number(rows.find((m) => m.role === "admin")?.total ?? 0),
          pendingInvitesCount: Number(pending.find((p) => p.companyId === c.id)?.total ?? 0),
        };
      })
    );
  } catch (error) {
    console.error("GET /api/platform/companies:", error);
    res.status(500).json({ message: "Erro ao carregar empresas." });
  }
});

const createSchema = z.object({
  name: nameSchema,
  cnpj: cnpjSchema.optional(),
  adminEmail: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
});

// POST /api/platform/companies { name, cnpj?, adminEmail? } — creates the company and its first admin
router.post("/companies", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { name, cnpj, adminEmail } = parsed.data;

  try {
    const [company] = await db
      .insert(companies)
      .values({ name, cnpj: cnpj ?? null, slug: await uniqueSlug(name) })
      .returning(companyColumns);
    const admin = adminEmail ? await addCompanyAdmin(company.id, adminEmail, req.user!.id) : null;
    res.status(201).json({ company, admin });
  } catch (error) {
    console.error("POST /api/platform/companies:", error);
    res.status(500).json({ message: "Erro ao criar empresa." });
  }
});

const updateSchema = z
  .object({
    name: nameSchema.optional(),
    cnpj: cnpjSchema.optional(),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nada para alterar.");

// PATCH /api/platform/companies/:id { name?, cnpj?, status? } — rename or suspend/reactivate
router.patch("/companies/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Empresa inválida." });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const [updated] = await db.update(companies).set(parsed.data).where(eq(companies.id, id)).returning(companyColumns);
    if (!updated) return res.status(404).json({ message: "Empresa não encontrada." });
    res.json(updated);
  } catch (error) {
    console.error("PATCH /api/platform/companies/:id:", error);
    res.status(500).json({ message: "Erro ao atualizar empresa." });
  }
});

// GET /api/platform/companies/:id — the company, its members and pending invites
router.get("/companies/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Empresa inválida." });

  try {
    const [company] = await db.select(companyColumns).from(companies).where(eq(companies.id, id));
    if (!company) return res.status(404).json({ message: "Empresa não encontrada." });
    const members = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: companyMemberships.role,
        status: companyMemberships.status,
      })
      .from(companyMemberships)
      .innerJoin(users, eq(companyMemberships.userId, users.id))
      .where(eq(companyMemberships.companyId, id))
      .orderBy(asc(users.fullName));
    const invites = await db
      .select({ id: accessInvites.id, email: accessInvites.email, role: accessInvites.role, createdAt: accessInvites.createdAt })
      .from(accessInvites)
      .where(and(eq(accessInvites.companyId, id), isNull(accessInvites.acceptedAt)))
      .orderBy(asc(accessInvites.createdAt));
    res.json({ company, members, invites });
  } catch (error) {
    console.error("GET /api/platform/companies/:id:", error);
    res.status(500).json({ message: "Erro ao carregar empresa." });
  }
});

const emailSchema = z.object({ email: z.string().trim().email("Informe um e-mail válido.") });

// POST /api/platform/companies/:id/admins { email } — add (or pre-authorize) an admin of that company
router.post("/companies/:id/admins", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Empresa inválida." });
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const [company] = await db.select({ id: companies.id }).from(companies).where(eq(companies.id, id));
    if (!company) return res.status(404).json({ message: "Empresa não encontrada." });
    const result = await addCompanyAdmin(id, parsed.data.email, req.user!.id);
    if (result.type === "conflict") return res.status(409).json({ message: result.message });
    res.status(result.type === "promoted" ? 200 : 201).json(result);
  } catch (error) {
    console.error("POST /api/platform/companies/:id/admins:", error);
    res.status(500).json({ message: "Erro ao adicionar administrador." });
  }
});

// DELETE /api/platform/companies/:id/invites/:inviteId — cancel a pending pre-authorization
router.delete("/companies/:id/invites/:inviteId", async (req, res) => {
  const id = parseId(req.params.id);
  const inviteId = parseId(req.params.inviteId);
  if (!id || !inviteId) return res.status(400).json({ message: "Convite inválido." });

  try {
    const deleted = await db
      .delete(accessInvites)
      .where(and(eq(accessInvites.id, inviteId), eq(accessInvites.companyId, id), isNull(accessInvites.acceptedAt)))
      .returning({ id: accessInvites.id });
    if (deleted.length === 0) return res.status(404).json({ message: "Convite não encontrado." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /api/platform/companies/:id/invites/:inviteId:", error);
    res.status(500).json({ message: "Erro ao cancelar convite." });
  }
});

// --- Contas sem clínica: people who signed up on their own (or lost every membership) ---

// Raw, fully qualified SQL: drizzle drops the table name of single-table selects, which is ambiguous here
const hasActiveMembership = sql`EXISTS (
  SELECT 1 FROM company_memberships m WHERE m.user_id = "users"."id" AND m.status = 'active'
)`;

async function findUnlinkedAccount(id: number) {
  const [account] = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email, linked: hasActiveMembership })
    .from(users)
    .where(eq(users.id, id));
  return account;
}

// GET /api/platform/unlinked-accounts?status=waiting|inactive — accounts without an active company
router.get("/unlinked-accounts", async (req, res) => {
  const inactive = req.query.status === "inactive";
  try {
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        username: users.username,
        avatarUrl: users.avatarUrl,
        status: users.status,
        createdAt: users.createdAt,
        viaGoogle: sql<boolean>`${users.googleId} IS NOT NULL`,
        // The company they last belonged to, when every membership was deactivated
        lastCompanyName: sql<string | null>`(
          SELECT c.name FROM company_memberships m JOIN companies c ON c.id = m.company_id
          WHERE m.user_id = "users"."id" ORDER BY m.created_at DESC LIMIT 1
        )`,
      })
      .from(users)
      .where(and(sql`NOT ${hasActiveMembership}`, inactive ? ne(users.status, "active") : eq(users.status, "active")))
      .orderBy(desc(users.id));
    res.json(rows.filter((u) => !isPlatformAdmin(u.email)));
  } catch (error) {
    console.error("GET /api/platform/unlinked-accounts:", error);
    res.status(500).json({ message: "Erro ao carregar contas." });
  }
});

const linkSchema = z.object({
  companyId: z.number().int().positive("Escolha a clínica."),
  role: z.enum(["admin", "psychologist", "receptionist"], { message: "Escolha o papel." }),
});

// POST /api/platform/unlinked-accounts/:id/link { companyId, role } — puts the account in a company
router.post("/unlinked-accounts/:id/link", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Conta inválida." });
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { companyId, role } = parsed.data;

  try {
    const account = await findUnlinkedAccount(id);
    if (!account) return res.status(404).json({ message: "Conta não encontrada." });
    const [company] = await db.select({ id: companies.id, name: companies.name, status: companies.status }).from(companies).where(eq(companies.id, companyId));
    if (!company) return res.status(404).json({ message: "Empresa não encontrada." });
    if (company.status !== "active") return res.status(409).json({ message: "Esta empresa está suspensa." });
    const [member] = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(and(eq(companyMemberships.userId, id), eq(companyMemberships.companyId, companyId), eq(companyMemberships.status, "active")));
    if (member) return res.status(409).json({ message: "Esta conta já faz parte desta empresa." });

    await upsertMembership(id, companyId, role);
    await db.update(users).set({ status: "active" }).where(eq(users.id, id));
    if (role === "psychologist") await ensurePsychologistProfileFor(companyId, id);
    await storage.createAuditLog(companyId, {
      userId: req.user!.id,
      action: "platform_link_account",
      resourceType: "user",
      resourceId: id,
      patientId: null,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { email: account.email, role },
    });
    res.json({ company: { id: company.id, name: company.name }, role });
  } catch (error) {
    console.error("POST /api/platform/unlinked-accounts/:id/link:", error);
    res.status(500).json({ message: "Erro ao vincular conta." });
  }
});

// POST /api/platform/unlinked-accounts/:id/deactivate — blocks the login and ends open sessions
router.post("/unlinked-accounts/:id/deactivate", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Conta inválida." });

  try {
    const account = await findUnlinkedAccount(id);
    if (!account) return res.status(404).json({ message: "Conta não encontrada." });
    // Members are managed by their clinic; this screen never locks one out
    if (account.linked) return res.status(409).json({ message: "Esta conta faz parte de uma empresa." });
    if (isPlatformAdmin(account.email)) return res.status(409).json({ message: "Não é possível desativar um super admin." });

    await db.update(users).set({ status: "inactive" }).where(eq(users.id, id));
    await db.execute(sql`DELETE FROM session WHERE sess->'passport'->>'user' = ${String(id)}`);
    res.status(204).end();
  } catch (error) {
    console.error("POST /api/platform/unlinked-accounts/:id/deactivate:", error);
    res.status(500).json({ message: "Erro ao desativar conta." });
  }
});

// POST /api/platform/unlinked-accounts/:id/reactivate — undoes a deactivation
router.post("/unlinked-accounts/:id/reactivate", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Conta inválida." });

  try {
    const account = await findUnlinkedAccount(id);
    if (!account) return res.status(404).json({ message: "Conta não encontrada." });
    await db.update(users).set({ status: "active" }).where(eq(users.id, id));
    res.status(204).end();
  } catch (error) {
    console.error("POST /api/platform/unlinked-accounts/:id/reactivate:", error);
    res.status(500).json({ message: "Erro ao reativar conta." });
  }
});

export default router;
