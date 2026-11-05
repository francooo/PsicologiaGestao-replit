import type { BadgeTone } from '@/components/ui/Badge';

// Clinic access expiry (set by the platform admin). Mirrors client/src/lib/company-access.ts

/** Who clinics talk to about their access (also the contact on the legal pages). */
export const SUPPORT_EMAIL = 'andrewsfranco93@gmail.com';

/** Warn this many days before the access ends. */
export const EXPIRY_WARNING_DAYS = 7;

/** "2026-12-04" → "04/12/2026" */
export const formatDay = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// São Paulo is UTC-3 all year (no daylight saving since 2019); avoids relying on Intl time zones in Hermes
const todaySaoPaulo = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** Days from today (São Paulo) to the last day of access: 0 = ends today, negative = expired. */
export function daysLeft(validUntil: string) {
  const day = (iso: string) => Date.parse(`${iso}T12:00:00Z`) / 86_400_000;
  return Math.round(day(validUntil) - day(todaySaoPaulo()));
}

export type AccessState = 'unlimited' | 'active' | 'ending' | 'expired';

/** The server's accessExpired wins; the rest is only for the badge. */
export function accessState(company: { accessValidUntil: string | null; accessExpired?: boolean }): AccessState {
  if (!company.accessValidUntil) return 'unlimited';
  if (company.accessExpired) return 'expired';
  const left = daysLeft(company.accessValidUntil);
  if (left < 0) return 'expired';
  return left <= EXPIRY_WARNING_DAYS ? 'ending' : 'active';
}

/** "Vence hoje", "Vence amanhã", "Vence em 5 dias" */
export function endingLabel(validUntil: string) {
  const left = daysLeft(validUntil);
  if (left <= 0) return 'Vence hoje';
  return left === 1 ? 'Vence amanhã' : `Vence em ${left} dias`;
}

export const accessBadgeTone: Record<Exclude<AccessState, 'unlimited'>, BadgeTone> = {
  active: 'success',
  ending: 'warning',
  expired: 'danger',
};
