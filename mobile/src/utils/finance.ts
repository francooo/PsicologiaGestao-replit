import { useQuery } from '@tanstack/react-query';

import { api } from '@/api/client';
import type { Transaction } from '@/types/api';

export type TransactionRow = Transaction & {
  responsible?: { id: number; fullName: string } | null;
};

// Same categories as client/src/pages/financial.tsx
export const incomeCategories = ['Consulta', 'Avaliação', 'Sessão em Grupo', 'Workshop', 'Outro'];
export const expenseCategories = [
  'Aluguel',
  'Água',
  'Luz',
  'Internet',
  'Material de Escritório',
  'Limpeza',
  'Manutenção',
  'Salários',
  'Marketing',
  'Impostos',
  'Outro',
];

export const categoryColors: Record<string, string> = {
  Consulta: '#6E9A6A',
  Avaliação: '#9FAE96',
  'Sessão em Grupo': '#C2B280',
  Workshop: '#D9A86C',
  Aluguel: '#C2413A',
  Água: '#2E729B',
  Luz: '#D9B44A',
  Internet: '#8E7BA8',
  'Material de Escritório': '#D9774A',
  Limpeza: '#4FA3A5',
  Manutenção: '#8A6E5A',
  Salários: '#C25E7E',
  Marketing: '#6B5B95',
  Impostos: '#6B7D8C',
};
const fallback = ['#2E729B', '#9FAE96', '#A99BBB', '#D9A86C', '#6B7D8C', '#C25E7E', '#4FA3A5', '#D9B44A'];
export const colorFor = (category: string, i: number) => categoryColors[category] ?? fallback[i % fallback.length];

export const amountOf = (t: Transaction) => parseFloat(t.amount) || 0;

export function totals(list: Transaction[]) {
  const income = list.filter((t) => t.type === 'income').reduce((s, t) => s + amountOf(t), 0);
  const expense = list.filter((t) => t.type === 'expense').reduce((s, t) => s + amountOf(t), 0);
  return { income, expense, balance: income - expense };
}

export function byCategory(list: Transaction[], type: 'income' | 'expense') {
  const map = new Map<string, number>();
  list
    .filter((t) => t.type === type)
    .forEach((t) => map.set(t.category || 'Sem categoria', (map.get(t.category || 'Sem categoria') ?? 0) + amountOf(t)));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function useTransactions(range: { startDate: string; endDate: string }) {
  return useQuery({
    queryKey: ['/api/transactions', range],
    queryFn: () => api<TransactionRow[]>('/api/transactions', { query: range }),
  });
}
