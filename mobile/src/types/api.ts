// Shapes returned by the ConsultaPsi API (JSON — dates arrive as strings).
// Mirrors shared/schema.ts and shared/patient-schema.ts on the server.

// 'none': logged in but with no active company (no screen is available)
export type Role = 'admin' | 'psychologist' | 'receptionist' | 'manager' | 'none';

/** A company (clínica) the user belongs to, with their role there. */
export interface CompanySummary {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: Role;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: Role;
  status: 'active' | 'inactive' | 'pending' | string;
  profileImage: string | null;
  avatarUrl: string | null;
  googleId: string | null;
  birthDate: string | null;
  /** Role above is the one in activeCompany. */
  isPlatformAdmin: boolean;
  activeCompany: CompanySummary | null;
  companies: CompanySummary[];
}

export interface PsychologistUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  status: string;
  profileImage: string | null;
}

export interface Psychologist {
  id: number;
  userId: number;
  specialization: string | null;
  bio: string | null;
  hourlyRate: string;
  phone: string | null;
  crpNumber: string | null;
  startedAtClinic: string | null;
  user: PsychologistUser | null;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  hasWifi: boolean;
  hasAirConditioning: boolean;
  squareMeters: number | null;
  imageUrl: string | null;
  hourlyRate: string | null;
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'canceled'
  | 'completed'
  | 'pending-confirmation'
  | 'first-session';

export interface Appointment {
  id: number;
  patientName: string;
  psychologistId: number;
  roomId: number;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm[:ss]
  endTime: string;
  status: AppointmentStatus | string;
  notes: string | null;
  psychologist?: Psychologist | null;
  room?: Room | null;
}

export interface RoomBooking {
  id: number;
  roomId: number;
  psychologistId: number;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string | null;
  room?: Room | null;
  psychologist?: Psychologist | null;
}

export interface Transaction {
  id: number;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  date: string;
  responsibleId: number;
  relatedAppointmentId: number | null;
}

export interface Patient {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  status?: string | null;
  isActive?: boolean | null;
  psychologistId?: number | null;
  createdAt?: string | null;
  [key: string]: unknown;
}
