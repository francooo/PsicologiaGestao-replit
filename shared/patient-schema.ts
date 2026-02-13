import { pgTable, text, serial, integer, boolean, date, time, decimal, timestamp, primaryKey, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { users, psychologists } from "./schema";

// ========== PATIENT RECORD SYSTEM ==========

// Patients (Pacientes)
export const patients = pgTable("patients", {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    cpf: text("cpf").unique(),
    birthDate: date("birth_date"),
    gender: text("gender"), // masculino, feminino, outro, prefiro não informar
    maritalStatus: text("marital_status"), // solteiro, casado, divorciado, viúvo, união estável
    profession: text("profession"),
    address: text("address"),
    phone: text("phone").notNull(),
    email: text("email"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    insuranceProvider: text("insurance_provider"),
    legalGuardianName: text("legal_guardian_name"),
    legalGuardianCpf: text("legal_guardian_cpf"),
    status: text("status").notNull().default("active"), // active, inactive, discharged
    photoUrl: text("photo_url"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).pick({
    fullName: true,
    cpf: true,
    birthDate: true,
    gender: true,
    maritalStatus: true,
    profession: true,
    address: true,
    phone: true,
    email: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    insuranceProvider: true,
    legalGuardianName: true,
    legalGuardianCpf: true,
    status: true,
    photoUrl: true,
});

// Medical Records (Anamnese/Prontuário Inicial)
export const medicalRecords = pgTable("medical_records", {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id").notNull().references(() => patients.id),
    chiefComplaint: text("chief_complaint"), // Queixa principal
    personalHistory: text("personal_history"), // Histórico pessoal
    familyHistory: text("family_history"), // Histórico familiar
    currentMedications: boolean("current_medications").default(false),
    medicationDetails: text("medication_details"),
    diagnosis: text("diagnosis"),
    icd10Code: text("icd10_code"),
    therapeuticObjectives: text("therapeutic_objectives"),
    psychologistId: integer("psychologist_id").references(() => psychologists.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMedicalRecordSchema = createInsertSchema(medicalRecords).pick({
    patientId: true,
    chiefComplaint: true,
    personalHistory: true,
    familyHistory: true,
    currentMedications: true,
    medicationDetails: true,
    diagnosis: true,
    icd10Code: true,
    therapeuticObjectives: true,
    psychologistId: true,
});

// Clinical Sessions (Evoluções/Sessões)
export const clinicalSessions = pgTable("clinical_sessions", {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id").notNull().references(() => patients.id),
    psychologistId: integer("psychologist_id").notNull().references(() => psychologists.id),
    sessionDate: date("session_date").notNull(),
    sessionTime: time("session_time").notNull(),
    durationMinutes: integer("duration_minutes").default(50),
    sessionType: text("session_type").notNull().default("in-person"), // in-person, online
    status: text("status").notNull().default("completed"), // completed, cancelled, no-show

    // SOAP Format (optional structured fields)
    subjective: text("subjective"), // S: What patient reports
    objective: text("objective"), // O: Observations
    assessment: text("assessment"), // A: Clinical assessment
    plan: text("plan"), // P: Treatment plan

    // Free-form evolution
    evolutionNotes: text("evolution_notes").notNull(),
    clinicalObservations: text("clinical_observations"),
    nextSteps: text("next_steps"),

    // Version control
    version: integer("version").default(1),
    isActive: boolean("is_active").default(true),
    editedBy: integer("edited_by").references(() => users.id),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClinicalSessionSchema = createInsertSchema(clinicalSessions).pick({
    patientId: true,
    psychologistId: true,
    sessionDate: true,
    sessionTime: true,
    durationMinutes: true,
    sessionType: true,
    status: true,
    subjective: true,
    objective: true,
    assessment: true,
    plan: true,
    evolutionNotes: true,
    clinicalObservations: true,
    nextSteps: true,
});

// Patient Documents (Documentos)
export const patientDocuments = pgTable("patient_documents", {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id").notNull().references(() => patients.id),
    documentType: text("document_type").notNull(), // consent, contract, report, exam, other
    documentName: text("document_name").notNull(),
    filePath: text("file_path").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPatientDocumentSchema = createInsertSchema(patientDocuments).pick({
    patientId: true,
    documentType: true,
    documentName: true,
    filePath: true,
    fileSize: true,
    mimeType: true,
});

// Psychological Assessments (Avaliações/Testes)
export const psychologicalAssessments = pgTable("psychological_assessments", {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id").notNull().references(() => patients.id),
    psychologistId: integer("psychologist_id").notNull().references(() => psychologists.id),
    assessmentName: text("assessment_name").notNull(),
    assessmentDate: date("assessment_date").notNull(),
    results: text("results"),
    filePath: text("file_path"),
    observations: text("observations"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPsychologicalAssessmentSchema = createInsertSchema(psychologicalAssessments).pick({
    patientId: true,
    psychologistId: true,
    assessmentName: true,
    assessmentDate: true,
    results: true,
    filePath: true,
    observations: true,
});

// Audit Logs (Logs de Auditoria - LGPD)
export const auditLogs = pgTable("audit_logs", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    action: text("action").notNull(), // view, create, update, delete, export, print
    resourceType: text("resource_type").notNull(), // patient, medical_record, clinical_session, document
    resourceId: integer("resource_id").notNull(),
    patientId: integer("patient_id").references(() => patients.id),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    details: jsonb("details"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Session History (Histórico de Versões)
export const sessionHistory = pgTable("session_history", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull().references(() => clinicalSessions.id),
    version: integer("version").notNull(),
    evolutionNotes: text("evolution_notes"),
    clinicalObservations: text("clinical_observations"),
    editedBy: integer("edited_by").notNull().references(() => users.id),
    editedAt: timestamp("edited_at").notNull().defaultNow(),
});

// Relations
export const patientsRelations = relations(patients, ({ one, many }) => ({
    creator: one(users, {
        fields: [patients.createdBy],
        references: [users.id],
    }),
    medicalRecord: one(medicalRecords),
    clinicalSessions: many(clinicalSessions),
    documents: many(patientDocuments),
    assessments: many(psychologicalAssessments),
    auditLogs: many(auditLogs),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
    patient: one(patients, {
        fields: [medicalRecords.patientId],
        references: [patients.id],
    }),
    psychologist: one(psychologists, {
        fields: [medicalRecords.psychologistId],
        references: [psychologists.id],
    }),
}));

export const clinicalSessionsRelations = relations(clinicalSessions, ({ one, many }) => ({
    patient: one(patients, {
        fields: [clinicalSessions.patientId],
        references: [patients.id],
    }),
    psychologist: one(psychologists, {
        fields: [clinicalSessions.psychologistId],
        references: [psychologists.id],
    }),
    editor: one(users, {
        fields: [clinicalSessions.editedBy],
        references: [users.id],
    }),
    history: many(sessionHistory),
}));

export const patientDocumentsRelations = relations(patientDocuments, ({ one }) => ({
    patient: one(patients, {
        fields: [patientDocuments.patientId],
        references: [patients.id],
    }),
    uploader: one(users, {
        fields: [patientDocuments.uploadedBy],
        references: [users.id],
    }),
}));

export const psychologicalAssessmentsRelations = relations(psychologicalAssessments, ({ one }) => ({
    patient: one(patients, {
        fields: [psychologicalAssessments.patientId],
        references: [patients.id],
    }),
    psychologist: one(psychologists, {
        fields: [psychologicalAssessments.psychologistId],
        references: [psychologists.id],
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
    patient: one(patients, {
        fields: [auditLogs.patientId],
        references: [patients.id],
    }),
}));

export const sessionHistoryRelations = relations(sessionHistory, ({ one }) => ({
    session: one(clinicalSessions, {
        fields: [sessionHistory.sessionId],
        references: [clinicalSessions.id],
    }),
    editor: one(users, {
        fields: [sessionHistory.editedBy],
        references: [users.id],
    }),
}));

// Export types
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = z.infer<typeof insertMedicalRecordSchema>;

export type ClinicalSession = typeof clinicalSessions.$inferSelect;
export type InsertClinicalSession = z.infer<typeof insertClinicalSessionSchema>;

export type PatientDocument = typeof patientDocuments.$inferSelect;
export type InsertPatientDocument = z.infer<typeof insertPatientDocumentSchema>;

export type PsychologicalAssessment = typeof psychologicalAssessments.$inferSelect;
export type InsertPsychologicalAssessment = z.infer<typeof insertPsychologicalAssessmentSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type SessionHistory = typeof sessionHistory.$inferSelect;
