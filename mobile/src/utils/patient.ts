import { differenceInYears } from 'date-fns';

import type { BadgeTone } from '@/components/ui/Badge';
import { fromDateKey } from './format';

// Option values match the web edit form (PatientEditModal)
export const genderOptions = [
  { label: 'Masculino', value: 'masculino' },
  { label: 'Feminino', value: 'feminino' },
  { label: 'Outro', value: 'outro' },
  { label: 'Prefiro não informar', value: 'prefiro não informar' },
];

export const maritalOptions = [
  { label: 'Solteiro(a)', value: 'solteiro' },
  { label: 'Casado(a)', value: 'casado' },
  { label: 'Divorciado(a)', value: 'divorciado' },
  { label: 'Viúvo(a)', value: 'viúvo' },
  { label: 'União estável', value: 'união estável' },
];

export const patientStatusOptions = [
  { label: 'Ativo', value: 'active' },
  { label: 'Inativo', value: 'inactive' },
  { label: 'Alta', value: 'discharged' },
];

export const documentTypes: { label: string; value: string; tone: BadgeTone }[] = [
  { label: 'Termo de consentimento', value: 'consent', tone: 'lilac' },
  { label: 'Contrato', value: 'contract', tone: 'primary' },
  { label: 'Relatório', value: 'report', tone: 'success' },
  { label: 'Exame', value: 'exam', tone: 'sand' },
  { label: 'Outro', value: 'other', tone: 'neutral' },
];

export const dispatchStatus: Record<string, { label: string; tone: BadgeTone }> = {
  sent: { label: 'Enviado', tone: 'primary' },
  opened: { label: 'Aberto', tone: 'warning' },
  answered: { label: 'Respondido', tone: 'success' },
  expired: { label: 'Expirado', tone: 'neutral' },
};

export const questionTypes = [
  { label: 'Texto curto', value: 'text' as const },
  { label: 'Texto longo', value: 'textarea' as const },
  { label: 'Escala 1–10', value: 'scale' as const },
  { label: 'Múltipla escolha', value: 'multiple_choice' as const },
];

export function labelFor(options: { label: string; value: string }[], value?: string | null) {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}

export function patientStatusBadge(status?: string | null): { label: string; tone: BadgeTone } {
  if (status === 'active' || !status) return { label: 'Ativo', tone: 'success' };
  if (status === 'discharged') return { label: 'Alta', tone: 'lilac' };
  return { label: 'Inativo', tone: 'neutral' };
}

export function ageFrom(birthDate?: string | null) {
  if (!birthDate) return null;
  const d = fromDateKey(birthDate.slice(0, 10));
  return isNaN(d.getTime()) ? null : differenceInYears(new Date(), d);
}

export function isValidEmail(email?: string | null) {
  return !!email && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Empty strings become null (same normalization as the web forms). */
export function nullifyEmpty<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) out[k] = typeof v === 'string' && v.trim() === '' ? null : v;
  return out as T;
}
