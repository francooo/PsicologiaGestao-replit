// WhatsApp messages opened with wa.me links: the clinic's editable texts and their {variables}.
// Shared by the server (fills the text) and the web editor (variable chips, preview).

export const MESSAGE_KEYS = ["appointment_reminder"] as const;
export type MessageKey = (typeof MESSAGE_KEYS)[number];

export const MESSAGE_MAX_LENGTH = 2000;

export const DEFAULT_MESSAGES: Record<MessageKey, string> = {
  appointment_reminder: [
    "Olá, {paciente}! 😊",
    "",
    "Passando para lembrar da sua consulta com *{psicologa}*:",
    "",
    "📅 *{dia_semana}, {data}*",
    "🕐 *{horario}*",
    "📍 {sala}",
    "",
    "Pode confirmar sua presença respondendo esta mensagem?",
    "",
    "_{clinica}_",
  ].join("\n"),
};

export const MESSAGE_VARIABLES: Record<MessageKey, { name: string; label: string; example: string }[]> = {
  appointment_reminder: [
    { name: "paciente", label: "Primeiro nome do paciente", example: "Maria" },
    { name: "paciente_nome_completo", label: "Nome completo do paciente", example: "Maria Souza" },
    { name: "psicologa", label: "Psicóloga da consulta", example: "Ana Lima" },
    { name: "data", label: "Data", example: "04/11" },
    { name: "dia_semana", label: "Dia da semana", example: "quarta-feira" },
    { name: "horario", label: "Horário de início", example: "14:00" },
    { name: "horario_fim", label: "Horário de término", example: "14:50" },
    { name: "sala", label: "Sala (ou Online)", example: "Sala 2" },
    { name: "clinica", label: "Nome da clínica", example: "Clínica Bem Estar" },
    { name: "quem_envia", label: "Quem está enviando", example: "Ana Lima" },
  ],
};

/** Replaces {name} with its value; unknown names stay as typed so a typo is visible. */
export function fillMessage(body: string, vars: Record<string, string>) {
  return body.replace(/\{([a-z_]+)\}/g, (m, name: string) => (name in vars ? vars[name] : m));
}

export const exampleVars = (key: MessageKey) => Object.fromEntries(MESSAGE_VARIABLES[key].map((v) => [v.name, v.example]));

// WhatsApp formatting as typed: *negrito*, _itálico_, ~tachado~, ```monoespaçado``` (nested is fine).
export type WaNode = string | { style: "bold" | "italic" | "strike" | "mono"; children: WaNode[] };

const WA_FORMAT = /```([\s\S]+?)```|\*(\S(?:[^*\n]*?\S)?)\*|_(\S(?:[^_\n]*?\S)?)_|~(\S(?:[^~\n]*?\S)?)~/;

/** Splits the text the way WhatsApp shows it (for previews); newlines stay inside the strings. */
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
    if (m[1] !== undefined) out.push({ style: "mono", children: [m[1]] });
    else {
      const style = m[2] !== undefined ? "bold" : m[3] !== undefined ? "italic" : "strike";
      out.push({ style, children: parseWhatsApp(m[2] ?? m[3] ?? m[4]) });
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

/** Brazilian phone → digits with the country code (wa.me format), or null when it can't be a phone. */
export function toWhatsAppNumber(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 && digits.length <= 15 ? digits : null;
}

/** wa.me link: opens the WhatsApp of whoever clicks, in the chat with `phone` (or the contact picker). */
export const whatsappLink = (phone: string | null, text: string) =>
  `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
