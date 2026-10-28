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

export type AddAdminResult = { type: 'promoted' | 'invited' } | { type: 'conflict'; message: string };

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
  return res.type === 'promoted'
    ? 'A conta já existia e agora administra a empresa.'
    : 'E-mail pré-autorizado: no primeiro acesso a pessoa já entra como administradora.';
}
