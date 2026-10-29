import { Router, type Response } from "express";
import multer from "multer";
import { inArray } from "drizzle-orm";
import { toFile } from "groq-sdk";
import { z } from "zod";
import { db } from "../db";
import { agentActions, type AgentMessage } from "@shared/schema";
import { groq, logGroqError, AIQuotaError, AIServiceError } from "../services/ai";
import { agentContext } from "../agent/context";
import { ActionError, cancelAction, confirmAction, presentAction } from "../agent/actions";
import { currentConversation, messagesLastHour, newConversation, runAgent, visibleMessages } from "../agent/runner";

// Mounted at /api/agent — the assistant (chat with tools). Behind the company gate like every
// private route, so req.companyId and the membership role are always set.
const router = Router();

const HOURLY_LIMIT = Number(process.env.AGENT_HOURLY_LIMIT) || 40;
const STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";
const AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aac",
];

// 4MB fits Vercel's ~4.5MB body limit; a minute of compressed speech is well under it
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, AUDIO_TYPES.includes(file.mimetype.split(";")[0])),
});

const enabled = () => !!process.env.GROQ_API_KEY;

/** Chat messages with the confirmation card of the action they carry, if any. */
async function present(messages: AgentMessage[]) {
  const ids = Array.from(new Set(messages.map((m) => m.actionId).filter((id): id is number => !!id)));
  const actions = ids.length ? await db.select().from(agentActions).where(inArray(agentActions.id, ids)) : [];
  const byId = new Map(actions.map((a) => [a.id, presentAction(a)]));
  return messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    viaAudio: m.viaAudio,
    createdAt: m.createdAt,
    action: m.actionId ? (byId.get(m.actionId) ?? null) : null,
  }));
}

function aiError(res: Response, error: unknown, context: string) {
  if (error instanceof AIQuotaError) return res.status(503).json({ message: error.message });
  if (error instanceof AIServiceError) return res.status(502).json({ message: error.message });
  console.error(context, error);
  return res.status(500).json({ message: "Erro no assistente. Tente de novo." });
}

// GET /api/agent/status — the floating button only shows when the AI is configured
router.get("/status", (_req, res) => {
  res.json({ enabled: enabled() });
});

// GET /api/agent/conversation — the current conversation (empty before the first message)
router.get("/conversation", async (req, res) => {
  try {
    const ctx = await agentContext(req);
    const conv = await currentConversation(ctx, false);
    res.json({ conversationId: conv?.id ?? null, messages: conv ? await present(await visibleMessages(conv.id)) : [] });
  } catch (error) {
    aiError(res, error, "GET /api/agent/conversation:");
  }
});

// POST /api/agent/conversation/new — starts over (the old conversation is kept)
router.post("/conversation/new", async (req, res) => {
  try {
    const conv = await newConversation(await agentContext(req));
    res.status(201).json({ conversationId: conv.id, messages: [] });
  } catch (error) {
    aiError(res, error, "POST /api/agent/conversation/new:");
  }
});

const messageSchema = z.object({
  text: z.string().trim().min(1, "Escreva uma mensagem.").max(2000, "Mensagem muito longa (máximo de 2000 caracteres)."),
  viaAudio: z.boolean().optional(),
});

// POST /api/agent/messages { text, viaAudio? } — one turn of the conversation
router.post("/messages", async (req, res) => {
  if (!enabled()) return res.status(503).json({ message: "O assistente não está configurado." });
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });

  try {
    const ctx = await agentContext(req);
    if ((await messagesLastHour(ctx)) >= HOURLY_LIMIT) {
      return res.status(429).json({ message: "Você atingiu o limite de mensagens por hora. Tente de novo mais tarde." });
    }
    const conv = await currentConversation(ctx, true);
    const { userMessage, reply } = await runAgent(ctx, conv!.id, parsed.data.text, !!parsed.data.viaAudio);
    const [user, assistant] = await present([userMessage, reply]);
    res.json({ conversationId: conv!.id, userMessage: user, reply: assistant });
  } catch (error) {
    aiError(res, error, "POST /api/agent/messages:");
  }
});

// POST /api/agent/transcribe (multipart "audio") — speech to text for voice messages
router.post("/transcribe", (req, res) => {
  if (!enabled()) return res.status(503).json({ message: "O assistente não está configurado." });
  upload.single("audio")(req, res, async (err) => {
    if (err) {
      const tooBig = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({ message: tooBig ? "Áudio muito longo. Grave até 1 minuto." : "Não foi possível ler o áudio." });
    }
    if (!req.file) return res.status(400).json({ message: "Envie um áudio (webm, ogg, m4a, mp3 ou wav)." });
    try {
      const ext =
        req.file.mimetype.includes("mp4") || req.file.mimetype.includes("m4a") ? "m4a" : req.file.mimetype.split("/")[1].split(";")[0];
      const result = await groq.audio.transcriptions.create(
        {
          file: await toFile(req.file.buffer, `audio.${ext}`, { type: req.file.mimetype }),
          model: STT_MODEL,
          language: "pt",
          temperature: 0,
        },
        { timeout: 30_000, maxRetries: 1 },
      );
      const text = (result.text ?? "").trim();
      if (!text) return res.status(422).json({ message: "Não consegui entender o áudio. Tente falar mais perto do microfone." });
      res.json({ text });
    } catch (error) {
      logGroqError("agent transcribe", STT_MODEL, error);
      if ((error as { status?: number }).status === 429)
        return res.status(503).json({ message: "O assistente está ocupado agora. Tente de novo em instantes." });
      res.status(502).json({ message: "Não consegui transcrever o áudio. Tente de novo." });
    }
  });
});

const parseId = (raw: string) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// POST /api/agent/actions/:id/confirm | /cancel — the user's answer to a proposal card
for (const verb of ["confirm", "cancel"] as const) {
  router.post(`/actions/:id/${verb}`, async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Ação inválida." });
    try {
      const ctx = await agentContext(req);
      const out = verb === "confirm" ? await confirmAction(ctx, id) : await cancelAction(ctx, id);
      const [message] = await present([out.message]);
      res.json({ action: out.action, message });
    } catch (error) {
      if (error instanceof ActionError) return res.status(error.status).json({ message: error.message, action: error.action ?? null });
      console.error(`POST /api/agent/actions/:id/${verb}:`, error);
      res.status(500).json({ message: "Erro ao executar a ação." });
    }
  });
}

export default router;
