import type { User } from './api';

export interface AdminPsychologist {
  id: number;
  userId: number;
  phone: string | null;
  crpNumber: string | null;
  bio: string | null;
  startedAtClinic: string | null;
  hourlyRate: string;
  user: User;
  age: number | null;
  specializations: { id: number; name: string; category: string | null }[];
  activePatientsCount: number;
  sessionsCount: number;
  monthsAtClinic: number | null;
}

export interface Commission {
  id: number;
  psychologistId: number;
  psychologistName: string;
  periodStart: string;
  periodEnd: string;
  totalBookings: number;
  totalRoomsValue: string;
  totalRepasse: string;
  status: 'pending' | 'paid' | 'cancelled' | string;
  paymentDate: string | null;
  paymentMethod: string | null;
  paymentNotes: string | null;
}

export interface CommissionItem {
  id?: number;
  bookingId: number;
  bookingDate: string;
  roomName: string | null;
  startTime: string | null;
  endTime: string | null;
  bookingValue: string | number;
  repasseValue: string | number;
}

export interface CommissionConfig {
  id: number;
  psychologistId: number;
  psychologistName: string;
  payoutType: 'percentual' | 'fixed';
  payoutValue: string;
  validFrom: string;
  validUntil: string | null;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
}

export interface RolePermission {
  id: number;
  role: string;
  permissionId: number;
}
