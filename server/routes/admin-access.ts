import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { accessInvites, users } from "@shared/schema";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth-guards";
import { normalizeEmail } from "../lib/access-invites";

// Mounted at /api/admin — administrators of the system and e-mails pre-authorized as admin.
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

// GET /api/admin/admins — current admins + pending invites
router.get("/admins", requireAdmin, async (_req, res) => {
  try {
    const admins = await db.select(adminColumns).from(users).where(eq(users.role, "admin")).orderBy(users.fullName);
    const invites = await db
      .select({ id: accessInvites.id, email: accessInvites.email, role: accessInvites.role, createdAt: accessInvites.createdAt })
      .from(accessInvites)
      .where(and(isNull(accessInvites.acceptedAt), eq(accessInvites.role, "admin")))
      .orderBy(desc(accessInvites.createdAt));
    res.json({ admins, invites });
  } catch (error) {
    console.error("GET /api/admin/admins:", error);
    res.status(500).json({ message: "Erro ao carregar administradores." });
  }
});

// POST /api/admin/admins { email } — promote an existing account or pre-authorize the e-mail
router.post("/admins", requireAdmin, async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const email = normalizeEmail(parsed.data.email);

  try {
    const [existing] = await db.select(adminColumns).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
    if (existing) {
      const [current] = await db.select({ role: users.role }).from(users).where(eq(users.id, existing.id));
      if (current?.role === "admin") return res.status(409).json({ message: "Este e-mail já é administrador." });
      await db.update(users).set({ role: "admin", status: "active" }).where(eq(users.id, existing.id));
      return res.status(200).json({ type: "promoted", admin: { ...existing, status: "active" } });
    }

    const [pending] = await db
      .select({ id: accessInvites.id })
      .from(accessInvites)
      .where(and(sql`lower(${accessInvites.email}) = ${email}`, isNull(accessInvites.acceptedAt), isNull(accessInvites.companyId)))
      .limit(1);
    if (pending) return res.status(409).json({ message: "Este e-mail já está pré-autorizado." });

    // A previously accepted invite for the same e-mail would hit the unique index; reuse it.
    await db
      .delete(accessInvites)
      .where(and(sql`lower(${accessInvites.email}) = ${email}`, isNull(accessInvites.companyId)));
    const [invite] = await db
      .insert(accessInvites)
      .values({ email, role: "admin", invitedByUserId: req.user!.id })
      .returning({ id: accessInvites.id, email: accessInvites.email, role: accessInvites.role, createdAt: accessInvites.createdAt });
    res.status(201).json({ type: "invited", invite });
  } catch (error) {
    console.error("POST /api/admin/admins:", error);
    res.status(500).json({ message: "Erro ao adicionar administrador." });
  }
});

// DELETE /api/admin/admins/:userId — demote an admin back to psychologist
router.delete("/admins/:userId", requireAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) return res.status(400).json({ message: "Usuário inválido." });
  if (userId === req.user!.id) return res.status(400).json({ message: "Você não pode remover o seu próprio acesso de administrador." });

  try {
    const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
    if (!target || target.role !== "admin") return res.status(404).json({ message: "Administrador não encontrado." });
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.status, "active"), ne(users.id, userId)));
    if (count === 0) return res.status(400).json({ message: "O sistema precisa de pelo menos um administrador." });

    await db.update(users).set({ role: "psychologist" }).where(eq(users.id, userId));
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /api/admin/admins:", error);
    res.status(500).json({ message: "Erro ao remover administrador." });
  }
});

// DELETE /api/admin/invites/:id — cancel a pending pre-authorization
router.delete("/invites/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: "Convite inválido." });
  try {
    const deleted = await db
      .delete(accessInvites)
      .where(and(eq(accessInvites.id, id), isNull(accessInvites.acceptedAt)))
      .returning({ id: accessInvites.id });
    if (deleted.length === 0) return res.status(404).json({ message: "Convite não encontrado." });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /api/admin/invites:", error);
    res.status(500).json({ message: "Erro ao cancelar convite." });
  }
});

export default router;
