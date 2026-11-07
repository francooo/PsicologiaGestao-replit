import type { CompanyStatus, PaymentMethod, Plan } from "./types";

const TZ = "America/Sao_Paulo";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  // Intl uses a non-breaking space after "R$"; keep it, it never splits the value from its unit
  return brl.format(n);
}
export function moneyShort(n: number): string {
  if (Math.abs(n) >= 1000) return `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/** Today in São Paulo as YYYY-MM-DD. */
export function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
}

export function currentMonthISO(): string {
  return todayISO().slice(0, 7);
}

/** Parse "YYYY-MM-DD" (or an ISO timestamp) into y, m, d numbers in São Paulo time. */
function ymd(value: string): [number, number, number] {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return [y, m, d];
  }
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

export function toISODate(value: string | null | undefined): string | null {
  if (!value) return null;
  const [y, m, d] = ymd(value);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function date(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = ymd(value);
  if (!y) return "—";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export function monthShort(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]}/${String(y).slice(2)}`;
}
export function monthLong(ym: string | null | undefined): string {
  if (!ym) return "—";
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${MONTHS_LONG[m - 1]} de ${y}`;
}

function dayNumber(iso: string): number {
  const [y, m, d] = ymd(iso);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
export function daysBetween(fromISO: string, toISOValue: string): number {
  return dayNumber(toISOValue) - dayNumber(fromISO);
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = ymd(iso);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Add months keeping the day, clamped to the last day of the target month (31/01 + 1 = 28/02). */
export function addMonthsClamp(iso: string, months: number): string {
  const [y, m, d] = ymd(iso);
  const targetIndex = y * 12 + (m - 1) + months;
  const ty = Math.floor(targetIndex / 12);
  const tm = targetIndex % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  const td = Math.min(d, last);
  return `${ty}-${String(tm + 1).padStart(2, "0")}-${String(td).padStart(2, "0")}`;
}

/** Same rule as the API: base = max(current validity, today), plus N months. */
export function extendValidity(current: string | null, months: number, today = todayISO()): string {
  const cur = toISODate(current);
  const base = cur && cur > today ? cur : today;
  return addMonthsClamp(base, months);
}

export function monthsAgoLabel(fromISO: string | null | undefined): string {
  if (!fromISO) return "";
  const days = daysBetween(fromISO, todayISO());
  if (days < 0) return "começa " + (days === -1 ? "amanhã" : `em ${-days} dias`);
  if (days < 1) return "hoje";
  if (days < 31) return days === 1 ? "há 1 dia" : `há ${days} dias`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return months === 1 ? "há 1 mês" : `há ${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years === 1 ? "1 ano" : `${years} anos`;
  if (!rest) return `há ${y}`;
  return `há ${y} e ${rest === 1 ? "1 mês" : `${rest} meses`}`;
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
}

export const PLAN_LABEL: Record<Plan, string> = { solo: "Solo", intermediario: "Intermediário", expert: "Expert" };
export const PLAN_PRICE: Record<Plan, number> = { solo: 39, intermediario: 99, expert: 149 };
export function planLabel(p: Plan | null | undefined): string {
  return p ? PLAN_LABEL[p] ?? p : "Sem plano";
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  outro: "Outro",
};
export function methodLabel(m: string | null | undefined): string {
  return (m && METHOD_LABEL[m as PaymentMethod]) || m || "—";
}

export type ValidityTone = "success" | "warning" | "danger" | "neutral";
export interface Validity {
  label: string;
  tone: ValidityTone;
  key: "active" | "expiring" | "expired" | "none" | "suspended";
  daysLeft: number | null;
}

export function validity(v: { status?: CompanyStatus; accessValidUntil: string | null; accessExpired?: boolean }): Validity {
  if (v.status === "suspended") return { label: "Suspensa", tone: "neutral", key: "suspended", daysLeft: null };
  if (!v.accessValidUntil) return { label: "Sem validade", tone: "neutral", key: "none", daysLeft: null };
  const days = daysBetween(todayISO(), v.accessValidUntil);
  if (v.accessExpired || days < 0) return { label: "Vencido", tone: "danger", key: "expired", daysLeft: days };
  if (days <= 30) {
    const label = days === 0 ? "Vence hoje" : days === 1 ? "Vence amanhã" : `Vence em ${days} dias`;
    return { label, tone: "warning", key: "expiring", daysLeft: days };
  }
  return { label: "Ativo", tone: "success", key: "active", daysLeft: days };
}

/** Human sentence for a subscription event. */
export function eventText(type: string, details: Record<string, any> | null | undefined): string {
  const d = details ?? {};
  const from = d.from;
  const to = d.to;
  switch (type) {
    case "created":
      return "Clínica cadastrada";
    case "plan_changed":
      return `Plano alterado de ${planLabel(from)} para ${planLabel(to)}`;
    case "price_changed":
      return `Valor mensal alterado de ${from == null ? "sem valor" : money(Number(from))} para ${to == null ? "sem valor" : money(Number(to))}`;
    case "start_changed":
      return `Início da assinatura alterado de ${date(from) === "—" ? "sem data" : date(from)} para ${date(to) === "—" ? "sem data" : date(to)}`;
    case "validity_changed":
      return `Validade alterada de ${from ? date(from) : "sem validade"} para ${to ? date(to) : "sem validade"}`;
    case "payment_added": {
      const before = d.validUntilBefore ? date(d.validUntilBefore) : null;
      const after = d.validUntilAfter ? date(d.validUntilAfter) : null;
      const extra = !after || after === before ? "" : before ? ` (validade ${before} → ${after})` : ` (validade até ${after})`;
      return `Pagamento de ${money(Number(d.amount))} registrado${extra}`;
    }
    case "payment_removed":
      return `Pagamento de ${money(Number(d.amount))} de ${date(d.paidAt)} removido`;
    case "ai_toggled":
      return (to ?? d.enabled) ? "Assistente com IA ativado" : "Assistente com IA desativado";
    case "suspended":
      return "Clínica suspensa";
    case "reactivated":
      return "Clínica reativada";
    case "renamed":
      return `Nome alterado de “${from ?? "—"}” para “${to ?? "—"}”`;
    default:
      return type;
  }
}


/** "Hoje, 14:32", "Ontem, 09:10" or "05/11/2026 14:32"; "—" when never. */
export function accessTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = daysBetween(value, todayISO());
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  if (d === 0) return `Hoje, ${time}`;
  if (d === 1) return `Ontem, ${time}`;
  return dateTime(value);
}

/** For a sentence: "hoje às 14:32", "ontem às 09:10" or "em 05/11/2026 às 14:32". */
export function accessWhen(value: string): string {
  const d = daysBetween(value, todayISO());
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  if (d === 0) return `hoje às ${time}`;
  if (d === 1) return `ontem às ${time}`;
  return `em ${date(value)} às ${time}`;
}

/** "há 5 minutos", "há 3 horas", then the same day/month wording as monthsAgoLabel. */
export function accessAgo(value: string | null | undefined): string {
  if (!value) return "";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return minutes === 1 ? "há 1 minuto" : `há ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && daysBetween(value, todayISO()) === 0) return hours === 1 ? "há 1 hora" : `há ${hours} horas`;
  return monthsAgoLabel(value);
}

export type ActivityKey = "active" | "low" | "inactive" | "none";
export interface Activity {
  key: ActivityKey;
  label: string;
  tone: ValidityTone;
}
export const ACTIVITY_LABEL: Record<ActivityKey, string> = {
  active: "Ativo",
  low: "Pouco uso",
  inactive: "Inativo",
  none: "Sem registro",
};

/** Up to 7 days: active; 8 to 30: low use; more: inactive; never: no record. */
export function activity(lastSeen: string | null | undefined): Activity {
  if (!lastSeen) return { key: "none", label: ACTIVITY_LABEL.none, tone: "neutral" };
  const days = daysBetween(lastSeen, todayISO());
  if (days <= 7) return { key: "active", label: ACTIVITY_LABEL.active, tone: "success" };
  if (days <= 30) return { key: "low", label: ACTIVITY_LABEL.low, tone: "warning" };
  return { key: "inactive", label: ACTIVITY_LABEL.inactive, tone: "danger" };
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  psychologist: "Psicóloga(o)",
  receptionist: "Recepção",
};
export function roleLabel(r: string | null | undefined): string {
  return (r && ROLE_LABEL[r]) || r || "—";
}
