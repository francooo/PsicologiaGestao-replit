import { Router, type Request } from "express";
import { timingSafeEqual } from "crypto";
import { runAutoReminders, updateMessageStatus } from "../lib/auto-reminders";
import { isValidTwilioSignature } from "../services/twilio";
import { getAppUrl } from "../services/email";

// Mounted at /api — machine-to-machine routes, outside the session/company gate:
//   /api/cron/whatsapp-reminders  scheduler (cron-job.org every 15 min, Vercel Cron daily) — CRON_SECRET
//   /api/twilio/status            Twilio status callback — X-Twilio-Signature
const router = Router();

function hasCronSecret(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"; cron-job.org can send it too, or ?key=
  const header = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const given = header || (typeof req.query.key === "string" ? req.query.key : "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const runReminders = async (req: Request, res: any) => {
  if (!hasCronSecret(req)) return res.status(401).json({ message: "Não autorizado" });
  try {
    const summary = await runAutoReminders();
    res.json(summary);
  } catch (error) {
    console.error("cron whatsapp-reminders error:", error);
    res.status(500).json({ message: "Falha ao enviar lembretes" });
  }
};
router.get("/cron/whatsapp-reminders", runReminders);
router.post("/cron/whatsapp-reminders", runReminders);

// Twilio posts form fields (MessageSid, MessageStatus, ErrorCode, ...) for each status change
router.post("/twilio/status", async (req, res) => {
  const params = Object.fromEntries(Object.entries(req.body ?? {}).map(([k, v]) => [k, String(v)]));
  const url = `${getAppUrl()}/api/twilio/status`;
  if (!isValidTwilioSignature(url, params, req.header("X-Twilio-Signature"))) {
    return res.status(403).send("invalid signature");
  }
  try {
    if (params.MessageSid && params.MessageStatus) {
      await updateMessageStatus(params.MessageSid, params.MessageStatus, params.ErrorCode || undefined);
    }
    res.status(204).end();
  } catch (error) {
    console.error("twilio status error:", error);
    res.status(500).end();
  }
});

export default router;
