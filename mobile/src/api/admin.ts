import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import type { AdminPsychologist } from '@/types/admin';

export const useAdminPsychologists = () =>
  useQuery({ queryKey: ['/api/admin/psychologists'], queryFn: () => api<AdminPsychologist[]>('/api/admin/psychologists') });
