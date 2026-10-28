import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { accessInvites, companies, companyMemberships, users } from "@shared/schema";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { requirePlatformAdmin } from "../middleware/auth-guards";
import { addCompanyAdmin } from "../lib/companies";

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

const nameSchema = z.string().trim().min(2, "Informe o nome da empresa.").max(120);
const cnpjSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 14, "CNPJ deve ter 14 dígitos.")
  .transform((v) => v || null);

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

export default router;
