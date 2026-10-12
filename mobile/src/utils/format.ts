import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Local date as yyyy-MM-dd (the web used toISOString, which shifts days at night in BRT). */
export function toDateKey(date: Date = new Date()) {
  return format(date, 'yyyy-MM-dd');
}

/** Parses a yyyy-MM-dd string as a LOCAL date. */
export function fromDateKey(key: string) {
  return parseISO(key.length === 10 ? `${key}T00:00:00` : key);
}

export function formatDate(value: string | Date | null | undefined, pattern = 'dd/MM/yyyy') {
  if (!value) return '—';
  const d = typeof value === 'string' ? fromDateKey(value) : value;
  return isNaN(d.getTime()) ? '—' : format(d, pattern, { locale: ptBR });
}

export function formatDateLong(value: string | Date) {
  return formatDate(value, "EEEE, d 'de' MMMM");
}

/** "14:00:00" -> "14:00" */
export function formatTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : '';
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatMoney(value: string | number | null | undefined) {
  const n = typeof value === 'string' ? parseFloat(value) : value ?? 0;
  return currency.format(Number.isFinite(n) ? (n as number) : 0);
}

export function firstName(fullName?: string | null) {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}

export function initials(fullName?: string | null) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
