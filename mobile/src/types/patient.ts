// Patient record shapes (shared/patient-schema.ts, as JSON)

export type PatientStatus = 'active' | 'inactive' | 'discharged';

export interface PatientDetail {
  id: number;
  fullName: string;
  cpf: string | null;
  birthDate: string | null;
  gender: string | null;
  maritalStatus: string | null;
  profession: string | null;
  address: string | null;
  phone: string;
  email: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  insuranceProvider: string | null;
  legalGuardianName: string | null;
  legalGuardianCpf: string | null;
  status: PatientStatus | string;
  photoUrl: string | null;
  psychologistId: number | null;
  psychologistName?: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientCounts {
  sessions: number;
  documents: number;
  assessments: number;
}

export interface MedicalRecord {
  id: number;
  patientId: number;
  chiefComplaint: string | null;
  personalHistory: string | null;
  familyHistory: string | null;
  currentMedications: boolean | null;
  medicationDetails: string | null;
  diagnosis: string | null;
  icd10Code: string | null;
  therapeuticObjectives: string | null;
  updatedAt: string;
}

export interface ClinicalSession {
  id: number;
  patientId: number;
  psychologistId: number;
  sessionDate: string;
  sessionTime: string;
  durationMinutes: number | null;
  sessionType: 'in-person' | 'online' | string;
  status: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  evolutionNotes: string;
  clinicalObservations: string | null;
  nextSteps: string | null;
  version: number | null;
  isActive: boolean | null;
  createdAt: string;
}

export interface PatientDocument {
  id: number;
  patientId: number;
  documentType: string;
  documentName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  /** Set once the AI summary was generated and saved (the text is fetched on demand) */
  aiSummaryAt?: string | null;
}

export interface Assessment {
  id: number;
  patientId: number;
  psychologistId: number;
  assessmentName: string;
  assessmentDate: string;
  results: string | null;
  observations: string | null;
  createdAt: string;
}

export type QuestionType = 'text' | 'textarea' | 'scale' | 'multiple_choice';

export interface CareQuestion {
  id?: number;
  questionText: string;
  questionType: QuestionType;
  options: string[] | null;
  isRequired: boolean;
  orderIndex: number;
}

export interface CareTemplate {
  id: number;
  psychologistId: number | null;
  title: string;
  description: string | null;
  isDefault: boolean | null;
  questions: CareQuestion[];
  questionCount?: number;
}

export interface CareDispatch {
  id: number;
  patientId: number;
  templateId: number | null;
  subject: string;
  customMessage: string | null;
  responseToken: string;
  tokenExpiresAt: string;
  status: 'sent' | 'opened' | 'answered' | 'expired' | string;
  sentToEmail: string;
  sentAt: string;
  answeredAt: string | null;
  responseCount?: number;
}

export interface CareResponseItem extends CareQuestion {
  id: number;
  response: {
    answerText: string | null;
    answerChoice: string | null;
    answerScale: number | null;
    submittedAt: string;
  } | null;
}
