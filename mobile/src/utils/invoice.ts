import type { BadgeTone } from '@/components/ui/Badge';
import { formatMoney } from './format';

export const invoiceStatus: Record<string, { label: string; tone: BadgeTone }> = {
  ativa: { label: 'Ativa', tone: 'primary' },
  pendente: { label: 'Pendente', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'danger' },
};

export const invoiceStatusInfo = (s: string) => invoiceStatus[s] ?? { label: s, tone: 'neutral' as BadgeTone };

export const invoiceStatusOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativa', value: 'ativa' },
  { label: 'Pendente', value: 'pendente' },
  { label: 'Cancelada', value: 'cancelada' },
];

export function shortKey(key?: string | null) {
  if (!key) return '—';
  return key.length > 20 ? `${key.slice(0, 8)}...${key.slice(-8)}` : key;
}

export function moneyOrDash(v?: string | null) {
  if (v == null || v === '' || isNaN(parseFloat(v))) return '—';
  return formatMoney(v);
}

export function confidenceBadge(c?: number): { label: string; tone: BadgeTone } {
  if (!c) return { label: 'Não encontrado', tone: 'neutral' };
  if (c >= 0.85) return { label: 'Alta', tone: 'success' };
  if (c >= 0.6) return { label: 'Média', tone: 'warning' };
  return { label: 'Baixa', tone: 'danger' };
}

export function invoiceFileName(n: { id: number; numeroNota?: string | null; imageMimeType?: string | null }) {
  const ext =
    n.imageMimeType === 'application/pdf'
      ? 'pdf'
      : n.imageMimeType === 'image/png'
        ? 'png'
        : n.imageMimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
  return `nota-${n.numeroNota || n.id}.${ext}`;
}
