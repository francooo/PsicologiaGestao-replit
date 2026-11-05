import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import type { Role } from '@/types/api';

// Platform (super) admin: the companies (clínicas). Same API as the web page /admin/empresas.

export interface PlatformCompany {
  id: number;
  name: string;
  slug: string;
  cnpj: string | null;
  status: 'active' | 'suspended';
  /** Last day of access (inclusive), null = no expiry */
  accessValidUntil: string | null;
  accessExpired: boolean;
  aiEnabled: boolean;
  createdAt: string;
  membersCount: number;
  adminsCount: number;
  pendingInvitesCount: number;
}

export interface PlatformCompanyDetail {
  company: PlatformCompany;
  members: { id: number; fullName: string; email: string; role: Role; status: string }[];
  invites: { id: number; email: string; role: Role; createdAt: string }[];
}

export type AddAdminResult = { type: 'promoted' | 'invited'; emailSent?: boolean } | { type: 'conflict'; message: string };

/** Tail of the "admin added" toasts: whether the server could send the invite e-mail. */
export const inviteEmailNote = (emailSent?: boolean) =>
  emailSent === undefined
    ? ''
    : emailSent
      ? ' Enviamos um e-mail de convite.'
      : ' Não foi possível enviar o e-mail de convite: avise a pessoa.';

export const PLATFORM_COMPANIES_KEY = ['/api/platform/companies'];
export const platformCompanyKey = (id: number) => ['/api/platform/companies', id];

export const usePlatformCompanies = () =>
  useQuery({ queryKey: PLATFORM_COMPANIES_KEY, queryFn: () => api<PlatformCompany[]>('/api/platform/companies') });

export const usePlatformCompany = (id: number) =>
  useQuery({
    queryKey: platformCompanyKey(id),
    queryFn: () => api<PlatformCompanyDetail>(`/api/platform/companies/${id}`),
  });

export function adminResultMessage(res: AddAdminResult | null) {
  if (!res) return undefined;
  if (res.type === 'conflict') return res.message;
  return (
    (res.type === 'promoted'
      ? 'A conta já existia e agora administra a empresa.'
      : 'E-mail pré-autorizado: no primeiro acesso a pessoa já entra como administradora.') + inviteEmailNote(res.emailSent)
  );
}

/** Accounts without an active company (Empresas → Sem clínica). */
export interface UnlinkedAccount {
  id: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  createdAt: string | null;
  viaGoogle: boolean;
  lastCompanyName: string | null;
}

export type UnlinkedFilter = 'waiting' | 'inactive';

export const UNLINKED_KEY = ['/api/platform/unlinked-accounts'];

export const useUnlinkedAccounts = (status: UnlinkedFilter) =>
  useQuery({
    queryKey: [...UNLINKED_KEY, status],
    queryFn: () => api<UnlinkedAccount[]>(`/api/platform/unlinked-accounts?status=${status}`),
  });
