import { Router } from "express";
import { db } from "../db";
import {
  users,
  psychologists,
  specializationAreas,
  psychologistSpecializations,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, `avatar-${unique}${path.extname(file.originalname)}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error("Apenas imagens JPEG, PNG ou WEBP são permitidas."));
  },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado." });
  next();
}

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

router.use(requireAuth);

// GET /api/profile — perfil completo da psicóloga logada
router.get("/", async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const [userData] = await db.select().from(users).where(eq(users.id, user.id));
    if (!userData) return res.status(404).json({ error: "Usuário não encontrado." });

    const [psychData] = await db
      .select()
      .from(psychologists)
      .where(eq(psychologists.userId, user.id));

    let specializations: { id: number; name: string; category: string | null }[] = [];
    if (psychData) {
      const rows = await db
        .select({ id: specializationAreas.id, name: specializationAreas.name, category: specializationAreas.category })
        .from(psychologistSpecializations)
        .innerJoin(specializationAreas, eq(psychologistSpecializations.specializationAreaId, specializationAreas.id))
        .where(eq(psychologistSpecializations.psychologistId, psychData.id));
      specializations = rows;
    }

    const { password, ...safeUser } = userData;
    return res.json({
      ...safeUser,
      psychologist: psychData || null,
      age: calcAge(userData.birthDate),
      specializations,
    });
  } catch (e) {
    console.error("GET /api/profile error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// PATCH /api/profile — atualizar dados básicos (sem startedAtClinic)
router.patch("/", async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const { fullName, phone, birthDate, crpNumber, bio } = req.body;

    // Update users table fields
    const userUpdate: Record<string, any> = {};
    if (fullName !== undefined) userUpdate.fullName = fullName;
    if (birthDate !== undefined) userUpdate.birthDate = birthDate || null;

    if (Object.keys(userUpdate).length > 0) {
      await db.update(users).set(userUpdate).where(eq(users.id, user.id));
    }

    // Update psychologist table fields
    const psychUpdate: Record<string, any> = {};
    if (phone !== undefined) psychUpdate.phone = phone || null;
    if (crpNumber !== undefined) psychUpdate.crpNumber = crpNumber || null;
    if (bio !== undefined) psychUpdate.bio = bio || null;

    if (Object.keys(psychUpdate).length > 0) {
      const [existing] = await db.select().from(psychologists).where(eq(psychologists.userId, user.id));
      if (existing) {
        await db.update(psychologists).set(psychUpdate).where(eq(psychologists.userId, user.id));
      }
    }

    const [updated] = await db.select().from(users).where(eq(users.id, user.id));
    const [updatedPsych] = await db.select().from(psychologists).where(eq(psychologists.userId, user.id));
    const { password, ...safeUser } = updated;
    return res.json({ ...safeUser, psychologist: updatedPsych || null, age: calcAge(updated.birthDate) });
  } catch (e) {
    console.error("PATCH /api/profile error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// PUT /api/profile/specializations — substituir especializações da psicóloga logada
router.put("/specializations", async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const { specializationIds } = req.body as { specializationIds: number[] };

    if (!Array.isArray(specializationIds)) {
      return res.status(400).json({ error: "specializationIds deve ser um array." });
    }

    const [psych] = await db.select().from(psychologists).where(eq(psychologists.userId, user.id));
    if (!psych) return res.status(404).json({ error: "Perfil de psicóloga não encontrado." });

    await db.delete(psychologistSpecializations).where(eq(psychologistSpecializations.psychologistId, psych.id));

    if (specializationIds.length > 0) {
      await db.insert(psychologistSpecializations).values(
        specializationIds.map((id) => ({ psychologistId: psych.id, specializationAreaId: id }))
      );
    }

    const rows = await db
      .select({ id: specializationAreas.id, name: specializationAreas.name, category: specializationAreas.category })
      .from(psychologistSpecializations)
      .innerJoin(specializationAreas, eq(psychologistSpecializations.specializationAreaId, specializationAreas.id))
      .where(eq(psychologistSpecializations.psychologistId, psych.id));

    return res.json({ specializations: rows });
  } catch (e) {
    console.error("PUT /api/profile/specializations error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// POST /api/profile/avatar — upload de foto
router.post(
  "/avatar",
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Arquivo muito grande. Máximo 5MB." });
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const user = req.user as { id: number; role: string };
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });

      const [existingUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (!existingUser) return res.status(404).json({ error: "Usuário não encontrado." });

      if (existingUser.profileImage) {
        try {
          const oldPath = path.join(process.cwd(), existingUser.profileImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch {}
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      await db.update(users).set({ profileImage: imageUrl }).where(eq(users.id, user.id));

      return res.json({ profileImage: imageUrl });
    } catch (e) {
      console.error("POST /api/profile/avatar error:", e);
      return res.status(500).json({ error: "Erro interno." });
    }
  }
);

export default router;
