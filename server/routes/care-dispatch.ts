import { Router } from "express";
import { db } from "../db";
import {
  careTemplates,
  careTemplateQuestions,
  careDispatches,
  careDispatchQuestions,
  careResponses,
  patients,
} from "@shared/patient-schema";
import { psychologists, users } from "@shared/schema";
import { eq, desc, count, and, or, isNull } from "drizzle-orm";
import { isValidEmail } from "../lib/validate-email";
import { generateResponseToken } from "../lib/care-token";
import { sendCareFormEmail } from "../lib/send-care-email";
import { z } from "zod";

const router = Router();

const checkAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "Não autenticado" });
  next();
};
router.use(checkAuth);

function substituteVariables(text: string, patientName: string, psychologistName: string): string {
  const firstName = patientName.split(" ")[0];
  return text
    .replace(/\{patient_name\}/g, firstName)
    .replace(/\{patient_full_name\}/g, patientName)
    .replace(/\{psychologist_name\}/g, psychologistName);
}

/**
 * Checks if the logged-in user can access the given patient.
 * Mirrors the checkPatientAccess logic from patient-records.ts:
 *   - admin: always allowed
 *   - psychologist: patient.psychologistId === psychologist.id OR patient.createdBy === user.id
 */
async function canAccessPatient(user: any, patientRow: typeof patients.$inferSelect): Promise<boolean> {
  if (user.role === "admin") return true;

  if (user.role === "psychologist") {
    const [psychRow] = await db
      .select()
      .from(psychologists)
      .where(eq(psychologists.userId, user.id));
    const psychId = psychRow?.id ?? -1;
    return patientRow.psychologistId === psychId || patientRow.createdBy === user.id;
  }

  return false;
}

/**
 * Checks if the logged-in user can access a given dispatch.
 * - admin: always
 * - psychologist: dispatch.psychologistId === user.id
 */
function canAccessDispatch(user: any, dispatch: typeof careDispatches.$inferSelect): boolean {
  if (user.role === "admin") return true;
  return dispatch.psychologistId === user.id;
}

// ── POST /api/care/patients/:patientId/dispatch ───────────────────────────
router.post("/patients/:patientId/dispatch", async (req, res) => {
  try {
    const user = req.user as any;
    const patientId = parseInt(req.params.patientId);
    // override_questions: optional array sent by frontend when psychologist edited
    // questions inline before dispatch; if provided, these replace the template snapshot
    const { template_id, subject, custom_message, override_questions } = req.body;

    if (!template_id) return res.status(400).json({ message: "template_id é obrigatório" });

    // 1. Fetch patient
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
    if (!patient) return res.status(404).json({ message: "Paciente não encontrado" });

    // 2. Authorize access to patient
    const authorized = await canAccessPatient(user, patient);
    if (!authorized) {
      return res.status(403).json({
        message: "Acesso negado. Você não possui permissão para acessar este paciente.",
        code: "FORBIDDEN",
      });
    }

    // 3. Validate patient email
    if (!patient.email || !isValidEmail(patient.email)) {
      return res.status(422).json({
        error: "email_invalid",
        message: "O paciente não possui e-mail válido cadastrado. Atualize o perfil antes de enviar.",
      });
    }

    // 4. Fetch psychologist user info
    const [psychUser] = await db.select().from(users).where(eq(users.id, user.id));
    if (!psychUser) return res.status(400).json({ message: "Usuário não encontrado" });

    // 5. Fetch template with questions (own or system default)
    const [template] = await db
      .select()
      .from(careTemplates)
      .where(
        and(
          eq(careTemplates.id, parseInt(template_id)),
          or(eq(careTemplates.psychologistId, user.id), isNull(careTemplates.psychologistId))
        )
      );
    if (!template) return res.status(404).json({ message: "Template não encontrado" });

    const templateQuestions = await db
      .select()
      .from(careTemplateQuestions)
      .where(eq(careTemplateQuestions.templateId, template.id))
      .orderBy(careTemplateQuestions.orderIndex);

    // 6. Build final question list: use override_questions if provided (inline edits),
    //    otherwise fall back to template questions with variable substitution
    const psychName = psychUser.fullName || psychUser.username;

    const overrideSchema = z.array(
      z.object({
        questionText: z.string().min(1),
        questionType: z.string(),
        options: z.array(z.string()).nullable().optional(),
        isRequired: z.boolean(),
        orderIndex: z.number().int(),
      })
    );

    let renderedQuestions: Array<{
      questionText: string;
      questionType: string;
      options: unknown;
      isRequired: boolean;
      orderIndex: number;
    }>;

    if (Array.isArray(override_questions) && override_questions.length > 0) {
      // Use psychologist's inline edits; variables already substituted on frontend,
      // but run substitution again server-side to be safe
      const parsed = overrideSchema.parse(override_questions);
      renderedQuestions = parsed.map((q) => ({
        ...q,
        questionText: substituteVariables(q.questionText, patient.fullName, psychName),
        options: q.options ?? null,
      }));
    } else {
      renderedQuestions = templateQuestions.map((q) => ({
        ...q,
        questionText: substituteVariables(q.questionText, patient.fullName, psychName),
      }));
    }

    // 7. Generate secure response token
    const responseToken = generateResponseToken();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // 8. Build subject (use provided or auto-generate)
    const firstName = patient.fullName.split(" ")[0];
    const finalSubject = subject?.trim() || `Check-in — ${firstName}`;

    // 9. Save dispatch
    const [dispatch] = await db
      .insert(careDispatches)
      .values({
        psychologistId: user.id,
        patientId,
        templateId: template.id,
        subject: finalSubject,
        customMessage: custom_message ?? null,
        responseToken,
        tokenExpiresAt,
        sentToEmail: patient.email!,
        status: "sent",
      })
      .returning();

    // 10. Save question snapshot
    if (renderedQuestions.length > 0) {
      await db.insert(careDispatchQuestions).values(
        renderedQuestions.map((q, i) => ({
          dispatchId: dispatch.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options ?? null,
          isRequired: q.isRequired,
          orderIndex: i,
        }))
      );
    }

    // 11. Send email via Gmail API
    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const responseUrl = `${appUrl}/responder/${responseToken}`;

    const emailSent = await sendCareFormEmail({
      psychologistUserId: user.id,
      patientName: patient.fullName,
      patientEmail: patient.email!,
      psychologistName: psychName,
      psychologistEmail: psychUser.email,
      subject: finalSubject,
      customMessage: custom_message ?? null,
      questions: renderedQuestions,
      responseUrl,
      tokenExpiresAt,
    });

    if (!emailSent) {
      return res.json({
        success: true,
        dispatch,
        warning: "O formulário foi salvo mas o e-mail não pôde ser enviado (Google não conectado). Compartilhe o link manualmente.",
        responseUrl,
      });
    }

    return res.status(201).json({ success: true, dispatch, responseUrl });
  } catch (e: any) {
    console.error("dispatch error:", e);
    if (e?.code === 401) {
      return res.status(401).json({ message: "Sessão Google expirada. Reconecte sua conta Google." });
    }
    res.status(500).json({ message: "Erro ao enviar formulário" });
  }
});

// ── GET /api/care/patients/:patientId/dispatches — history ───────────────
router.get("/patients/:patientId/dispatches", async (req, res) => {
  try {
    const user = req.user as any;
    const patientId = parseInt(req.params.patientId);

    // Authorize access to patient
    const [patient] = await db.select().from(patients).where(eq(patients.id, patientId));
    if (!patient) return res.status(404).json({ message: "Paciente não encontrado" });

    const authorized = await canAccessPatient(user, patient);
    if (!authorized) {
      return res.status(403).json({
        message: "Acesso negado.",
        code: "FORBIDDEN",
      });
    }

    const dispatches = await db
      .select()
      .from(careDispatches)
      .where(eq(careDispatches.patientId, patientId))
      .orderBy(desc(careDispatches.sentAt));

    const now = new Date();

    const result = await Promise.all(
      dispatches.map(async (d) => {
        // Auto-expire
        if (d.status !== "answered" && d.tokenExpiresAt < now) {
          await db
            .update(careDispatches)
            .set({ status: "expired" })
            .where(eq(careDispatches.id, d.id));
          d = { ...d, status: "expired" };
        }

        const [{ value: responseCount }] = await db
          .select({ value: count() })
          .from(careResponses)
          .where(eq(careResponses.dispatchId, d.id));

        return { ...d, responseCount: Number(responseCount) };
      })
    );

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao listar histórico de envios" });
  }
});

// ── GET /api/care/dispatches/:dispatchId/responses — questions + answers ──
router.get("/dispatches/:dispatchId/responses", async (req, res) => {
  try {
    const user = req.user as any;
    const dispatchId = parseInt(req.params.dispatchId);

    const [dispatch] = await db
      .select()
      .from(careDispatches)
      .where(eq(careDispatches.id, dispatchId));
    if (!dispatch) return res.status(404).json({ message: "Envio não encontrado" });

    // Authorization: admin or the psychologist who sent this dispatch
    if (!canAccessDispatch(user, dispatch)) {
      return res.status(403).json({
        message: "Acesso negado.",
        code: "FORBIDDEN",
      });
    }

    const questions = await db
      .select()
      .from(careDispatchQuestions)
      .where(eq(careDispatchQuestions.dispatchId, dispatchId))
      .orderBy(careDispatchQuestions.orderIndex);

    const responses = await db
      .select()
      .from(careResponses)
      .where(eq(careResponses.dispatchId, dispatchId));

    const merged = questions.map((q) => ({
      ...q,
      response: responses.find((r) => r.dispatchQuestionId === q.id) ?? null,
    }));

    res.json({ dispatch, questions: merged });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao buscar respostas" });
  }
});

export default router;
