import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import type { Appointment, Patient, Psychologist, Room, RoomBooking } from '@/types/api';

type DateFilter = { date?: string; startDate?: string; endDate?: string; psychologistId?: number };

// Query keys follow the web convention (URL first) so invalidations read the same
export const keys = {
  appointments: (f?: DateFilter) => ['/api/appointments', f ?? {}] as const,
  roomBookings: (f?: DateFilter) => ['/api/room-bookings', f ?? {}] as const,
  rooms: ['/api/rooms'] as const,
  patients: (f?: { active?: boolean }) => ['/api/patients', f ?? {}] as const,
  psychologists: ['/api/psychologists'] as const,
};

export function useAppointments(filter?: DateFilter, enabled = true) {
  return useQuery({
    queryKey: keys.appointments(filter),
    queryFn: () => api<Appointment[]>('/api/appointments', { query: filter }),
    enabled,
  });
}

export function useRoomBookings(filter?: DateFilter, enabled = true) {
  return useQuery({
    queryKey: keys.roomBookings(filter),
    queryFn: () => api<RoomBooking[]>('/api/room-bookings', { query: filter }),
    enabled,
  });
}

export function useRooms() {
  return useQuery({ queryKey: keys.rooms, queryFn: () => api<Room[]>('/api/rooms') });
}

export function usePatients(filter?: { active?: boolean }) {
  return useQuery({
    queryKey: keys.patients(filter),
    queryFn: () =>
      api<Patient[]>('/api/patients', { query: filter?.active === false ? { active: 'false' } : undefined }),
  });
}

export function usePsychologists(enabled = true) {
  return useQuery({
    queryKey: keys.psychologists,
    queryFn: () => api<Psychologist[]>('/api/psychologists'),
    enabled,
  });
}
