/** Who clinics talk to about their access (also the contact on the legal pages). */
export const SUPPORT_EMAIL = "andrewsfranco93@gmail.com";

/** Warn this many days before the access ends. */
export const EXPIRY_WARNING_DAYS = 7;

/** "2026-12-04" → "04/12/2026" */
export const formatDay = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const todaySaoPaulo = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

/** Days from today (São Paulo) to the last day of access: 0 = ends today, negative = expired. */
export function daysLeft(validUntil: string) {
  const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`) / 86_400_000;
  return Math.round(day(validUntil) - day(todaySaoPaulo()));
}

export type AccessState = "unlimited" | "active" | "ending" | "expired";

/** The server's accessExpired wins; the rest is only for the badge. */
export function accessState(company: { accessValidUntil: string | null; accessExpired?: boolean }): AccessState {
  if (!company.accessValidUntil) return "unlimited";
  if (company.accessExpired) return "expired";
  const left = daysLeft(company.accessValidUntil);
  if (left < 0) return "expired";
  return left <= EXPIRY_WARNING_DAYS ? "ending" : "active";
}

/** "Vence hoje", "Vence amanhã", "Vence em 5 dias" */
export function endingLabel(validUntil: string) {
  const left = daysLeft(validUntil);
  if (left <= 0) return "Vence hoje";
  return left === 1 ? "Vence amanhã" : `Vence em ${left} dias`;
}
