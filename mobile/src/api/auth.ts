import { api } from './client';
import type { User } from '@/types/api';

export type LoginResponse = { user: User; token: string };

export const authApi = {
  login: (username: string, password: string) =>
    api<LoginResponse>('/api/mobile/login', { method: 'POST', body: { username, password } }),

  register: (data: { fullName: string; email: string; username: string; password: string }) =>
    api<User>('/api/register', { method: 'POST', body: { ...data, role: 'psychologist', status: 'active' } }),

  me: () => api<User>('/api/user'),

  logout: () => api('/api/logout', { method: 'POST' }),

  switchCompany: (companyId: number) =>
    api<User>('/api/companies/switch', { method: 'POST', body: { companyId } }),

  recoverPassword: (email: string) =>
    api<{ message: string }>('/api/recover-password', { method: 'POST', body: { email } }),
};
