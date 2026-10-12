import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import type {
  Assessment,
  CareDispatch,
  CareTemplate,
  ClinicalSession,
  MedicalRecord,
  PatientCounts,
  PatientDetail,
  PatientDocument,
} from '@/types/patient';

export const patientKeys = {
  detail: (id: number) => ['/api/patients', id] as const,
  counts: (id: number) => ['/api/patients', id, 'counts'] as const,
  record: (id: number) => ['/api/patients', id, 'medical-record'] as const,
  sessions: (id: number) => ['/api/patients', id, 'sessions'] as const,
  documents: (id: number) => ['/api/patients', id, 'documents'] as const,
  assessments: (id: number) => ['/api/patients', id, 'assessments'] as const,
  dispatches: (id: number) => ['/api/care/patients', id, 'dispatches'] as const,
  templates: ['/api/care/templates'] as const,
};

export const usePatient = (id: number) =>
  useQuery({ queryKey: patientKeys.detail(id), queryFn: () => api<PatientDetail>(`/api/patients/${id}`) });

export const usePatientCounts = (id: number) =>
  useQuery({ queryKey: patientKeys.counts(id), queryFn: () => api<PatientCounts>(`/api/patients/${id}/counts`) });

export const useMedicalRecord = (id: number) =>
  useQuery({
    queryKey: patientKeys.record(id),
    queryFn: () => api<MedicalRecord | null>(`/api/patients/${id}/medical-record`),
  });

export const useSessions = (id: number) =>
  useQuery({ queryKey: patientKeys.sessions(id), queryFn: () => api<ClinicalSession[]>(`/api/patients/${id}/sessions`) });

export const useDocuments = (id: number) =>
  useQuery({ queryKey: patientKeys.documents(id), queryFn: () => api<PatientDocument[]>(`/api/patients/${id}/documents`) });

export const useAssessments = (id: number) =>
  useQuery({ queryKey: patientKeys.assessments(id), queryFn: () => api<Assessment[]>(`/api/patients/${id}/assessments`) });

export const useDispatches = (id: number) =>
  useQuery({
    queryKey: patientKeys.dispatches(id),
    queryFn: () => api<CareDispatch[]>(`/api/care/patients/${id}/dispatches`),
  });

export const useCareTemplates = () =>
  useQuery({ queryKey: patientKeys.templates, queryFn: () => api<CareTemplate[]>('/api/care/templates') });
