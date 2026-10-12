import { useQuery } from '@tanstack/react-query';

import { api, ApiError } from './client';
import { toast } from '@/utils/toast';
import type { Meeting } from '@/types/meeting';

export const useMeetings = () =>
  useQuery({
    queryKey: ['/api/meetings'],
    queryFn: () => api<Meeting[]>('/api/meetings'),
    refetchInterval: 30_000, // same polling as the web
  });

export const useGoogleStatus = () =>
  useQuery({
    queryKey: ['/api/google-calendar/status'],
    queryFn: () => api<{ authenticated: boolean }>('/api/google-calendar/status').catch(() => ({ authenticated: false })),
  });

/**
 * Meeting errors: GOOGLE_TOKEN_EXPIRED gets its own message (as in the web).
 * That 401 comes from Google, not from our session — the api client doesn't sign out on it.
 */
export function meetingError(e: unknown) {
  if (e instanceof ApiError && (e.body as any)?.error === 'GOOGLE_TOKEN_EXPIRED') {
    toast.error('Conexão com o Google expirada', (e.body as any).message);
    return;
  }
  const body = e instanceof ApiError ? (e.body as any) : null;
  toast.error('Erro', (typeof body?.error === 'string' && body.error) || (e as Error)?.message);
}

export function formatDuration(min?: number | null) {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h ${m}min`;
  return h ? `${h}h` : `${m}min`;
}
