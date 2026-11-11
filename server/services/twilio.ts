import { createHmac, timingSafeEqual } from "crypto";

// Twilio WhatsApp through the REST API (no SDK). One platform sender for every clinic.
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN  — Account Info in the Twilio console
//   TWILIO_WHATSAPP_FROM                   — whatsapp:+5511... (Sandbox: whatsapp:+14155238886)
//   TWILIO_REMINDER_CONTENT_SID            — approved template (HX...). Without it the reminder goes
//                                            as free text, which only the Sandbox / a 24h session accepts.

const API = "https://api.twilio.com/2010-04-01";

export const isTwilioConfigured = () =>
  !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);

export type TwilioSendResult = { ok: true; sid: string; status: string } | { ok: false; error: string };

/**
 * Sends one WhatsApp message. `to` is digits with country code (5511999999999).
 * With `contentSid` Twilio fills the approved template with `contentVariables` ({"1": "..."}).
 */
export async function sendWhatsApp(p: {
  to: string;
  body?: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
  statusCallback?: string;
}): Promise<TwilioSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const form = new URLSearchParams({ To: `whatsapp:+${p.to}`, From: process.env.TWILIO_WHATSAPP_FROM! });
  if (p.contentSid) {
    form.set("ContentSid", p.contentSid);
    form.set("ContentVariables", JSON.stringify(p.contentVariables ?? {}));
  } else {
    form.set("Body", p.body ?? "");
  }
  if (p.statusCallback) form.set("StatusCallback", p.statusCallback);

  try {
    const res = await fetch(`${API}/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as { sid?: string; status?: string; message?: string; code?: number };
    if (!res.ok || !data.sid) return { ok: false, error: `${data.code ?? res.status}: ${data.message ?? res.statusText}` };
    return { ok: true, sid: data.sid, status: data.status ?? "queued" };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Checks X-Twilio-Signature: HMAC-SHA1 (auth token) of the exact callback URL followed by every
 * POST param, sorted by name, as name+value. https://www.twilio.com/docs/usage/security
 */
export function isValidTwilioSignature(url: string, params: Record<string, string>, signature: string | undefined) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", token).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
