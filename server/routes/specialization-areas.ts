import { Router } from "express";
import { db } from "../db";
import { specializationAreas } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Não autenticado." });
  next();
}

router.use(requireAuth);

// GET /api/specialization-areas — listar todas agrupadas por categoria
router.get("/", async (_req, res) => {
  try {
    const areas = await db
      .select()
      .from(specializationAreas)
      .orderBy(specializationAreas.category, specializationAreas.name);

    const grouped: Record<string, { id: number; name: string; isCustom: boolean }[]> = {};
    for (const area of areas) {
      const cat = area.category || "Outras";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ id: area.id, name: area.name, isCustom: area.isCustom });
    }
    return res.json(grouped);
  } catch (e) {
    console.error("GET /api/specialization-areas error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

// POST /api/specialization-areas — criar área personalizada
router.post("/", async (req, res) => {
  try {
    const { name, category } = req.body as { name: string; category?: string };
    if (!name || !name.trim()) return res.status(400).json({ error: "Nome é obrigatório." });

    const [existing] = await db
      .select()
      .from(specializationAreas)
      .where(eq(specializationAreas.name, name.trim()));

    if (existing) return res.json(existing);

    const [created] = await db
      .insert(specializationAreas)
      .values({ name: name.trim(), category: category || "Personalizada", isCustom: true })
      .returning();

    return res.status(201).json(created);
  } catch (e) {
    console.error("POST /api/specialization-areas error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});

export default router;
