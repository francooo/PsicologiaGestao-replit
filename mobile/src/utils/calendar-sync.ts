import { toast } from '@/utils/toast';

/** Server's `googleCalendar` field on a saved appointment / room booking (see server/lib/calendar-sync.ts). */
export type CalendarSync = 'synced' | 'removed' | 'not_connected' | 'skipped' | 'failed';

/** Success toast for a save; explains when it did not reach the psychologist's Google Calendar. */
export function savedToast(title: string, message: string, status?: CalendarSync) {
  if (status === 'not_connected')
    return toast.info(title, 'Não foi para o Google Calendar: a psicóloga selecionada não conectou a agenda em Configurações.');
  if (status === 'failed') return toast.info(title, 'Não foi possível enviar para o Google Calendar agora.');
  toast.success(title, message);
}
