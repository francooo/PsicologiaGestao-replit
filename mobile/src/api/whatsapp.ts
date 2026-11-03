import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './client';

// Reminders opened in WhatsApp with wa.me links. Same API as the web (server/routes/whatsapp.ts).

export type PhoneIssue = 'not_found' | 'no_phone' | 'invalid' | 'ambiguous' | null;

export interface ReminderItem {
  appointmentId: number;
  patientId: number | null;
  patientName: string;
  psychologistId: number;
  psychologistName: string | null;
  roomName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  phone: string | null;
  phoneDisplay: string | null;
  phoneIssue: PhoneIssue;
  message: string;
  reminderSentAt: string | null;
  reminderSentByName: string | null;
}

export interface RemindersResponse {
  date: string;
  tomorrow: string;
  items: ReminderItem[];
}

export const REMINDERS_KEY = ['/api/whatsapp/reminders'];
export const reminderKey = (id: number) => ['/api/whatsapp/appointments', id, 'reminder'];

export const PHONE_ISSUE_TEXT: Record<Exclude<PhoneIssue, null>, string> = {
  not_found: 'Não encontramos esse paciente no cadastro de pacientes.',
  no_phone: 'O cadastro do paciente está sem telefone.',
  invalid: 'O telefone do cadastro do paciente está incompleto.',
  ambiguous: 'Há mais de um paciente com esse nome e telefones diferentes.',
};

/** date null = tomorrow (the server decides, São Paulo time) */
export const useReminders = (date: string | null) =>
  useQuery({
    queryKey: [...REMINDERS_KEY, date],
    queryFn: () => api<RemindersResponse>(`/api/whatsapp/reminders${date ? `?date=${date}` : ''}`),
  });

export const useAppointmentReminder = (id: number) =>
  useQuery({ queryKey: reminderKey(id), queryFn: () => api<ReminderItem>(`/api/whatsapp/appointments/${id}/reminder`) });

export function useMarkReminderSent(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/api/whatsapp/appointments/${id}/reminder-sent`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDERS_KEY });
      queryClient.invalidateQueries({ queryKey: reminderKey(id) });
    },
  });
}
