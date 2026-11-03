// WhatsApp helpers for wa.me reminders (same rules as shared/whatsapp-message.ts on the web).

export const MESSAGE_MAX_LENGTH = 2000;

export type WaNode = string | { style: 'bold' | 'italic' | 'strike' | 'mono'; children: WaNode[] };

const WA_FORMAT = /```([\s\S]+?)```|\*(\S(?:[^*\n]*?\S)?)\*|_(\S(?:[^_\n]*?\S)?)_|~(\S(?:[^~\n]*?\S)?)~/;

/** Splits the text the way WhatsApp shows it: *negrito*, _itálico_, ~tachado~, ```mono```. */
export function parseWhatsApp(text: string): WaNode[] {
  const out: WaNode[] = [];
  let rest = text;
  while (rest) {
    const m = WA_FORMAT.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    if (m[1] !== undefined) out.push({ style: 'mono', children: [m[1]] });
    else {
      const style = m[2] !== undefined ? 'bold' : m[3] !== undefined ? 'italic' : 'strike';
      out.push({ style, children: parseWhatsApp(m[2] ?? m[3] ?? m[4]) });
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

/** Brazilian phone → digits with the country code (wa.me format), or null when it can't be a phone. */
export function toWhatsAppNumber(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 && digits.length <= 15 ? digits : null;
}

/** wa.me link: opens the WhatsApp of this phone, in the chat with `phone` (or the contact picker). */
export const whatsappLink = (phone: string | null, text: string) => `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`;

/** Wraps the selected text with a WhatsApp marker; with nothing selected, inserts the pair. */
export function wrapSelection(text: string, start: number, end: number, mark: string) {
  const next = text.slice(0, start) + mark + text.slice(start, end) + mark + text.slice(end);
  return { text: next, start: start + mark.length, end: end + mark.length };
}
