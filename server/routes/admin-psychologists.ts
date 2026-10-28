import { Router } from "express";
import { db } from "../db";
import {
  users,
  psychologists,
  specializationAreas,
  psychologistSpecializations,
  companyMemberships,
} from "@shared/schema";
import { patients, clinicalSessions } from "@shared/schema";
import { eq, and, ne, sql } from "drizzle-orm";

const router = Router();

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado." });
  const user = req.user as { role: string };
  if (user.role !== "admin") return res.status(403).json({ error: "Acesso restrito ao administrador." });
  next();
}

router.use(requireAdmin);

function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function monthsAgo(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}

// Psychologist profiles are per company; the user's status here is their membership's.
async function findPsych(companyId: number, id: number) {
  const [psych] = await db
    .select()
    .from(psychologists)
    .where(and(eq(psychologists.id, id), eq(psychologists.companyId, companyId)));
  return psych;
}

async function findUserInCompany(companyId: number, userId: number) {
  const [row] = await db
    .select({ user: users, membershipStatus: companyMemberships.status })
    .from(users)
    .leftJoin(
      companyMemberships,
      and(eq(companyMemberships.userId, users.id), eq(companyMemberships.companyId, companyId))
    )
    .where(eq(users.id, userId));
  if (!row) return undefined;
  const { password, ...safeUser } = row.user;
  return { ...safeUser, status: row.membershipStatus ?? "inactive" };
}

/** Name/e-mail belong to the person's account: another clinic's admin must not change them. */
async function isInOtherCompany(companyId: number, userId: number) {
  const [other] = await db
    .select({ id: companyMemberships.id })
    .from(companyMemberships)
    .where(and(eq(companyMemberships.userId, userId), ne(companyMemberships.companyId, companyId)))
    .limit(1);
  return !!other;
}

/**
 * (De)activates the person in this company only. Activating also re-enables the account,
 * which may have been deactivated before companies existed.
 */
async function setStatusInCompany(companyId: number, userId: number, status: "active" | "inactive") {
  await db
    .update(companyMemberships)
    .set({ status })
    .where(and(eq(companyMemberships.userId, userId), eq(companyMemberships.companyId, companyId)));
  if (status === "active") {
    await db.update(users).set({ status: "active" }).where(eq(users.id, userId));
  }
}

async function getSpecializationsForPsych(psychId: number) {
  return db
    .select({ id: specializationAreas.id, name: specializationAreas.name, category: specializationAreas.category })
    .from(psychologistSpecializations)
    .innerJoin(specializationAreas, eq(psychologistSpecializations.specializationAreaId, specializationAreas.id))
    .where(eq(psychologistSpecializations.psychologistId, psychId));
}

// GET /api/admin/psychologists
router.get("/", async (req, res) => {
  try {
    const { search, status, specializationId } = req.query as Record<string, string>;

    const rows = await db
      .select({ psych: psychologists, user: users, membershipStatus: companyMemberships.status })
      .from(psychologists)
      .innerJoin(users, eq(psychologists.userId, users.id))
      .leftJoin(
        companyMemberships,
        and(eq(companyMemberships.userId, users.id), eq(companyMemberships.companyId, req.companyId!))
      )
      .where(eq(psychologists.companyId, req.companyId!))
      .orderBy(users.fullName);
    let psychList = rows.map((r) => ({ psych: r.psych, user: { ...r.user, status: r.membershipStatus ?? "inactive" } }));

    if (search) {
      const lower = search.toLowerCase();
      psychList = psychList.filter(
        (r) =>
          r.user.fullName.toLowerCase().includes(lower) ||
          r.user.email.toLowerCase().includes(lower)
      );
    }

    if (status === "active") {
      psychList = psychList.filter((r) => r.user.status === "active");
    } else if (status === "inactive") {
      psychList = psychList.filter((r) => r.user.status !== "active");
    }

    const result = await Promise.all(
      psychList.map(async ({ psych, user }) => {
        const specs = await getSpecializationsForPsych(psych.id);

        if (specializationId && !specs.some((s) => s.id === parseInt(specializationId))) {
          return null;
        }

        const activePatientsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(patients)
          .where(and(eq(patients.psychologistId, psych.id), eq(patients.status, "active")));

        const sessionsCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(clinicalSessions)
          .where(eq(clinicalSessions.psychologistId, psych.id));

        const { password, ...safeUser } = user;
        return {
          ...psych,
          user: safeUser,
          age: calcAge(user.birthDate),
          specializations: specs,
          activePatientsCount: Number(activePatientsCount[0]?.count ?? 0),
          sessionsCount: Number(sessionsCount[0]?.count ?? 0),
          monthsAtClinic: monthsAgo(psych.startedAtClinic ?? undefined),
        };
      })
    );

    return res.json(result.filter(Boolean));
  } catch (e) {
    console.error("GET /api/admin/psychologists error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// GET /api/admin/psychologists/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const psych = await findPsych(req.companyId!, id);
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    const user = await findUserInCompany(req.companyId!, psych.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const specs = await getSpecializationsForPsych(psych.id);

    const activePatientsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(and(eq(patients.psychologistId, psych.id), eq(patients.status, "active")));

    const sessionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(clinicalSessions)
      .where(eq(clinicalSessions.psychologistId, psych.id));

    return res.json({
      ...psych,
      user,
      age: calcAge(user.birthDate),
      specializations: specs,
      activePatientsCount: Number(activePatientsCount[0]?.count ?? 0),
      sessionsCount: Number(sessionsCount[0]?.count ?? 0),
      monthsAtClinic: monthsAgo(psych.startedAtClinic ?? undefined),
    });
  } catch (e) {
    console.error("GET /api/admin/psychologists/:id error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// PATCH /api/admin/psychologists/:id — editar dados (incluindo campos exclusivos do admin)
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const companyId = req.companyId!;
    const psych = await findPsych(companyId, id);
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    const { fullName, email, birthDate, status, phone, crpNumber, bio, startedAtClinic } = req.body;

    // Update users table (the account, shared by every clinic the person is in)
    const userUpdate: Record<string, any> = {};
    if (fullName !== undefined) userUpdate.fullName = fullName;
    if (email !== undefined) userUpdate.email = email;
    if (birthDate !== undefined) userUpdate.birthDate = birthDate || null;
    if (Object.keys(userUpdate).length > 0) {
      if (await isInOtherCompany(companyId, psych.userId)) {
        return res.status(409).json({
          error: "Esta psicóloga também atende em outra clínica: nome, e-mail e nascimento só podem ser alterados por ela, em Meu Perfil.",
        });
      }
      await db.update(users).set(userUpdate).where(eq(users.id, psych.userId));
    }
    if (status !== undefined) {
      await setStatusInCompany(companyId, psych.userId, status === "active" ? "active" : "inactive");
    }

    // Update psychologists table
    const psychUpdate: Record<string, any> = {};
    if (phone !== undefined) psychUpdate.phone = phone || null;
    if (crpNumber !== undefined) psychUpdate.crpNumber = crpNumber || null;
    if (bio !== undefined) psychUpdate.bio = bio || null;
    if (startedAtClinic !== undefined) psychUpdate.startedAtClinic = startedAtClinic || null;
    if (Object.keys(psychUpdate).length > 0) {
      await db.update(psychologists).set(psychUpdate).where(eq(psychologists.id, id));
    }

    const updatedUser = (await findUserInCompany(companyId, psych.userId))!;
    const updatedPsych = await findPsych(companyId, id);
    const specs = await getSpecializationsForPsych(id);

    return res.json({
      ...updatedPsych,
      user: updatedUser,
      age: calcAge(updatedUser.birthDate),
      specializations: specs,
    });
  } catch (e) {
    console.error("PATCH /api/admin/psychologists/:id error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// PUT /api/admin/psychologists/:id/specializations
router.put("/:id/specializations", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { specializationIds } = req.body as { specializationIds: number[] };

    if (!Array.isArray(specializationIds)) {
      return res.status(400).json({ error: "specializationIds deve ser um array." });
    }

    const psych = await findPsych(req.companyId!, id);
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    await db.delete(psychologistSpecializations).where(eq(psychologistSpecializations.psychologistId, id));

    if (specializationIds.length > 0) {
      await db.insert(psychologistSpecializations).values(
        specializationIds.map((sid) => ({ psychologistId: id, specializationAreaId: sid }))
      );
    }

    const specs = await getSpecializationsForPsych(id);
    return res.json({ specializations: specs });
  } catch (e) {
    console.error("PUT /api/admin/psychologists/:id/specializations error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// POST /api/admin/psychologists/:id/toggle-active
router.post("/:id/toggle-active", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const psych = await findPsych(req.companyId!, id);
    if (!psych) return res.status(404).json({ error: "Psicóloga não encontrada." });

    const user = await findUserInCompany(req.companyId!, psych.userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    const newStatus = user.status === "active" ? "inactive" : "active";
    await setStatusInCompany(req.companyId!, psych.userId, newStatus);

    return res.json({ status: newStatus, isActive: newStatus === "active" });
  } catch (e) {
    console.error("POST /api/admin/psychologists/:id/toggle-active error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

export default router;
