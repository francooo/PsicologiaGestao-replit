import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import {
  accessInvites,
  companies,
  companyMemberships,
  subscriptionEvents,
  subscriptionPayments,
  users,
  SUBSCRIPTION_PAYMENT_METHODS,
  SUBSCRIPTION_PLANS,
} from "@shared/schema";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { requirePlatformAdmin } from "../middleware/auth-guards";
import { storage } from "../storage";
import {
  addCompanyAdmin,
  cnpjSchema,
  companyNameSchema as nameSchema,
  ensurePsychologistProfileFor,
  isAccessExpired,
  isPlatformAdmin,
  todaySaoPaulo,
  upsertMembership,
} from "../lib/companies";
import {
  addMonths,
  dateSchema,
  daysBetween,
  isValidDate,
  lastTwelveMonths,
  monthsBetween,
  recordSubscriptionEvent,
  saoPauloDate,
  toNumber,
  type SubscriptionEventType,
} from "../lib/subscriptions";

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
  accessValidUntil: companies.accessValidUntil,
  aiEnabled: companies.aiEnabled,
  createdAt: companies.createdAt,
};
const withExpiry = <T extends { accessValidUntil: string | null }>(c: T) => ({ ...c, accessExpired: isAccessExpired(c.accessValidUntil) });

// Company plus its subscription fields (monthlyPrice as a number)
const subscriptionColumns = {
  ...companyColumns,
  plan: companies.plan,
  monthlyPrice: companies.monthlyPrice,
  subscriptionStartedAt: companies.subscriptionStartedAt,
};
const withSubscription = <T extends { accessValidUntil: string | null; monthlyPrice: string | null }>(c: T) => ({
  ...withExpiry(c),
  monthlyPrice: toNumber(c.monthlyPrice),
});

/** 400 body for a zod error: the first field and its message. */
const zodError = (error: z.ZodError) => ({ field: String(error.issues[0].path[0] ?? ""), message: error.issues[0].message });


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
          ...withExpiry(c),
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
    await recordSubscriptionEvent(company.id, "created", { name: company.name, cnpj: company.cnpj }, req.user!.id);
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
    // Last day of access (inclusive); null removes the expiry
    accessValidUntil: dateSchema("Data de validade inválida.").nullable().optional(),
    aiEnabled: z.boolean().optional(),
    plan: z.enum(SUBSCRIPTION_PLANS, { message: "Plano inválido." }).nullable().optional(),
    monthlyPrice: z
      .number({ invalid_type_error: "Valor mensal inválido." })
      .min(0, "Valor mensal inválido.")
      .max(99_999_999.99, "Valor mensal inválido.")
      .nullable()
      .optional(),
    subscriptionStartedAt: dateSchema("Data de início inválida.").nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nada para alterar.");

// Changed field → event type recorded in the subscription history
const eventFor: Record<string, (to: unknown) => SubscriptionEventType> = {
  name: () => "renamed",
  plan: () => "plan_changed",
  monthlyPrice: () => "price_changed",
  subscriptionStartedAt: () => "start_changed",
  accessValidUntil: () => "validity_changed",
  aiEnabled: () => "ai_toggled",
  status: (to) => (to === "suspended" ? "suspended" : "reactivated"),
};

// PATCH /api/platform/companies/:id { name?, cnpj?, status?, accessValidUntil?, aiEnabled?, plan?,
// monthlyPrice?, subscriptionStartedAt? } — rename, suspend/reactivate, set the access expiry,
// switch AI off or edit the subscription; every change goes to the subscription history
router.patch("/companies/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Empresa inválida." });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(zodError(parsed.error));
  const { monthlyPrice, ...rest } = parsed.data;
  const values = {
    ...rest,
    ...(monthlyPrice !== undefined ? { monthlyPrice: monthlyPrice === null ? null : monthlyPrice.toFixed(2) } : {}),
  };

  try {
    const updated = await db.transaction(async (tx) => {
      const [before] = await tx.select(subscriptionColumns).from(companies).where(eq(companies.id, id)).for("update");
      if (!before) return undefined;
      const [after] = await tx.update(companies).set(values).where(eq(companies.id, id)).returning(subscriptionColumns);
      const from = withSubscription(before) as Record<string, unknown>;
      const to = withSubscription(after) as Record<string, unknown>;
      for (const field of Object.keys(eventFor)) {
        if (!(field in parsed.data) || from[field] === to[field]) continue;
        await recordSubscriptionEvent(id, eventFor[field](to[field]), { from: from[field], to: to[field] }, req.user!.id, tx);
      }
      return after;
    });
    if (!updated) return res.status(404).json({ message: "Empresa não encontrada." });
    res.json(withSubscription(updated));
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
    res.json({ company: withExpiry(company), members, invites });
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

// --- Assinaturas (painel do dono): plans, payments and the subscription history ---

/** ?from&to (São Paulo days); defaults to the current month up to today. */
function parsePeriod(query: Record<string, unknown>) {
  const today = todaySaoPaulo();
  const from = typeof query.from === "string" && query.from ? query.from : `${today.slice(0, 7)}-01`;
  const to = typeof query.to === "string" && query.to ? query.to : today;
  if (!isValidDate(from)) return { error: { field: "from", message: "Data inicial inválida." } };
  if (!isValidDate(to)) return { error: { field: "to", message: "Data final inválida." } };
  if (from > to) return { error: { field: "to", message: "A data final deve ser depois da inicial." } };
  return { from, to };
}

const sumAmount = sql<string | null>`sum(${subscriptionPayments.amount})`;

/** One entry per company (all, or just `onlyId`): subscription, payment totals and admins. */
async function loadSubscribers(onlyId?: number) {
  const today = todaySaoPaulo();
  const list = await db
    .select(subscriptionColumns)
    .from(companies)
    .where(onlyId ? eq(companies.id, onlyId) : undefined)
    .orderBy(asc(companies.name));
  if (list.length === 0) return [];
  const ids = list.map((c) => c.id);
  const totals = await db
    .select({
      companyId: subscriptionPayments.companyId,
      total: sumAmount,
      count: count(),
      last: sql<string | null>`max(${subscriptionPayments.paidAt})::text`,
    })
    .from(subscriptionPayments)
    .where(inArray(subscriptionPayments.companyId, ids))
    .groupBy(subscriptionPayments.companyId);
  const members = await db
    .select({
      companyId: companyMemberships.companyId,
      role: companyMemberships.role,
      since: companyMemberships.createdAt,
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(companyMemberships)
    .innerJoin(users, eq(companyMemberships.userId, users.id))
    .where(and(inArray(companyMemberships.companyId, ids), eq(companyMemberships.status, "active")))
    .orderBy(asc(users.fullName));

  return list.map((c) => {
    const paid = totals.find((t) => t.companyId === c.id);
    const own = members.filter((m) => m.companyId === c.id);
    const admins = own.filter((m) => m.role === "admin");
    const subscriptionStartedAt = c.subscriptionStartedAt ?? saoPauloDate(c.createdAt);
    const { logoUrl, createdAt, ...rest } = withSubscription(c);
    return {
      row: {
        ...rest,
        subscriptionStartedAt,
        monthsSubscribed: monthsBetween(subscriptionStartedAt, today),
        totalPaid: Number(paid?.total ?? 0),
        paymentsCount: Number(paid?.count ?? 0),
        lastPaymentAt: paid?.last ?? null,
        membersCount: own.length,
        admins: admins.map(({ id, fullName, email }) => ({ id, fullName, email })),
      },
      createdAt,
      admins: admins.map(({ id, fullName, email, since }) => ({ id, fullName, email, since })),
    };
  });
}

const paymentColumns = {
  id: subscriptionPayments.id,
  amount: subscriptionPayments.amount,
  paidAt: subscriptionPayments.paidAt,
  referenceMonth: subscriptionPayments.referenceMonth,
  monthsCovered: subscriptionPayments.monthsCovered,
  method: subscriptionPayments.method,
  notes: subscriptionPayments.notes,
  validUntilAfter: subscriptionPayments.validUntilAfter,
  createdAt: subscriptionPayments.createdAt,
  createdById: subscriptionPayments.createdBy,
  createdByName: users.fullName,
};
type PaymentRow = { amount: string; createdById: number | null; createdByName: string | null };
const serializePayment = <T extends PaymentRow>({ createdById, createdByName, amount, ...p }: T) => ({
  ...p,
  amount: Number(amount),
  createdBy: createdById ? { id: createdById, fullName: createdByName ?? "" } : null,
});

// GET /api/platform/overview?from&to — totals for the owner panel's home
router.get("/overview", async (req, res) => {
  const period = parsePeriod(req.query);
  if (period.error) return res.status(400).json(period.error);
  const { from, to } = period;

  try {
    const today = todaySaoPaulo();
    const list = (await db.select(subscriptionColumns).from(companies).orderBy(asc(companies.name))).map(withSubscription);
    const notSuspended = list.filter((c) => c.status !== "suspended");
    const active = list.filter((c) => c.status === "active" && !c.accessExpired);
    const withinMonth = (c: { accessValidUntil: string | null }) => !!c.accessValidUntil && daysBetween(today, c.accessValidUntil) <= 30;

    const [sums] = await db
      .select({
        period: sql<string | null>`sum(${subscriptionPayments.amount}) FILTER (WHERE ${subscriptionPayments.paidAt} BETWEEN ${from} AND ${to})`,
        total: sumAmount,
      })
      .from(subscriptionPayments);
    const months = lastTwelveMonths(today);
    const byMonth = await db
      .select({ month: sql<string>`to_char(${subscriptionPayments.paidAt}, 'YYYY-MM')`, amount: sumAmount })
      .from(subscriptionPayments)
      .where(gte(subscriptionPayments.paidAt, `${months[0]}-01`))
      .groupBy(sql`1`);
    const mrrCents = active.reduce((acc, c) => acc + Math.round((c.monthlyPrice ?? 0) * 100), 0);

    res.json({
      companies: {
        total: list.length,
        active: active.length,
        expired: list.filter((c) => c.status === "active" && c.accessExpired).length,
        expiringSoon: active.filter(withinMonth).length,
        suspended: list.filter((c) => c.status === "suspended").length,
      },
      revenue: { period: Number(sums?.period ?? 0), total: Number(sums?.total ?? 0), mrr: mrrCents / 100 },
      revenueByMonth: months.map((month) => ({ month, amount: Number(byMonth.find((m) => m.month === month)?.amount ?? 0) })),
      plans: [...SUBSCRIPTION_PLANS, null].map((plan) => ({ plan, count: notSuspended.filter((c) => (c.plan ?? null) === plan).length })),
      upcoming: notSuspended
        .filter(withinMonth)
        .sort((a, b) => a.accessValidUntil!.localeCompare(b.accessValidUntil!))
        .map((c) => ({
          id: c.id,
          name: c.name,
          accessValidUntil: c.accessValidUntil,
          accessExpired: c.accessExpired,
          daysLeft: daysBetween(today, c.accessValidUntil!),
        })),
    });
  } catch (error) {
    console.error("GET /api/platform/overview:", error);
    res.status(500).json({ message: "Erro ao carregar o painel." });
  }
});

// GET /api/platform/subscribers — every company with its subscription and payment totals
router.get("/subscribers", async (_req, res) => {
  try {
    res.json((await loadSubscribers()).map((s) => s.row));
  } catch (error) {
    console.error("GET /api/platform/subscribers:", error);
    res.status(500).json({ message: "Erro ao carregar assinantes." });
  }
});

// GET /api/platform/companies/:id/subscription — the subscription, its payments and history
router.get("/companies/:id/subscription", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Empresa inválida." });

  try {
    const [subscriber] = await loadSubscribers(id);
    if (!subscriber) return res.status(404).json({ message: "Empresa não encontrada." });
    const payments = await db
      .select(paymentColumns)
      .from(subscriptionPayments)
      .leftJoin(users, eq(subscriptionPayments.createdBy, users.id))
      .where(eq(subscriptionPayments.companyId, id))
      .orderBy(desc(subscriptionPayments.paidAt), desc(subscriptionPayments.id));
    const events = await db
      .select({
        id: subscriptionEvents.id,
        type: subscriptionEvents.type,
        details: subscriptionEvents.details,
        createdAt: subscriptionEvents.createdAt,
        userId: subscriptionEvents.userId,
        userName: users.fullName,
      })
      .from(subscriptionEvents)
      .leftJoin(users, eq(subscriptionEvents.userId, users.id))
      .where(eq(subscriptionEvents.companyId, id))
      .orderBy(desc(subscriptionEvents.createdAt), desc(subscriptionEvents.id));

    res.json({
      company: { ...subscriber.row, createdAt: subscriber.createdAt },
      admins: subscriber.admins,
      payments: payments.map(serializePayment),
      events: events.map(({ userId, userName, ...e }) => ({ ...e, user: userId ? { id: userId, fullName: userName ?? "" } : null })),
    });
  } catch (error) {
    console.error("GET /api/platform/companies/:id/subscription:", error);
    res.status(500).json({ message: "Erro ao carregar a assinatura." });
  }
});

const paymentSchema = z.object({
  amount: z
    .number({ required_error: "Informe o valor.", invalid_type_error: "Informe o valor." })
    .positive("O valor deve ser maior que zero.")
    .max(99_999_999.99, "Valor muito alto."),
  paidAt: dateSchema("Data do pagamento inválida."),
  referenceMonth: z
    .string({ required_error: "Informe o mês de referência.", invalid_type_error: "Mês de referência inválido." })
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês de referência inválido."),
  monthsCovered: z
    .number({ invalid_type_error: "Quantidade de meses inválida." })
    .int("Quantidade de meses inválida.")
    .min(1, "Quantidade de meses inválida.")
    .max(36, "No máximo 36 meses por pagamento.")
    .default(1),
  method: z.enum(SUBSCRIPTION_PAYMENT_METHODS, { message: "Forma de pagamento inválida." }),
  notes: z
    .string({ invalid_type_error: "Observação inválida." })
    .trim()
    .max(500, "Observação muito longa (máx. 500 caracteres).")
    .nullable()
    .optional(),
  extendValidity: z.boolean({ invalid_type_error: "Opção de validade inválida." }).default(true),
});

// POST /api/platform/companies/:id/payments — records a payment and (by default) extends the access
router.post("/companies/:id/payments", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: "Empresa inválida." });
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(zodError(parsed.error));
  const { amount, paidAt, referenceMonth, monthsCovered, method, notes, extendValidity } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const [company] = await tx
        .select({ accessValidUntil: companies.accessValidUntil })
        .from(companies)
        .where(eq(companies.id, id))
        .for("update");
      if (!company) return undefined;
      const before = company.accessValidUntil;
      let after = before;
      if (extendValidity) {
        // Months are added after the current validity, or from today when it already passed
        const today = todaySaoPaulo();
        after = addMonths(before && before > today ? before : today, monthsCovered);
        await tx.update(companies).set({ accessValidUntil: after }).where(eq(companies.id, id));
      }
      const [payment] = await tx
        .insert(subscriptionPayments)
        .values({
          companyId: id,
          amount: amount.toFixed(2),
          paidAt,
          referenceMonth,
          monthsCovered,
          method,
          notes: notes || null,
          validUntilAfter: after,
          createdBy: req.user!.id,
        })
        .returning();
      await recordSubscriptionEvent(
        id,
        "payment_added",
        { paymentId: payment.id, amount: Number(payment.amount), paidAt, referenceMonth, monthsCovered, method, validUntilBefore: before, validUntilAfter: after },
        req.user!.id,
        tx
      );
      return { payment, accessValidUntil: after };
    });
    if (!result) return res.status(404).json({ message: "Empresa não encontrada." });
    const { companyId, createdBy, ...payment } = result.payment;
    res.status(201).json({
      payment: serializePayment({ ...payment, createdById: createdBy, createdByName: req.user!.fullName }),
      accessValidUntil: result.accessValidUntil,
    });
  } catch (error) {
    console.error("POST /api/platform/companies/:id/payments:", error);
    res.status(500).json({ message: "Erro ao registrar pagamento." });
  }
});

// DELETE /api/platform/companies/:id/payments/:paymentId — removes a payment (the validity stays as is)
router.delete("/companies/:id/payments/:paymentId", async (req, res) => {
  const id = parseId(req.params.id);
  const paymentId = parseId(req.params.paymentId);
  if (!id || !paymentId) return res.status(400).json({ message: "Pagamento inválido." });

  try {
    const [deleted] = await db
      .delete(subscriptionPayments)
      .where(and(eq(subscriptionPayments.id, paymentId), eq(subscriptionPayments.companyId, id)))
      .returning();
    if (!deleted) return res.status(404).json({ message: "Pagamento não encontrado." });
    await recordSubscriptionEvent(
      id,
      "payment_removed",
      {
        paymentId: deleted.id,
        amount: Number(deleted.amount),
        paidAt: deleted.paidAt,
        referenceMonth: deleted.referenceMonth,
        monthsCovered: deleted.monthsCovered,
        method: deleted.method,
        notes: deleted.notes,
        validUntilAfter: deleted.validUntilAfter,
      },
      req.user!.id
    );
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /api/platform/companies/:id/payments/:paymentId:", error);
    res.status(500).json({ message: "Erro ao remover pagamento." });
  }
});

// GET /api/platform/payments?from&to — payments of every company in the period
router.get("/payments", async (req, res) => {
  const period = parsePeriod(req.query);
  if (period.error) return res.status(400).json(period.error);

  try {
    const rows = await db
      .select({ ...paymentColumns, companyId: companies.id, companyName: companies.name })
      .from(subscriptionPayments)
      .innerJoin(companies, eq(subscriptionPayments.companyId, companies.id))
      .leftJoin(users, eq(subscriptionPayments.createdBy, users.id))
      .where(and(gte(subscriptionPayments.paidAt, period.from), lte(subscriptionPayments.paidAt, period.to)))
      .orderBy(desc(subscriptionPayments.paidAt), desc(subscriptionPayments.id));
    res.json(rows.map(({ companyId, companyName, ...p }) => ({ ...serializePayment(p), company: { id: companyId, name: companyName } })));
  } catch (error) {
    console.error("GET /api/platform/payments:", error);
    res.status(500).json({ message: "Erro ao carregar pagamentos." });
  }
});

// GET /api/platform/admins — clinic admins (active admin membership) and their clinics
router.get("/admins", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        createdAt: users.createdAt,
        clinicId: companies.id,
        clinicName: companies.name,
        clinicStatus: companies.status,
        since: companyMemberships.createdAt,
        accessValidUntil: companies.accessValidUntil,
      })
      .from(companyMemberships)
      .innerJoin(users, eq(companyMemberships.userId, users.id))
      .innerJoin(companies, eq(companyMemberships.companyId, companies.id))
      .where(and(eq(companyMemberships.role, "admin"), eq(companyMemberships.status, "active")))
      .orderBy(asc(users.fullName), asc(users.id), asc(companies.name));

    const admins = new Map<number, { id: number; fullName: string; email: string | null; createdAt: Date | null; clinics: object[] }>();
    for (const r of rows) {
      let admin = admins.get(r.id);
      if (!admin) {
        admin = { id: r.id, fullName: r.fullName, email: r.email, createdAt: r.createdAt, clinics: [] };
        admins.set(r.id, admin);
      }
      admin.clinics.push({
        id: r.clinicId,
        name: r.clinicName,
        status: r.clinicStatus,
        since: r.since,
        accessValidUntil: r.accessValidUntil,
        accessExpired: isAccessExpired(r.accessValidUntil),
      });
    }
    res.json(Array.from(admins.values()));
  } catch (error) {
    console.error("GET /api/platform/admins:", error);
    res.status(500).json({ message: "Erro ao carregar administradores." });
  }
});

export default router;
