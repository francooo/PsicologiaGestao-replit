import { Router } from "express";
import { db } from "../db";
import {
  careDispatches,
  careDispatchQuestions,
  careResponses,
  patients,
} from "@shared/patient-schema";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Public routes — no authentication required

// ── GET /api/care/respond/:token — fetch form for patient ─────────────────
router.get("/respond/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [dispatch] = await db
      .select()
      .from(careDispatches)
      .where(eq(careDispatches.responseToken, token));

    if (!dispatch) {
      return res.status(404).json({ error: "not_found", message: "Formulário não encontrado." });
    }

    if (new Date() > dispatch.tokenExpiresAt) {
      // Mark as expired if not already
      if (dispatch.status !== "expired" && dispatch.status !== "answered") {
        await db
          .update(careDispatches)
          .set({ status: "expired" })
          .where(eq(careDispatches.id, dispatch.id));
      }
      return res.status(410).json({
        error: "expired",
        message: "Este link expirou. Entre em contato com sua psicóloga para receber um novo formulário.",
      });
    }

    if (dispatch.status === "answered") {
      return res.status(409).json({
        error: "already_answered",
        message: "Você já respondeu este formulário. Obrigada pela sua participação! 💚",
      });
    }

    // Mark as opened on first visit
    if (dispatch.status === "sent") {
      await db
        .update(careDispatches)
        .set({ status: "opened", openedAt: new Date() })
        .where(eq(careDispatches.id, dispatch.id));
    }

    const questions = await db
      .select()
      .from(careDispatchQuestions)
      .where(eq(careDispatchQuestions.dispatchId, dispatch.id))
      .orderBy(careDispatchQuestions.orderIndex);

    // Fetch patient (only expose first name + email for privacy)
    const [patient] = await db
      .select({ firstName: patients.fullName })
      .from(patients)
      .where(eq(patients.id, dispatch.patientId));

    // Fetch psychologist name (only name)
    const [psychUser] = await db
      .select({ fullName: users.fullName, username: users.username })
      .from(users)
      .where(eq(users.id, dispatch.psychologistId));

    const clinicName = process.env.CLINIC_NAME || "ConsultaPsi";
    const patientFirstName = patient?.firstName?.split(" ")[0] ?? "Paciente";
    const psychologistName = psychUser?.fullName || psychUser?.username || "sua psicóloga";

    return res.json({
      clinicName,
      patientFirstName,
      psychologistName,
      subject: dispatch.subject,
      customMessage: dispatch.customMessage,
      questions,
    });
  } catch (e) {
    console.error("care respond GET error:", e);
    res.status(500).json({ message: "Erro ao buscar formulário" });
  }
});

// ── POST /api/care/respond/:token — submit patient answers ────────────────
const answerSchema = z.object({
  answers: z.array(
    z.object({
      dispatch_question_id: z.number().int().positive(),
      answer_text: z.string().optional().nullable(),
      answer_choice: z.string().optional().nullable(),
      answer_scale: z.number().int().min(1).max(10).optional().nullable(),
    })
  ),
});

router.post("/respond/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const [dispatch] = await db
      .select()
      .from(careDispatches)
      .where(eq(careDispatches.responseToken, token));

    if (!dispatch) {
      return res.status(404).json({ error: "not_found", message: "Formulário não encontrado." });
    }

    if (new Date() > dispatch.tokenExpiresAt) {
      return res.status(410).json({
        error: "expired",
        message: "Este link expirou.",
      });
    }

    if (dispatch.status === "answered") {
      return res.status(409).json({
        error: "already_answered",
        message: "Você já respondeu este formulário.",
      });
    }

    const parsed = answerSchema.parse(req.body);
    const { answers } = parsed;

    // Fetch questions to validate required ones
    const questions = await db
      .select()
      .from(careDispatchQuestions)
      .where(eq(careDispatchQuestions.dispatchId, dispatch.id));

    for (const q of questions.filter((q) => q.isRequired)) {
      const answer = answers.find((a) => a.dispatch_question_id === q.id);
      const hasValue =
        (answer?.answer_text && answer.answer_text.trim()) ||
        (answer?.answer_choice && answer.answer_choice.trim()) ||
        answer?.answer_scale != null;
      if (!hasValue) {
        return res.status(422).json({
          error: "missing_required",
          message: `A pergunta "${q.questionText}" é obrigatória.`,
        });
      }
    }

    // Save responses
    if (answers.length > 0) {
      await db.insert(careResponses).values(
        answers.map((a) => ({
          dispatchId: dispatch.id,
          dispatchQuestionId: a.dispatch_question_id,
          answerText: a.answer_text ?? null,
          answerChoice: a.answer_choice ?? null,
          answerScale: a.answer_scale ?? null,
        }))
      );
    }

    // Mark dispatch as answered
    await db
      .update(careDispatches)
      .set({ status: "answered", answeredAt: new Date() })
      .where(eq(careDispatches.id, dispatch.id));

    return res.json({ success: true, message: "Respostas enviadas com sucesso!" });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error("care respond POST error:", e);
    res.status(500).json({ message: "Erro ao salvar respostas" });
  }
});

export default router;
