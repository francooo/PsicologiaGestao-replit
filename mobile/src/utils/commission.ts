import { endOfMonth, format } from 'date-fns';

import type { BadgeTone } from '@/components/ui/Badge';
import { fromDateKey } from './format';

export const commissionStatus = (s: string): { label: string; tone: BadgeTone } =>
  s === 'paid' ? { label: 'Pago', tone: 'success' } : s === 'cancelled' ? { label: 'Cancelado', tone: 'danger' } : { label: 'Pendente', tone: 'warning' };

export const paymentMethods = [
  { label: 'PIX', value: 'pix' },
  { label: 'Transferência bancária', value: 'transferencia' },
  { label: 'Dinheiro', value: 'dinheiro' },
  { label: 'Outro', value: 'outro' },
];

export const monthOptions = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(
  (label, i) => ({ label, value: String(i + 1).padStart(2, '0') }),
);

/** "2026-10" -> { start: "2026-10-01", end: "2026-10-31" } */
export function monthRange(ym: string) {
  const start = `${ym}-01`;
  return { start, end: format(endOfMonth(fromDateKey(start)), 'yyyy-MM-dd') };
}
