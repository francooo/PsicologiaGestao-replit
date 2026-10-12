import { useAuth } from '@/auth/AuthProvider';
import { usePsychologists } from '@/api/queries';

/** The psychologist profile of the logged user (null for admin/receptionist). */
export function useMyPsychologist() {
  const { user } = useAuth();
  const isPsychologist = user?.role === 'psychologist';
  const { data, isLoading } = usePsychologists();
  const me = isPsychologist ? data?.find((p) => p.userId === user?.id) ?? null : null;
  return { psychologist: me, isPsychologist, isLoading };
}
