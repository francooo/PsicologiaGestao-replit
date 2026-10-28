import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { accessInvites, companyMemberships, users } from "@shared/schema";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { requireAdmin, requireCompany } from "../middleware/auth-guards";
import { normalizeEmail } from "../lib/access-invites";
import { upsertMembership } from "../lib/companies";

// Mounted at /api/admin — administrators of the active company and e-mails pre-authorized as admin there.
const router = Router();

const adminColumns = {
  id: users.id,
  fullName: users.fullName,
  email: users.email,
  username: users.username,
  status: users.status,
  avatarUrl: users.avatarUrl,
};

const emailSchema = z.object({ email: z.string().trim().email("Informe um e-mail válido.") });

const isCompanyAdmin = (companyId: number) =>
  and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.role, "admin"), eq(companyMemberships.status, "active"));

// GET /api/admin/admins — current admins + pending invites
router.get("/admins", requireCompany, requireAdmin, async (req, res) => {
  const companyId = req.companyId!;
  try {
    const admins = await db
      .select(adminColumns)
      .from(companyMemberships)
      .innerJoin(users, eq(companyMemberships.userId, users.id))
      .where(isCompanyAdmin(companyId))
      .orderBy(users.fullName);
    const invites = await db
      .select({ id: accessInvites.id, email: accessInvites.email, role: accessInvites.role, createdAt: accessInvites.createdAt })
      .from(accessInvites)
      .where(and(isNull(accessInvites.acceptedAt), eq(accessInvites.role, "admin"), eq(accessInvites.companyId, companyId)))
      .orderBy(desc(accessInvites.createdAt));
    res.json({ admins, invites });
  } catch (error) {
    console.error("GET /api/admin/admins:", error);
    res.status(500).json({ message: "Erro ao carregar administradores." });
  }
});

// POST /api/admin/admins { email } — promote an existing account or pre-authorize the e-mail
router.post("/admins", requireCompany, requireAdmin, async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const email = normalizeEmail(parsed.data.email);
  const companyId = req.companyId!;

  try {
    const [existing] = await db.select(adminColumns).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
    if (existing) {
      const [current] = await db
        .select({ id: companyMemberships.id })
        .from(companyMemberships)
        .where(and(isCompanyAdmin(companyId), eq(companyMemberships.userId, existing.id)));
      if (current) return res.status(409).json({ message: "Este e-mail já é administrador." });
      await upsertMembership(existing.id, companyId, "admin");
      await db.update(users).set({ status: "active" }).where(eq(users.id, existing.id));
      return res.status(200).json({ type: "promoted", admin: { ...existing, status: "active" } });
    }

    const sameInvite = and(sql`lower(${accessInvites.email}) = ${email}`, eq(accessInvites.companyId, companyId));
    const [pending] = await db
      .select({ id: accessInvites.id })
      .from(accessInvites)
      .where(and(sameInvite, isNull(accessInvites.acceptedAt)))
      .limit(1);
    if (pending) return res.status(409).json({ message: "Este e-mail já está pré-autorizado." });

    // A previously accepted invite for the same e-mail would hit the unique index; reuse it.
    await db.delete(accessInvites).where(sameInvite);
    const [invite] = await db
      .insert(accessInvites)
      .values({ email, role: "admin", companyId, invitedByUserId: req.user!.id })
      .returning({ id: accessInvites.id, email: accessInvites.email, role: accessInvites.role, createdAt: accessInvites.createdAt });
    res.status(201).json({ type: "invited", invite });
  } catch (error) {
    console.error("POST /api/admin/admins:", error);
    res.status(500).json({ message: "Erro ao adicionar administrador." });
  }
});

// DELETE /api/admin/admins/:userId — demote an admin back to psychologist (in this company)
router.delete("/admins/:userId", requireCompany, requireAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const companyId = req.companyId!;
  if (!Number.isInteger(userId)) return res.status(400).json({ message: "Usuário inválido." });
  if (userId === req.user!.id) return res.status(400).json({ message: "Você não pode remover o seu próprio acesso de administrador." });

  try {
    const [target] = await db
      .select({ id: companyMemberships.id })
      .from(companyMemberships)
      .where(and(isCompanyAdmin(companyId), eq(companyMemberships.userId, userId)));
    if (!target) return res.status(404).json({ message: "Administrador não encontrado." });
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(companyMemberships)
      .innerJoin(users, eq(companyMemberships.userId, users.id))
      .where(and(isCompanyAdmin(companyId), eq(users.status, "active"), ne(users.id, userId)));
    if (count === 0) return res.status(400).json({ message: "A empresa precisa de pelo menos um administrador." });

    await db.update(companyMemberships).set({ role: "psychologist" }).where(eq(companyMemberships.id, target.id));
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /api/admin/admins:", error);
    res.status(500).json({ message: "Erro ao remover administrador." });
  }
});

// DELETE /api/admin/invites/:id — cancel a pending pre-authorization
router.delete("/invites/:id", requireCompany, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Convite inválido." });
  try {
    const deleted = await db
      .delete(accessInvites)
      .where(and(eq(accessInvites.id, id), eq(accessInvites.companyId, req.companyId!), isNull(accessInvites.acceptedAt)))
      .returning({ id: accessInvites.id });
    if (deleted.length === 0) return res.status(404).json({ message: "Convite não encontrado." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /api/admin/invites:", error);
    res.status(500).json({ message: "Erro ao cancelar convite." });
  }
});

export default router;
