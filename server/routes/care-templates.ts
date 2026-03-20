import { Router } from "express";
import { db } from "../db";
import {
  careTemplates,
  careTemplateQuestions,
  careDispatches,
  insertCareTemplateSchema,
  insertCareTemplateQuestionSchema,
} from "@shared/patient-schema";
import { eq, or, isNull, and, count } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const checkAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
  next();
};
router.use(checkAuth);

// ── GET /api/care/templates — list own + system default templates ──────────
router.get("/", async (req, res) => {
  try {
    const userId = (req.user as any).id;

    const templates = await db
      .select()
      .from(careTemplates)
      .where(or(eq(careTemplates.psychologistId, userId), isNull(careTemplates.psychologistId)));

    // Attach question count
    const result = await Promise.all(
      templates.map(async (t) => {
        const [{ value }] = await db
          .select({ value: count() })
          .from(careTemplateQuestions)
          .where(eq(careTemplateQuestions.templateId, t.id));
        return { ...t, questionCount: Number(value) };
      })
    );

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao listar templates" });
  }
});

// ── POST /api/care/templates — create template (with optional questions) ──
router.post("/", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { questions = [], ...body } = req.body;

    const templateData = insertCareTemplateSchema.parse({
      ...body,
      psychologistId: userId,
      isDefault: false,
    });

    const [template] = await db.insert(careTemplates).values(templateData).returning();

    if (Array.isArray(questions) && questions.length > 0) {
      const qs = questions.map((q: any, i: number) =>
        insertCareTemplateQuestionSchema.parse({ ...q, templateId: template.id, orderIndex: q.orderIndex ?? i })
      );
      await db.insert(careTemplateQuestions).values(qs);
    }

    const allQuestions = await db
      .select()
      .from(careTemplateQuestions)
      .where(eq(careTemplateQuestions.templateId, template.id))
      .orderBy(careTemplateQuestions.orderIndex);

    res.status(201).json({ ...template, questions: allQuestions });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao criar template" });
  }
});

// ── GET /api/care/templates/:id — detail with questions ──────────────────
router.get("/:id", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);

    const [template] = await db
      .select()
      .from(careTemplates)
      .where(
        and(
          eq(careTemplates.id, id),
          or(eq(careTemplates.psychologistId, userId), isNull(careTemplates.psychologistId))
        )
      );

    if (!template) return res.status(404).json({ message: "Template não encontrado" });

    const questions = await db
      .select()
      .from(careTemplateQuestions)
      .where(eq(careTemplateQuestions.templateId, id))
      .orderBy(careTemplateQuestions.orderIndex);

    res.json({ ...template, questions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao buscar template" });
  }
});

// ── PATCH /api/care/templates/:id — update template metadata ─────────────
router.patch("/:id", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);

    const [template] = await db
      .select()
      .from(careTemplates)
      .where(and(eq(careTemplates.id, id), eq(careTemplates.psychologistId, userId)));

    if (!template) return res.status(404).json({ message: "Template não encontrado" });

    const updateData = insertCareTemplateSchema.partial().parse(req.body);
    const [updated] = await db
      .update(careTemplates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(careTemplates.id, id))
      .returning();

    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao atualizar template" });
  }
});

// ── DELETE /api/care/templates/:id — delete if no dispatches ─────────────
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);

    const [template] = await db
      .select()
      .from(careTemplates)
      .where(and(eq(careTemplates.id, id), eq(careTemplates.psychologistId, userId)));

    if (!template) return res.status(404).json({ message: "Template não encontrado" });

    const [{ value: dispatchCount }] = await db
      .select({ value: count() })
      .from(careDispatches)
      .where(eq(careDispatches.templateId, id));

    if (Number(dispatchCount) > 0) {
      return res.status(409).json({
        message: "Não é possível excluir este template pois ele possui envios vinculados.",
      });
    }

    await db.delete(careTemplates).where(eq(careTemplates.id, id));
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao excluir template" });
  }
});

// ── POST /api/care/templates/:id/questions — add question ─────────────────
router.post("/:id/questions", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const templateId = parseInt(req.params.id);

    const [template] = await db
      .select()
      .from(careTemplates)
      .where(
        and(
          eq(careTemplates.id, templateId),
          or(eq(careTemplates.psychologistId, userId), isNull(careTemplates.psychologistId))
        )
      );
    if (!template) return res.status(404).json({ message: "Template não encontrado" });

    const data = insertCareTemplateQuestionSchema.parse({ ...req.body, templateId });
    const [q] = await db.insert(careTemplateQuestions).values(data).returning();
    res.status(201).json(q);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao adicionar pergunta" });
  }
});

// ── PATCH /api/care/templates/:id/questions/:qId — edit question ──────────
router.patch("/:id/questions/:qId", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const templateId = parseInt(req.params.id);
    const qId = parseInt(req.params.qId);

    const [template] = await db
      .select()
      .from(careTemplates)
      .where(
        and(
          eq(careTemplates.id, templateId),
          or(eq(careTemplates.psychologistId, userId), isNull(careTemplates.psychologistId))
        )
      );
    if (!template) return res.status(404).json({ message: "Template não encontrado" });

    const data = insertCareTemplateQuestionSchema.partial().parse(req.body);
    const [updated] = await db
      .update(careTemplateQuestions)
      .set(data)
      .where(and(eq(careTemplateQuestions.id, qId), eq(careTemplateQuestions.templateId, templateId)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Pergunta não encontrada" });
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao atualizar pergunta" });
  }
});

// ── DELETE /api/care/templates/:id/questions/:qId — remove question ───────
router.delete("/:id/questions/:qId", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const templateId = parseInt(req.params.id);
    const qId = parseInt(req.params.qId);

    const [template] = await db
      .select()
      .from(careTemplates)
      .where(
        and(
          eq(careTemplates.id, templateId),
          or(eq(careTemplates.psychologistId, userId), isNull(careTemplates.psychologistId))
        )
      );
    if (!template) return res.status(404).json({ message: "Template não encontrado" });

    await db
      .delete(careTemplateQuestions)
      .where(and(eq(careTemplateQuestions.id, qId), eq(careTemplateQuestions.templateId, templateId)));

    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao remover pergunta" });
  }
});

export default router;
