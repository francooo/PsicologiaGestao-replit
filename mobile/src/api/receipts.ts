import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';

// Receita Saúde assistant. Same API as the web (server/routes/health-receipts.ts): the receipt is
// issued in the Receita's app; here the user copies the data and marks the session as issued.

export type ReceiptIssue =
  | 'patient_not_found'
  | 'ambiguous'
  | 'no_patient_cpf'
  | 'no_payer_cpf'
  | 'no_psychologist_cpf'
  | 'no_crp';

export interface ReceiptItem {
  appointmentId: number;
  date: string;
  startTime: string;
  patientName: string;
  patientId: number | null;
  beneficiary: { name: string; cpf: string | null } | null;
  payer: { name: string; cpf: string | null; isGuardian: boolean } | null;
  psychologist: { id: number; name: string; crp: string | null; cpf: string | null };
  suggestedAmount: number | null;
  receipt: { amount: number; payerCpf: string; issuedAt: string } | null;
  issues: ReceiptIssue[];
}

export interface ReceiptsResponse {
  month: string;
  items: ReceiptItem[];
  summary: { total: number; issued: number; pending: number; withIssues: number; issuedAmount: number };
}

export const RECEIPTS_KEY = ['/api/health-receipts'];

export const ISSUE_TEXT: Record<ReceiptIssue, string> = {
  patient_not_found: 'Paciente não encontrado no cadastro de pacientes',
  ambiguous: 'Mais de um paciente com esse nome',
  no_patient_cpf: 'Paciente sem CPF no cadastro',
  no_payer_cpf: 'Responsável sem CPF no cadastro',
  no_psychologist_cpf: 'Psicóloga sem CPF no perfil',
  no_crp: 'Psicóloga sem CRP no perfil',
};
/** Missing data on the psychologist is shown once, at the top of the screen. */
export const PSYCH_ISSUES: ReceiptIssue[] = ['no_psychologist_cpf', 'no_crp'];
/** Without these the receipt can't be issued (no payer CPF). */
export const BLOCKING: ReceiptIssue[] = ['patient_not_found', 'ambiguous', 'no_patient_cpf', 'no_payer_cpf'];

export const RECEITA_SAUDE_URL = 'https://cav.receita.fazenda.gov.br/autenticacao/login';

export const useReceipts = (month: string, psychologistId: number | null) =>
  useQuery({
    queryKey: [...RECEIPTS_KEY, month, psychologistId],
    queryFn: () => api<ReceiptsResponse>('/api/health-receipts', { query: { month, psychologistId } }),
  });

export function useMarkReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { appointmentId: number; amount: number }) => api('/api/health-receipts', { method: 'POST', body: v }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY }),
  });
}

export function useUnmarkReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: number) => api(`/api/health-receipts/${appointmentId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECEIPTS_KEY }),
  });
}
