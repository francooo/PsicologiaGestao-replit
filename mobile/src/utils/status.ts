import type { BadgeTone } from '@/components/ui/Badge';

// Same labels as the web dashboard/appointments badges
const appointmentStatus: Record<string, { label: string; tone: BadgeTone }> = {
  confirmed: { label: 'Confirmado', tone: 'primary' },
  scheduled: { label: 'Aguardando', tone: 'warning' },
  'pending-confirmation': { label: 'Pendente', tone: 'warning' },
  completed: { label: 'Concluído', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
  'first-session': { label: 'Primeira sessão', tone: 'lilac' },
};

export function appointmentStatusInfo(status: string) {
  return appointmentStatus[status] ?? { label: status, tone: 'neutral' as BadgeTone };
}

export const roleLabels: Record<string, string> = {
  admin: 'Administrador(a)',
  psychologist: 'Psicólogo(a)',
  receptionist: 'Recepcionista',
  manager: 'Gestor(a)',
};
