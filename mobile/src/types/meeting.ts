export type MeetingStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface Meeting {
  id: number;
  psychologistId: number;
  patientId: number;
  title: string;
  description: string | null;
  meetLink: string | null;
  status: MeetingStatus | string;
  scheduledAt: string;
  durationMinutes: number;
  startedAt: string | null;
  endedAt: string | null;
  actualDuration: number | null;
  patientEmail: string | null;
  patientName: string | null;
  patientFullName?: string | null;
  patientPhotoUrl?: string | null;
  linkSentAt: string | null;
  notes: string | null;
  isToday?: boolean;
}
