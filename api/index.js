var __defProp = Object.defineProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/vercel-handler.ts
import "dotenv/config";

// server/app.ts
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appointments: () => appointments,
  appointmentsRelations: () => appointmentsRelations,
  auditLogs: () => auditLogs,
  auditLogsRelations: () => auditLogsRelations,
  calendarEvents: () => calendarEvents,
  calendarEventsRelations: () => calendarEventsRelations,
  careDispatchQuestions: () => careDispatchQuestions,
  careDispatchQuestionsRelations: () => careDispatchQuestionsRelations,
  careDispatches: () => careDispatches,
  careDispatchesRelations: () => careDispatchesRelations,
  careResponses: () => careResponses,
  careResponsesRelations: () => careResponsesRelations,
  careTemplateQuestions: () => careTemplateQuestions,
  careTemplateQuestionsRelations: () => careTemplateQuestionsRelations,
  careTemplates: () => careTemplates,
  careTemplatesRelations: () => careTemplatesRelations,
  clinicalSessions: () => clinicalSessions,
  clinicalSessionsRelations: () => clinicalSessionsRelations,
  commissionItems: () => commissionItems,
  commissionPayoutConfigs: () => commissionPayoutConfigs,
  commissions: () => commissions,
  googleTokens: () => googleTokens,
  googleTokensRelations: () => googleTokensRelations,
  insertAppointmentSchema: () => insertAppointmentSchema,
  insertCalendarEventSchema: () => insertCalendarEventSchema,
  insertCareDispatchQuestionSchema: () => insertCareDispatchQuestionSchema,
  insertCareDispatchSchema: () => insertCareDispatchSchema,
  insertCareResponseSchema: () => insertCareResponseSchema,
  insertCareTemplateQuestionSchema: () => insertCareTemplateQuestionSchema,
  insertCareTemplateSchema: () => insertCareTemplateSchema,
  insertClinicalSessionSchema: () => insertClinicalSessionSchema,
  insertCommissionPayoutConfigSchema: () => insertCommissionPayoutConfigSchema,
  insertGoogleTokenSchema: () => insertGoogleTokenSchema,
  insertInvoiceSchema: () => insertInvoiceSchema,
  insertMedicalRecordSchema: () => insertMedicalRecordSchema,
  insertMeetingSchema: () => insertMeetingSchema,
  insertPasswordResetTokenSchema: () => insertPasswordResetTokenSchema,
  insertPatientDocumentSchema: () => insertPatientDocumentSchema,
  insertPatientSchema: () => insertPatientSchema,
  insertPermissionSchema: () => insertPermissionSchema,
  insertPsychologicalAssessmentSchema: () => insertPsychologicalAssessmentSchema,
  insertPsychologistSchema: () => insertPsychologistSchema,
  insertRolePermissionSchema: () => insertRolePermissionSchema,
  insertRoomBookingSchema: () => insertRoomBookingSchema,
  insertRoomSchema: () => insertRoomSchema,
  insertSpecializationAreaSchema: () => insertSpecializationAreaSchema,
  insertTransactionSchema: () => insertTransactionSchema,
  insertUserSchema: () => insertUserSchema,
  invoices: () => invoices,
  invoicesRelations: () => invoicesRelations,
  medicalRecords: () => medicalRecords,
  medicalRecordsRelations: () => medicalRecordsRelations,
  meetings: () => meetings,
  meetingsRelations: () => meetingsRelations,
  passwordResetTokens: () => passwordResetTokens,
  passwordResetTokensRelations: () => passwordResetTokensRelations,
  patientDocuments: () => patientDocuments,
  patientDocumentsRelations: () => patientDocumentsRelations,
  patientTransfers: () => patientTransfers,
  patients: () => patients,
  patientsRelations: () => patientsRelations,
  permissions: () => permissions,
  permissionsRelations: () => permissionsRelations,
  psychologicalAssessments: () => psychologicalAssessments,
  psychologicalAssessmentsRelations: () => psychologicalAssessmentsRelations,
  psychologistSpecializations: () => psychologistSpecializations,
  psychologistSpecializationsRelations: () => psychologistSpecializationsRelations,
  psychologists: () => psychologists,
  psychologistsRelations: () => psychologistsRelations,
  rolePermissions: () => rolePermissions,
  rolePermissionsRelations: () => rolePermissionsRelations,
  roomBookings: () => roomBookings,
  roomBookingsRelations: () => roomBookingsRelations,
  rooms: () => rooms,
  roomsRelations: () => roomsRelations,
  sessionHistory: () => sessionHistory,
  sessionHistoryRelations: () => sessionHistoryRelations,
  specializationAreas: () => specializationAreas,
  transactions: () => transactions,
  transactionsRelations: () => transactionsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable as pgTable2, text as text2, serial as serial2, integer as integer2, boolean as boolean2, date as date2, time as time2, decimal as decimal2, timestamp as timestamp2, jsonb as jsonb2, unique } from "drizzle-orm/pg-core";
import { createInsertSchema as createInsertSchema2 } from "drizzle-zod";
import { z } from "zod";
import { relations as relations2 } from "drizzle-orm";

// shared/pg-types.ts
import { customType } from "drizzle-orm/pg-core";
var bytea = customType({
  dataType() {
    return "bytea";
  }
});

// shared/patient-schema.ts
import { pgTable, text, serial, integer, boolean, date, time, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  cpf: text("cpf").unique(),
  birthDate: date("birth_date"),
  gender: text("gender"),
  // masculino, feminino, outro, prefiro não informar
  maritalStatus: text("marital_status"),
  // solteiro, casado, divorciado, viúvo, união estável
  profession: text("profession"),
  address: text("address"),
  phone: text("phone").notNull(),
  email: text("email"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  insuranceProvider: text("insurance_provider"),
  legalGuardianName: text("legal_guardian_name"),
  legalGuardianCpf: text("legal_guardian_cpf"),
  status: text("status").notNull().default("active"),
  // active, inactive, discharged
  photoUrl: text("photo_url"),
  // psychologist_id: psícólogo responsável pela carteira do paciente
  psychologistId: integer("psychologist_id").references(() => psychologists.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertPatientSchema = createInsertSchema(patients).pick({
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
  psychologistId: true
});
var medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  chiefComplaint: text("chief_complaint"),
  // Queixa principal
  personalHistory: text("personal_history"),
  // Histórico pessoal
  familyHistory: text("family_history"),
  // Histórico familiar
  currentMedications: boolean("current_medications").default(false),
  medicationDetails: text("medication_details"),
  diagnosis: text("diagnosis"),
  icd10Code: text("icd10_code"),
  therapeuticObjectives: text("therapeutic_objectives"),
  psychologistId: integer("psychologist_id").references(() => psychologists.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertMedicalRecordSchema = createInsertSchema(medicalRecords).pick({
  patientId: true,
  chiefComplaint: true,
  personalHistory: true,
  familyHistory: true,
  currentMedications: true,
  medicationDetails: true,
  diagnosis: true,
  icd10Code: true,
  therapeuticObjectives: true,
  psychologistId: true
});
var clinicalSessions = pgTable("clinical_sessions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  psychologistId: integer("psychologist_id").notNull().references(() => psychologists.id),
  sessionDate: date("session_date").notNull(),
  sessionTime: time("session_time").notNull(),
  durationMinutes: integer("duration_minutes").default(50),
  sessionType: text("session_type").notNull().default("in-person"),
  // in-person, online
  status: text("status").notNull().default("completed"),
  // completed, cancelled, no-show
  // SOAP Format (optional structured fields)
  subjective: text("subjective"),
  // S: What patient reports
  objective: text("objective"),
  // O: Observations
  assessment: text("assessment"),
  // A: Clinical assessment
  plan: text("plan"),
  // P: Treatment plan
  // Free-form evolution
  evolutionNotes: text("evolution_notes").notNull(),
  clinicalObservations: text("clinical_observations"),
  nextSteps: text("next_steps"),
  // Version control
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  editedBy: integer("edited_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertClinicalSessionSchema = createInsertSchema(clinicalSessions).pick({
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
  nextSteps: true
});
var patientDocuments = pgTable("patient_documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  documentType: text("document_type").notNull(),
  // consent, contract, report, exam, other
  documentName: text("document_name").notNull(),
  filePath: text("file_path"),
  // legado (caminho em disco); novos uploads usam fileData
  fileData: bytea("file_data"),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertPatientDocumentSchema = createInsertSchema(patientDocuments).pick({
  patientId: true,
  documentType: true,
  documentName: true,
  fileSize: true,
  mimeType: true
});
var psychologicalAssessments = pgTable("psychological_assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  psychologistId: integer("psychologist_id").notNull().references(() => psychologists.id),
  assessmentName: text("assessment_name").notNull(),
  assessmentDate: date("assessment_date").notNull(),
  results: text("results"),
  filePath: text("file_path"),
  observations: text("observations"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertPsychologicalAssessmentSchema = createInsertSchema(psychologicalAssessments).pick({
  patientId: true,
  psychologistId: true,
  assessmentName: true,
  assessmentDate: true,
  results: true,
  filePath: true,
  observations: true
});
var auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  // view, create, update, delete, export, print
  resourceType: text("resource_type").notNull(),
  // patient, medical_record, clinical_session, document
  resourceId: integer("resource_id").notNull(),
  patientId: integer("patient_id").references(() => patients.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var sessionHistory = pgTable("session_history", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => clinicalSessions.id),
  version: integer("version").notNull(),
  evolutionNotes: text("evolution_notes"),
  clinicalObservations: text("clinical_observations"),
  editedBy: integer("edited_by").notNull().references(() => users.id),
  editedAt: timestamp("edited_at").notNull().defaultNow()
});
var patientsRelations = relations(patients, ({ one, many }) => ({
  creator: one(users, {
    fields: [patients.createdBy],
    references: [users.id]
  }),
  medicalRecord: one(medicalRecords),
  clinicalSessions: many(clinicalSessions),
  documents: many(patientDocuments),
  assessments: many(psychologicalAssessments),
  auditLogs: many(auditLogs)
}));
var medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id]
  }),
  psychologist: one(psychologists, {
    fields: [medicalRecords.psychologistId],
    references: [psychologists.id]
  })
}));
var clinicalSessionsRelations = relations(clinicalSessions, ({ one, many }) => ({
  patient: one(patients, {
    fields: [clinicalSessions.patientId],
    references: [patients.id]
  }),
  psychologist: one(psychologists, {
    fields: [clinicalSessions.psychologistId],
    references: [psychologists.id]
  }),
  editor: one(users, {
    fields: [clinicalSessions.editedBy],
    references: [users.id]
  }),
  history: many(sessionHistory)
}));
var patientDocumentsRelations = relations(patientDocuments, ({ one }) => ({
  patient: one(patients, {
    fields: [patientDocuments.patientId],
    references: [patients.id]
  }),
  uploader: one(users, {
    fields: [patientDocuments.uploadedBy],
    references: [users.id]
  })
}));
var psychologicalAssessmentsRelations = relations(psychologicalAssessments, ({ one }) => ({
  patient: one(patients, {
    fields: [psychologicalAssessments.patientId],
    references: [patients.id]
  }),
  psychologist: one(psychologists, {
    fields: [psychologicalAssessments.psychologistId],
    references: [psychologists.id]
  })
}));
var auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  }),
  patient: one(patients, {
    fields: [auditLogs.patientId],
    references: [patients.id]
  })
}));
var sessionHistoryRelations = relations(sessionHistory, ({ one }) => ({
  session: one(clinicalSessions, {
    fields: [sessionHistory.sessionId],
    references: [clinicalSessions.id]
  }),
  editor: one(users, {
    fields: [sessionHistory.editedBy],
    references: [users.id]
  })
}));
var careTemplates = pgTable("care_templates", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id").references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});
var insertCareTemplateSchema = createInsertSchema(careTemplates).pick({
  psychologistId: true,
  title: true,
  description: true,
  isDefault: true
});
var careTemplateQuestions = pgTable("care_template_questions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => careTemplates.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 50 }).notNull().default("text"),
  // text | textarea | scale | multiple_choice
  options: jsonb("options"),
  // for multiple_choice: string[]
  isRequired: boolean("is_required").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertCareTemplateQuestionSchema = createInsertSchema(careTemplateQuestions).pick({
  templateId: true,
  questionText: true,
  questionType: true,
  options: true,
  isRequired: true,
  orderIndex: true
});
var careDispatches = pgTable("care_dispatches", {
  id: serial("id").primaryKey(),
  psychologistId: integer("psychologist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  templateId: integer("template_id").references(() => careTemplates.id, { onDelete: "set null" }),
  subject: varchar("subject", { length: 255 }).notNull(),
  customMessage: text("custom_message"),
  responseToken: varchar("response_token", { length: 255 }).notNull().unique(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("sent"),
  // sent | opened | answered | expired
  sentToEmail: varchar("sent_to_email", { length: 255 }).notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  openedAt: timestamp("opened_at"),
  answeredAt: timestamp("answered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertCareDispatchSchema = createInsertSchema(careDispatches).pick({
  psychologistId: true,
  patientId: true,
  templateId: true,
  subject: true,
  customMessage: true,
  responseToken: true,
  tokenExpiresAt: true,
  status: true,
  sentToEmail: true
});
var careDispatchQuestions = pgTable("care_dispatch_questions", {
  id: serial("id").primaryKey(),
  dispatchId: integer("dispatch_id").notNull().references(() => careDispatches.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 50 }).notNull().default("text"),
  options: jsonb("options"),
  isRequired: boolean("is_required").notNull().default(true),
  orderIndex: integer("order_index").notNull().default(0)
});
var insertCareDispatchQuestionSchema = createInsertSchema(careDispatchQuestions).pick({
  dispatchId: true,
  questionText: true,
  questionType: true,
  options: true,
  isRequired: true,
  orderIndex: true
});
var careResponses = pgTable("care_responses", {
  id: serial("id").primaryKey(),
  dispatchId: integer("dispatch_id").notNull().references(() => careDispatches.id, { onDelete: "cascade" }),
  dispatchQuestionId: integer("dispatch_question_id").notNull().references(() => careDispatchQuestions.id, { onDelete: "cascade" }),
  answerText: text("answer_text"),
  answerChoice: varchar("answer_choice", { length: 255 }),
  answerScale: integer("answer_scale"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow()
});
var insertCareResponseSchema = createInsertSchema(careResponses).pick({
  dispatchId: true,
  dispatchQuestionId: true,
  answerText: true,
  answerChoice: true,
  answerScale: true
});
var careTemplatesRelations = relations(careTemplates, ({ one, many }) => ({
  psychologist: one(users, {
    fields: [careTemplates.psychologistId],
    references: [users.id]
  }),
  questions: many(careTemplateQuestions),
  dispatches: many(careDispatches)
}));
var careTemplateQuestionsRelations = relations(careTemplateQuestions, ({ one }) => ({
  template: one(careTemplates, {
    fields: [careTemplateQuestions.templateId],
    references: [careTemplates.id]
  })
}));
var careDispatchesRelations = relations(careDispatches, ({ one, many }) => ({
  psychologist: one(users, {
    fields: [careDispatches.psychologistId],
    references: [users.id]
  }),
  patient: one(patients, {
    fields: [careDispatches.patientId],
    references: [patients.id]
  }),
  template: one(careTemplates, {
    fields: [careDispatches.templateId],
    references: [careTemplates.id]
  }),
  questions: many(careDispatchQuestions),
  responses: many(careResponses)
}));
var careDispatchQuestionsRelations = relations(careDispatchQuestions, ({ one, many }) => ({
  dispatch: one(careDispatches, {
    fields: [careDispatchQuestions.dispatchId],
    references: [careDispatches.id]
  }),
  responses: many(careResponses)
}));
var careResponsesRelations = relations(careResponses, ({ one }) => ({
  dispatch: one(careDispatches, {
    fields: [careResponses.dispatchId],
    references: [careDispatches.id]
  }),
  question: one(careDispatchQuestions, {
    fields: [careResponses.dispatchQuestionId],
    references: [careDispatchQuestions.id]
  })
}));
var patientTransfers = pgTable("patient_transfers", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  fromPsychologistId: integer("from_psychologist_id").references(() => psychologists.id),
  toPsychologistId: integer("to_psychologist_id").notNull().references(() => psychologists.id),
  transferredByAdminId: integer("transferred_by_admin_id").notNull().references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// shared/schema.ts
var users = pgTable2("users", {
  id: serial2("id").primaryKey(),
  username: text2("username").notNull().unique(),
  password: text2("password"),
  email: text2("email").notNull().unique(),
  fullName: text2("full_name").notNull(),
  role: text2("role").notNull().default("psychologist"),
  // admin, psychologist, receptionist
  status: text2("status").notNull().default("active"),
  // active, inactive, pending
  profileImage: text2("profile_image"),
  profileImageData: bytea("profile_image_data"),
  profileImageMimeType: text2("profile_image_mime_type"),
  googleId: text2("google_id").unique(),
  avatarUrl: text2("avatar_url"),
  birthDate: date2("birth_date")
});
var insertUserSchema = createInsertSchema2(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  profileImage: true,
  googleId: true,
  avatarUrl: true
});
var psychologists = pgTable2("psychologists", {
  id: serial2("id").primaryKey(),
  userId: integer2("user_id").notNull(),
  specialization: text2("specialization"),
  bio: text2("bio"),
  hourlyRate: decimal2("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  phone: text2("phone"),
  crpNumber: text2("crp_number"),
  startedAtClinic: date2("started_at_clinic")
});
var insertPsychologistSchema = createInsertSchema2(psychologists).pick({
  userId: true,
  specialization: true,
  bio: true,
  hourlyRate: true,
  phone: true,
  crpNumber: true,
  startedAtClinic: true
}).extend({
  hourlyRate: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ])
});
var specializationAreas = pgTable2("specialization_areas", {
  id: serial2("id").primaryKey(),
  name: text2("name").notNull().unique(),
  category: text2("category"),
  isCustom: boolean2("is_custom").notNull().default(false),
  createdAt: timestamp2("created_at").notNull().defaultNow()
});
var insertSpecializationAreaSchema = createInsertSchema2(specializationAreas).pick({
  name: true,
  category: true,
  isCustom: true
});
var psychologistSpecializations = pgTable2("psychologist_specializations", {
  id: serial2("id").primaryKey(),
  psychologistId: integer2("psychologist_id").notNull().references(() => psychologists.id, { onDelete: "cascade" }),
  specializationAreaId: integer2("specialization_area_id").notNull().references(() => specializationAreas.id, { onDelete: "cascade" }),
  createdAt: timestamp2("created_at").notNull().defaultNow()
}, (t) => [
  unique("psych_spec_unique").on(t.psychologistId, t.specializationAreaId)
]);
var psychologistSpecializationsRelations = relations2(psychologistSpecializations, ({ one }) => ({
  psychologist: one(psychologists, {
    fields: [psychologistSpecializations.psychologistId],
    references: [psychologists.id]
  }),
  area: one(specializationAreas, {
    fields: [psychologistSpecializations.specializationAreaId],
    references: [specializationAreas.id]
  })
}));
var rooms = pgTable2("rooms", {
  id: serial2("id").primaryKey(),
  name: text2("name").notNull(),
  capacity: integer2("capacity").notNull(),
  hasWifi: boolean2("has_wifi").notNull().default(true),
  hasAirConditioning: boolean2("has_air_conditioning").notNull().default(true),
  squareMeters: integer2("square_meters"),
  imageUrl: text2("image_url"),
  hourlyRate: decimal2("hourly_rate", { precision: 10, scale: 2 })
});
var insertRoomSchema = createInsertSchema2(rooms).pick({
  name: true,
  capacity: true,
  hasWifi: true,
  hasAirConditioning: true,
  squareMeters: true,
  imageUrl: true,
  hourlyRate: true
});
var appointments = pgTable2("appointments", {
  id: serial2("id").primaryKey(),
  patientName: text2("patient_name").notNull(),
  psychologistId: integer2("psychologist_id").notNull(),
  roomId: integer2("room_id").notNull(),
  date: date2("date").notNull(),
  startTime: time2("start_time").notNull(),
  endTime: time2("end_time").notNull(),
  status: text2("status").notNull().default("scheduled"),
  // scheduled, confirmed, canceled, completed, pending-confirmation (para agendamentos rápidos via WhatsApp)
  notes: text2("notes")
});
var insertAppointmentSchema = createInsertSchema2(appointments).pick({
  patientName: true,
  psychologistId: true,
  roomId: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  notes: true
});
var transactions = pgTable2("transactions", {
  id: serial2("id").primaryKey(),
  description: text2("description").notNull(),
  amount: decimal2("amount", { precision: 10, scale: 2 }).notNull(),
  type: text2("type").notNull(),
  // income, expense
  category: text2("category").notNull(),
  date: date2("date").notNull(),
  responsibleId: integer2("responsible_id").notNull(),
  relatedAppointmentId: integer2("related_appointment_id")
});
var insertTransactionSchema = createInsertSchema2(transactions).pick({
  description: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  responsibleId: true,
  relatedAppointmentId: true
}).extend({
  amount: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ])
});
var roomBookings = pgTable2("room_bookings", {
  id: serial2("id").primaryKey(),
  roomId: integer2("room_id").notNull(),
  psychologistId: integer2("psychologist_id").notNull(),
  date: date2("date").notNull(),
  startTime: time2("start_time").notNull(),
  endTime: time2("end_time").notNull(),
  purpose: text2("purpose")
});
var insertRoomBookingSchema = createInsertSchema2(roomBookings).pick({
  roomId: true,
  psychologistId: true,
  date: true,
  startTime: true,
  endTime: true,
  purpose: true
});
var permissions = pgTable2("permissions", {
  id: serial2("id").primaryKey(),
  name: text2("name").notNull().unique(),
  description: text2("description")
});
var rolePermissions = pgTable2("role_permissions", {
  id: serial2("id").primaryKey(),
  role: text2("role").notNull(),
  permissionId: integer2("permission_id").notNull()
});
var insertPermissionSchema = createInsertSchema2(permissions).pick({
  name: true,
  description: true
});
var insertRolePermissionSchema = createInsertSchema2(rolePermissions).pick({
  role: true,
  permissionId: true
});
var usersRelations = relations2(users, ({ one, many }) => ({
  psychologist: one(psychologists, {
    fields: [users.id],
    references: [psychologists.userId]
  }),
  transactions: many(transactions, {
    relationName: "userTransactions"
  }),
  invoices: many(invoices, {
    relationName: "userInvoices"
  })
}));
var psychologistsRelations = relations2(psychologists, ({ one, many }) => ({
  user: one(users, {
    fields: [psychologists.userId],
    references: [users.id]
  }),
  appointments: many(appointments, {
    relationName: "psychologistAppointments"
  }),
  roomBookings: many(roomBookings, {
    relationName: "psychologistRoomBookings"
  })
}));
var roomsRelations = relations2(rooms, ({ many }) => ({
  appointments: many(appointments, {
    relationName: "roomAppointments"
  }),
  bookings: many(roomBookings, {
    relationName: "roomBookings"
  })
}));
var appointmentsRelations = relations2(appointments, ({ one, many }) => ({
  psychologist: one(psychologists, {
    fields: [appointments.psychologistId],
    references: [psychologists.id]
  }),
  room: one(rooms, {
    fields: [appointments.roomId],
    references: [rooms.id]
  }),
  transactions: many(transactions, {
    relationName: "appointmentTransactions"
  })
}));
var transactionsRelations = relations2(transactions, ({ one }) => ({
  responsibleUser: one(users, {
    fields: [transactions.responsibleId],
    references: [users.id],
    relationName: "userTransactions"
  }),
  appointment: one(appointments, {
    fields: [transactions.relatedAppointmentId],
    references: [appointments.id],
    relationName: "appointmentTransactions"
  })
}));
var roomBookingsRelations = relations2(roomBookings, ({ one }) => ({
  room: one(rooms, {
    fields: [roomBookings.roomId],
    references: [rooms.id],
    relationName: "roomBookings"
  }),
  psychologist: one(psychologists, {
    fields: [roomBookings.psychologistId],
    references: [psychologists.id],
    relationName: "psychologistRoomBookings"
  })
}));
var permissionsRelations = relations2(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions, {
    relationName: "permissionRoles"
  })
}));
var rolePermissionsRelations = relations2(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
    relationName: "permissionRoles"
  })
}));
var googleTokens = pgTable2("google_tokens", {
  id: serial2("id").primaryKey(),
  userId: integer2("user_id").notNull().references(() => users.id),
  accessToken: text2("access_token").notNull(),
  refreshToken: text2("refresh_token"),
  expiryDate: timestamp2("expiry_date").notNull(),
  calendarId: text2("calendar_id"),
  createdAt: timestamp2("created_at").notNull().defaultNow(),
  updatedAt: timestamp2("updated_at").notNull().defaultNow()
});
var insertGoogleTokenSchema = createInsertSchema2(googleTokens).pick({
  userId: true,
  accessToken: true,
  refreshToken: true,
  expiryDate: true,
  calendarId: true
});
var googleTokensRelations = relations2(googleTokens, ({ one }) => ({
  user: one(users, {
    fields: [googleTokens.userId],
    references: [users.id]
  })
}));
var calendarEvents = pgTable2("calendar_events", {
  id: serial2("id").primaryKey(),
  appointmentId: integer2("appointment_id").notNull().references(() => appointments.id),
  googleEventId: text2("google_event_id").notNull(),
  userId: integer2("user_id").notNull().references(() => users.id),
  lastSynced: timestamp2("last_synced").notNull().defaultNow()
});
var insertCalendarEventSchema = createInsertSchema2(calendarEvents).pick({
  appointmentId: true,
  googleEventId: true,
  userId: true
});
var calendarEventsRelations = relations2(calendarEvents, ({ one }) => ({
  appointment: one(appointments, {
    fields: [calendarEvents.appointmentId],
    references: [appointments.id]
  }),
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id]
  })
}));
var passwordResetTokens = pgTable2("password_reset_tokens", {
  id: serial2("id").primaryKey(),
  userId: integer2("user_id").notNull().references(() => users.id),
  token: text2("token").notNull().unique(),
  expiresAt: timestamp2("expires_at").notNull(),
  used: boolean2("used").notNull().default(false),
  createdAt: timestamp2("created_at").notNull().defaultNow()
});
var insertPasswordResetTokenSchema = createInsertSchema2(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
  used: true
});
var passwordResetTokensRelations = relations2(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id]
  })
}));
var invoices = pgTable2(
  "invoices",
  {
    id: serial2("id").primaryKey(),
    psychologistId: integer2("psychologist_id").notNull().references(() => users.id),
    clinicId: integer2("clinic_id"),
    // Identificação da nota
    chaveNfe: text2("chave_nfe"),
    numeroNota: text2("numero_nota"),
    serie: text2("serie"),
    dataEmissao: date2("data_emissao"),
    dataUpload: timestamp2("data_upload", { withTimezone: true }).defaultNow(),
    codigoVerificacao: text2("codigo_verificacao"),
    protocoloAutorizacao: text2("protocolo_autorizacao"),
    codigoMunicipioIbge: text2("codigo_municipio_ibge"),
    // Emitente (prestador)
    emitenteNome: text2("emitente_nome"),
    emitenteCnpjCpf: text2("emitente_cnpj_cpf"),
    emitenteCrp: text2("emitente_crp"),
    emitenteIe: text2("emitente_ie"),
    emitenteIm: text2("emitente_im"),
    emitenteEndereco: text2("emitente_endereco"),
    emitenteBairro: text2("emitente_bairro"),
    emitenteMunicipio: text2("emitente_municipio"),
    emitenteUf: text2("emitente_uf"),
    emitenteCep: text2("emitente_cep"),
    emitenteTelefone: text2("emitente_telefone"),
    emitenteEmail: text2("emitente_email"),
    emitenteComplemento: text2("emitente_complemento"),
    // Tomador (cliente/paciente)
    tomadorNome: text2("tomador_nome"),
    tomadorCpfCnpj: text2("tomador_cpf_cnpj"),
    tomadorEndereco: text2("tomador_endereco"),
    tomadorBairro: text2("tomador_bairro"),
    tomadorMunicipio: text2("tomador_municipio"),
    tomadorUf: text2("tomador_uf"),
    tomadorCep: text2("tomador_cep"),
    tomadorEmail: text2("tomador_email"),
    tomadorTelefone: text2("tomador_telefone"),
    tomadorIe: text2("tomador_ie"),
    tomadorIm: text2("tomador_im"),
    tomadorComplemento: text2("tomador_complemento"),
    patientId: integer2("patient_id"),
    // Serviço
    descricaoServico: text2("descricao_servico"),
    codigoServico: text2("codigo_servico"),
    codigoCnae: text2("codigo_cnae"),
    nbs: text2("nbs"),
    codigoMunicipioServico: text2("codigo_municipio_servico"),
    issRetido: boolean2("iss_retido").default(false),
    aliquotaIss: decimal2("aliquota_iss", { precision: 5, scale: 4 }),
    // Valores
    valorServicos: decimal2("valor_servicos", { precision: 12, scale: 2 }),
    valorDeducoes: decimal2("valor_deducoes", { precision: 12, scale: 2 }).default("0"),
    baseCalculo: decimal2("base_calculo", { precision: 12, scale: 2 }),
    valorIss: decimal2("valor_iss", { precision: 12, scale: 2 }),
    valorPis: decimal2("valor_pis", { precision: 12, scale: 2 }),
    valorCofins: decimal2("valor_cofins", { precision: 12, scale: 2 }),
    valorInss: decimal2("valor_inss", { precision: 12, scale: 2 }),
    valorIr: decimal2("valor_ir", { precision: 12, scale: 2 }),
    valorCsll: decimal2("valor_csll", { precision: 12, scale: 2 }),
    valorLiquido: decimal2("valor_liquido", { precision: 12, scale: 2 }),
    valorIbs: decimal2("valor_ibs", { precision: 12, scale: 2 }),
    valorCbs: decimal2("valor_cbs", { precision: 12, scale: 2 }),
    cst: text2("cst"),
    codigoClassificacaoTributaria: text2("codigo_classificacao_tributaria"),
    // Controle e IA
    imageUrl: text2("image_url"),
    imagePath: text2("image_path"),
    imageData: bytea("image_data"),
    imageMimeType: text2("image_mime_type"),
    aiRawResponse: jsonb2("ai_raw_response"),
    aiConfidenceScore: decimal2("ai_confidence_score", { precision: 4, scale: 3 }),
    aiExtractedAt: timestamp2("ai_extracted_at", { withTimezone: true }),
    revisadoPelaPsicologa: boolean2("revisado_pela_psicologa").default(false),
    observacoes: text2("observacoes"),
    status: text2("status").notNull().default("ativa"),
    // ativa, cancelada, pendente
    createdAt: timestamp2("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp2("updated_at", { withTimezone: true }).defaultNow()
  },
  (t) => [unique("invoices_psychologist_chave_nfe").on(t.psychologistId, t.chaveNfe)]
);
var insertInvoiceSchema = createInsertSchema2(invoices);
var invoicesRelations = relations2(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.psychologistId],
    references: [users.id],
    relationName: "userInvoices"
  })
}));
var meetings = pgTable2("meetings", {
  id: serial2("id").primaryKey(),
  psychologistId: integer2("psychologist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patientId: integer2("patient_id").notNull(),
  // references patients.id (defined in patient-schema.ts)
  appointmentId: integer2("appointment_id"),
  // optional link to appointments
  title: text2("title").notNull(),
  description: text2("description"),
  googleEventId: text2("google_event_id").unique(),
  googleCalendarId: text2("google_calendar_id").default("primary"),
  meetLink: text2("meet_link"),
  status: text2("status").notNull().default("scheduled"),
  // scheduled | active | ended | cancelled
  scheduledAt: timestamp2("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer2("duration_minutes").notNull().default(50),
  startedAt: timestamp2("started_at", { withTimezone: true }),
  endedAt: timestamp2("ended_at", { withTimezone: true }),
  actualDuration: integer2("actual_duration"),
  patientEmail: text2("patient_email"),
  patientName: text2("patient_name"),
  linkSentAt: timestamp2("link_sent_at", { withTimezone: true }),
  notes: text2("notes"),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow()
});
var insertMeetingSchema = createInsertSchema2(meetings).pick({
  psychologistId: true,
  patientId: true,
  appointmentId: true,
  title: true,
  description: true,
  scheduledAt: true,
  durationMinutes: true,
  patientEmail: true,
  patientName: true,
  notes: true
});
var meetingsRelations = relations2(meetings, ({ one }) => ({
  psychologist: one(users, {
    fields: [meetings.psychologistId],
    references: [users.id]
  })
}));
var commissionPayoutConfigs = pgTable2("commission_payout_configs", {
  id: serial2("id").primaryKey(),
  psychologistId: integer2("psychologist_id").notNull().references(() => psychologists.id, { onDelete: "cascade" }),
  payoutType: text2("payout_type").notNull().default("percentual"),
  // "percentual" | "fixed"
  payoutValue: decimal2("payout_value", { precision: 10, scale: 2 }).notNull(),
  validFrom: date2("valid_from").notNull(),
  validUntil: date2("valid_until"),
  createdAt: timestamp2("created_at").notNull().defaultNow()
});
var insertCommissionPayoutConfigSchema = createInsertSchema2(commissionPayoutConfigs).pick({
  psychologistId: true,
  payoutType: true,
  payoutValue: true,
  validFrom: true,
  validUntil: true
}).extend({
  payoutValue: z.union([z.string().transform((v) => parseFloat(v)), z.number()])
});
var commissions = pgTable2("commissions", {
  id: serial2("id").primaryKey(),
  psychologistId: integer2("psychologist_id").notNull().references(() => psychologists.id, { onDelete: "cascade" }),
  periodStart: date2("period_start").notNull(),
  periodEnd: date2("period_end").notNull(),
  totalBookings: integer2("total_bookings").notNull().default(0),
  totalRoomsValue: decimal2("total_rooms_value", { precision: 10, scale: 2 }).notNull().default("0"),
  totalRepasse: decimal2("total_repasse", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text2("status").notNull().default("pending"),
  // "pending" | "paid" | "cancelled"
  paymentDate: date2("payment_date"),
  paymentMethod: text2("payment_method"),
  paymentNotes: text2("payment_notes"),
  createdByAdminId: integer2("created_by_admin_id").references(() => users.id),
  createdAt: timestamp2("created_at").notNull().defaultNow(),
  updatedAt: timestamp2("updated_at").notNull().defaultNow()
});
var commissionItems = pgTable2("commission_items", {
  id: serial2("id").primaryKey(),
  commissionId: integer2("commission_id").notNull().references(() => commissions.id, { onDelete: "cascade" }),
  bookingId: integer2("booking_id").notNull().references(() => roomBookings.id),
  bookingDate: date2("booking_date").notNull(),
  roomName: text2("room_name"),
  startTime: time2("start_time"),
  endTime: time2("end_time"),
  bookingValue: decimal2("booking_value", { precision: 10, scale: 2 }).notNull(),
  repasseValue: decimal2("repasse_value", { precision: 10, scale: 2 }).notNull()
});

// server/storage.ts
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db2 = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, gte, lte, sql, desc, ilike, or, getTableColumns } from "drizzle-orm";
var MemoryStore = createMemoryStore(session);
var PostgresSessionStore = connectPg(session);
var { imageData: _invoiceImageDataColumn, ...invoiceListColumns } = getTableColumns(invoices);
var { profileImageData: _userProfileImageDataColumn, ...userColumns } = getTableColumns(users);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      // connect-pg-simple's types expect a `pg.Pool`; @neondatabase/serverless's
      // Pool only differs in internal/private fields it never touches
      // (it just calls .query()), so this is safe at runtime.
      pool,
      createTableIfMissing: true
    });
  }
  // User methods
  // Nota: os métodos de leitura abaixo omitem propositalmente profileImageData
  // (bytea) do select — getUser() em particular roda a cada requisição
  // autenticada via passport deserializeUser, então nunca deve trazer o
  // binário da foto. Quem precisa da foto usa getUserProfilePhoto().
  async getUser(id) {
    const [user] = await db2.select(userColumns).from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db2.select(userColumns).from(users).where(eq(users.username, username));
    return user;
  }
  async createUser(user) {
    const [newUser] = await db2.insert(users).values(user).returning();
    return newUser;
  }
  async updateUser(id, userData) {
    const [updatedUser] = await db2.update(users).set(userData).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async deleteUser(id) {
    const [deletedUser] = await db2.delete(users).where(eq(users.id, id)).returning();
    return !!deletedUser;
  }
  async getAllUsers() {
    return await db2.select(userColumns).from(users);
  }
  async getUserByEmail(email) {
    const [user] = await db2.select(userColumns).from(users).where(eq(users.email, email));
    return user;
  }
  async getUserByGoogleId(googleId) {
    const [user] = await db2.select(userColumns).from(users).where(eq(users.googleId, googleId));
    return user;
  }
  async getUserProfilePhoto(id) {
    const [row] = await db2.select({
      data: users.profileImageData,
      mimeType: users.profileImageMimeType
    }).from(users).where(eq(users.id, id));
    if (!row || !row.data) return void 0;
    return { data: row.data, mimeType: row.mimeType || "image/jpeg" };
  }
  // Password Reset
  async savePasswordResetToken(userId, token, expiresAt) {
    await db2.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false
    });
  }
  async getPasswordResetToken(token) {
    console.log("\u{1F50D} [DB] Buscando token:", token.substring(0, 8) + "...");
    const [resetToken] = await db2.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    if (!resetToken) {
      console.log("\u274C [DB] Token n\xE3o encontrado");
      return void 0;
    }
    console.log("\u{1F5FA} [DB] Token encontrado:", {
      userId: resetToken.userId,
      expiresAt: resetToken.expiresAt,
      used: resetToken.used,
      isExpired: new Date(resetToken.expiresAt) < /* @__PURE__ */ new Date(),
      currentTime: /* @__PURE__ */ new Date()
    });
    if (new Date(resetToken.expiresAt) < /* @__PURE__ */ new Date() || resetToken.used) {
      console.log("\u274C [DB] Token expirado ou j\xE1 usado");
      return void 0;
    }
    return resetToken;
  }
  async invalidatePasswordResetToken(token) {
    await db2.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.token, token));
  }
  async updateUserPassword(userId, hashedPassword) {
    const [updatedUser] = await db2.update(users).set({ password: hashedPassword }).where(eq(users.id, userId)).returning();
    return !!updatedUser;
  }
  // Psychologist methods
  async getPsychologist(id) {
    const [psych] = await db2.select().from(psychologists).where(eq(psychologists.id, id));
    return psych;
  }
  async getPsychologistByUserId(userId) {
    const [psych] = await db2.select().from(psychologists).where(eq(psychologists.userId, userId));
    return psych;
  }
  async createPsychologist(psychologist) {
    const [newPsych] = await db2.insert(psychologists).values({
      ...psychologist,
      hourlyRate: psychologist.hourlyRate.toString()
    }).returning();
    return newPsych;
  }
  async updatePsychologist(id, data) {
    const [updated] = await db2.update(psychologists).set(data).where(eq(psychologists.id, id)).returning();
    return updated;
  }
  async deletePsychologist(id) {
    const [deleted] = await db2.delete(psychologists).where(eq(psychologists.id, id)).returning();
    return !!deleted;
  }
  async getAllPsychologists() {
    return await db2.select().from(psychologists);
  }
  // Room methods
  async getRoom(id) {
    const [room] = await db2.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }
  async createRoom(room) {
    const [newRoom] = await db2.insert(rooms).values(room).returning();
    return newRoom;
  }
  async updateRoom(id, data) {
    const [updated] = await db2.update(rooms).set(data).where(eq(rooms.id, id)).returning();
    return updated;
  }
  async deleteRoom(id) {
    const [deleted] = await db2.delete(rooms).where(eq(rooms.id, id)).returning();
    return !!deleted;
  }
  async getAllRooms() {
    return await db2.select().from(rooms);
  }
  // Appointment methods
  async getAppointment(id) {
    const [appt] = await db2.select().from(appointments).where(eq(appointments.id, id));
    return appt;
  }
  async createAppointment(appointment) {
    const [newAppt] = await db2.insert(appointments).values(appointment).returning();
    return newAppt;
  }
  async updateAppointment(id, data) {
    const [updated] = await db2.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return updated;
  }
  async deleteAppointment(id) {
    const [deleted] = await db2.delete(appointments).where(eq(appointments.id, id)).returning();
    return !!deleted;
  }
  async getAllAppointments() {
    return await db2.select().from(appointments);
  }
  async getAppointmentsByPsychologistId(psychologistId) {
    return await db2.select().from(appointments).where(eq(appointments.psychologistId, psychologistId));
  }
  async getAppointmentsByDate(date3) {
    const all = await this.getAllAppointments();
    const dateString = date3.toISOString().split("T")[0];
    return all.filter((a) => new Date(a.date).toISOString().split("T")[0] === dateString);
  }
  async getAppointmentsByDateRange(startDate, endDate) {
    return await db2.select().from(appointments).where(and(
      gte(appointments.date, startDate.toISOString()),
      lte(appointments.date, endDate.toISOString())
    ));
  }
  async getAppointmentsByPsychologistIdAndDateRange(psychologistId, startDate, endDate) {
    return await db2.select().from(appointments).where(and(
      eq(appointments.psychologistId, psychologistId),
      gte(appointments.date, startDate.toISOString()),
      lte(appointments.date, endDate.toISOString())
    ));
  }
  // Transaction methods
  async getTransaction(id) {
    const [tx] = await db2.select().from(transactions).where(eq(transactions.id, id));
    return tx;
  }
  async createTransaction(transaction) {
    const [newTx] = await db2.insert(transactions).values({
      ...transaction,
      amount: transaction.amount.toString()
    }).returning();
    return newTx;
  }
  async updateTransaction(id, data) {
    const [updated] = await db2.update(transactions).set(data).where(eq(transactions.id, id)).returning();
    return updated;
  }
  async deleteTransaction(id) {
    const [deleted] = await db2.delete(transactions).where(eq(transactions.id, id)).returning();
    return !!deleted;
  }
  async getAllTransactions() {
    return await db2.select().from(transactions);
  }
  async getTransactionsByType(type) {
    return await db2.select().from(transactions).where(eq(transactions.type, type));
  }
  async getTransactionsByDateRange(startDate, endDate) {
    return await db2.select().from(transactions).where(and(
      gte(transactions.date, startDate.toISOString()),
      lte(transactions.date, endDate.toISOString())
    ));
  }
  // RoomBooking methods
  async getRoomBooking(id) {
    const [booking] = await db2.select().from(roomBookings).where(eq(roomBookings.id, id));
    return booking;
  }
  async createRoomBooking(booking) {
    const [newBooking] = await db2.insert(roomBookings).values(booking).returning();
    return newBooking;
  }
  async updateRoomBooking(id, data) {
    const [updated] = await db2.update(roomBookings).set(data).where(eq(roomBookings.id, id)).returning();
    return updated;
  }
  async deleteRoomBooking(id) {
    const [deleted] = await db2.delete(roomBookings).where(eq(roomBookings.id, id)).returning();
    return !!deleted;
  }
  async getAllRoomBookings() {
    return await db2.select().from(roomBookings);
  }
  async getRoomBookingsByRoomId(roomId) {
    return await db2.select().from(roomBookings).where(eq(roomBookings.roomId, roomId));
  }
  async getRoomBookingsByDate(date3) {
    const all = await this.getAllRoomBookings();
    const dateString = date3.toISOString().split("T")[0];
    return all.filter((b) => new Date(b.date).toISOString().split("T")[0] === dateString);
  }
  async getRoomBookingsByDateRange(startDate, endDate) {
    return await db2.select().from(roomBookings).where(and(
      gte(roomBookings.date, startDate.toISOString()),
      lte(roomBookings.date, endDate.toISOString())
    ));
  }
  async checkRoomAvailability(roomId, date3, startTime, endTime) {
    const bookings = await this.getRoomBookingsByDate(date3);
    const hasOverlap = bookings.some((booking) => {
      if (booking.roomId !== roomId) return false;
      return startTime < booking.endTime && endTime > booking.startTime;
    });
    return !hasOverlap;
  }
  // Permission methods
  async getPermission(id) {
    const [perm] = await db2.select().from(permissions).where(eq(permissions.id, id));
    return perm;
  }
  async createPermission(permission) {
    const [newPerm] = await db2.insert(permissions).values(permission).returning();
    return newPerm;
  }
  async updatePermission(id, data) {
    const [updated] = await db2.update(permissions).set(data).where(eq(permissions.id, id)).returning();
    return updated;
  }
  async deletePermission(id) {
    const [deleted] = await db2.delete(permissions).where(eq(permissions.id, id)).returning();
    return !!deleted;
  }
  async getAllPermissions() {
    return await db2.select().from(permissions);
  }
  // RolePermission methods
  async getRolePermission(id) {
    const [rp] = await db2.select().from(rolePermissions).where(eq(rolePermissions.id, id));
    return rp;
  }
  async createRolePermission(rolePermission) {
    const [newRp] = await db2.insert(rolePermissions).values(rolePermission).returning();
    return newRp;
  }
  async updateRolePermission(id, data) {
    const [updated] = await db2.update(rolePermissions).set(data).where(eq(rolePermissions.id, id)).returning();
    return updated;
  }
  async deleteRolePermission(id) {
    const [deleted] = await db2.delete(rolePermissions).where(eq(rolePermissions.id, id)).returning();
    return !!deleted;
  }
  async getAllRolePermissions() {
    return await db2.select().from(rolePermissions);
  }
  async getRolePermissionsByRole(role) {
    return await db2.select().from(rolePermissions).where(eq(rolePermissions.role, role));
  }
  // Invoice methods (NFS-e)
  async getInvoice(id) {
    const [invoice] = await db2.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }
  async createInvoice(invoice) {
    const [newInvoice] = await db2.insert(invoices).values(invoice).returning();
    return newInvoice;
  }
  async updateInvoice(id, data) {
    const [updated] = await db2.update(invoices).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(invoices.id, id)).returning();
    return updated;
  }
  async deleteInvoice(id) {
    const [deleted] = await db2.delete(invoices).where(eq(invoices.id, id)).returning();
    return !!deleted;
  }
  async getInvoicesByUserId(psychologistId, opts) {
    const conditions = [eq(invoices.psychologistId, psychologistId)];
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    if (opts?.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(ilike(invoices.tomadorNome, term), ilike(invoices.tomadorCpfCnpj, term)));
    }
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const totalResult = await db2.select({ count: sql`count(*)::int` }).from(invoices).where(whereClause);
    const total = totalResult[0]?.count ?? 0;
    let query = db2.select(invoiceListColumns).from(invoices).where(whereClause).orderBy(desc(invoices.dataUpload));
    if (opts?.limit != null) query = query.limit(opts.limit);
    if (opts?.offset != null) query = query.offset(opts.offset);
    const rows = await query;
    return { invoices: rows, total };
  }
  async getInvoicesSummary(psychologistId, opts) {
    const conditions = [eq(invoices.psychologistId, psychologistId)];
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const [row] = await db2.select({
      totalCount: sql`count(*)::int`,
      sumValorServicos: sql`coalesce(sum(${invoices.valorServicos})::text, '0')`,
      sumValorLiquido: sql`coalesce(sum(${invoices.valorLiquido})::text, '0')`
    }).from(invoices).where(whereClause);
    return { totalCount: row?.totalCount ?? 0, sumValorServicos: row?.sumValorServicos ?? "0", sumValorLiquido: row?.sumValorLiquido ?? "0" };
  }
  async getAllInvoices() {
    return await db2.select().from(invoices);
  }
  async getInvoicesByReferenceMonth(_referenceMonth) {
    return await db2.select().from(invoices);
  }
  async getInvoiceByUserAndMonth(_userId, _referenceMonth) {
    return void 0;
  }
  async getInvoicesAdmin(opts) {
    const conditions = [];
    if (opts?.psychologistId != null) conditions.push(eq(invoices.psychologistId, opts.psychologistId));
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    if (opts?.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(ilike(invoices.tomadorNome, term), ilike(invoices.tomadorCpfCnpj, term)));
    }
    const whereClause = conditions.length === 0 ? sql`1=1` : conditions.length === 1 ? conditions[0] : and(...conditions);
    const totalCountResult = await db2.select({ count: sql`count(*)::int` }).from(invoices).where(whereClause);
    const totalCount = totalCountResult[0]?.count ?? 0;
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    const result = await db2.select({ invoices: invoiceListColumns, users: userColumns }).from(invoices).innerJoin(users, eq(invoices.psychologistId, users.id)).where(whereClause).orderBy(desc(invoices.dataUpload)).limit(limit).offset(offset);
    const invoicesWithUsers = result.map((r) => ({ ...r.invoices, user: r.users }));
    return { invoices: invoicesWithUsers, total: totalCount };
  }
  async getInvoicesSummaryAdmin(opts) {
    const conditions = [];
    if (opts?.psychologistId != null) conditions.push(eq(invoices.psychologistId, opts.psychologistId));
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    const whereClause = conditions.length === 0 ? sql`1=1` : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [row] = await db2.select({ totalCount: sql`count(*)::int`, sumValorServicos: sql`coalesce(sum(${invoices.valorServicos})::text, '0')`, sumValorLiquido: sql`coalesce(sum(${invoices.valorLiquido})::text, '0')` }).from(invoices).where(whereClause);
    return { totalCount: row?.totalCount ?? 0, sumValorServicos: row?.sumValorServicos ?? "0", sumValorLiquido: row?.sumValorLiquido ?? "0" };
  }
  async getInvoiceWithUser(id) {
    const result = await db2.select().from(invoices).innerJoin(users, eq(invoices.psychologistId, users.id)).where(eq(invoices.id, id));
    if (result.length === 0) return void 0;
    return { ...result[0].invoices, user: result[0].users };
  }
  async getAllInvoicesWithUsers() {
    const result = await db2.select().from(invoices).innerJoin(users, eq(invoices.psychologistId, users.id)).orderBy(desc(invoices.dataUpload));
    return result.map((r) => ({ ...r.invoices, user: r.users }));
  }
  // Patient Record System Implementation
  // Patients
  async getPatient(id) {
    const [patient] = await db2.select().from(patients).where(eq(patients.id, id));
    return patient;
  }
  async getPatientByCpf(cpf) {
    const [patient] = await db2.select().from(patients).where(eq(patients.cpf, cpf));
    return patient;
  }
  async createPatient(patient) {
    const [newPatient] = await db2.insert(patients).values(patient).returning();
    return newPatient;
  }
  async updatePatient(id, data) {
    const [updated] = await db2.update(patients).set(data).where(eq(patients.id, id)).returning();
    return updated;
  }
  async listPatients(activeOnly = true) {
    let query = db2.select().from(patients);
    if (activeOnly) {
      return await db2.select().from(patients).where(eq(patients.status, "active"));
    }
    return await query;
  }
  // Medical Records
  async getMedicalRecordByPatientId(patientId) {
    const [record] = await db2.select().from(medicalRecords).where(eq(medicalRecords.patientId, patientId));
    return record;
  }
  async createMedicalRecord(record) {
    const [newRecord] = await db2.insert(medicalRecords).values(record).returning();
    return newRecord;
  }
  async updateMedicalRecord(id, record) {
    const [updated] = await db2.update(medicalRecords).set(record).where(eq(medicalRecords.id, id)).returning();
    return updated;
  }
  // Clinical Sessions
  async getSession(id) {
    const [session3] = await db2.select().from(clinicalSessions).where(eq(clinicalSessions.id, id));
    return session3;
  }
  async createSession(session3) {
    const [newSession] = await db2.insert(clinicalSessions).values(session3).returning();
    return newSession;
  }
  async updateSession(id, session3) {
    const [updated] = await db2.update(clinicalSessions).set(session3).where(eq(clinicalSessions.id, id)).returning();
    return updated;
  }
  async listSessionsByPatientId(patientId) {
    return await db2.select().from(clinicalSessions).where(eq(clinicalSessions.patientId, patientId)).orderBy(sql`${clinicalSessions.sessionDate} DESC, ${clinicalSessions.sessionTime} DESC`);
  }
  // Documents
  async getDocument(id) {
    const [doc] = await db2.select().from(patientDocuments).where(eq(patientDocuments.id, id));
    return doc;
  }
  async createDocument(document) {
    const [newDoc] = await db2.insert(patientDocuments).values(document).returning();
    return newDoc;
  }
  async listDocumentsByPatientId(patientId) {
    return await db2.select({
      id: patientDocuments.id,
      patientId: patientDocuments.patientId,
      documentType: patientDocuments.documentType,
      documentName: patientDocuments.documentName,
      filePath: patientDocuments.filePath,
      fileSize: patientDocuments.fileSize,
      mimeType: patientDocuments.mimeType,
      uploadedBy: patientDocuments.uploadedBy,
      createdAt: patientDocuments.createdAt
    }).from(patientDocuments).where(eq(patientDocuments.patientId, patientId));
  }
  async deleteDocument(id) {
    const [deleted] = await db2.delete(patientDocuments).where(eq(patientDocuments.id, id)).returning();
    return !!deleted;
  }
  // Assessments
  async getAssessment(id) {
    const [assessment] = await db2.select().from(psychologicalAssessments).where(eq(psychologicalAssessments.id, id));
    return assessment;
  }
  async createAssessment(assessment) {
    const [newAssessment] = await db2.insert(psychologicalAssessments).values(assessment).returning();
    return newAssessment;
  }
  async listAssessmentsByPatientId(patientId) {
    return await db2.select().from(psychologicalAssessments).where(eq(psychologicalAssessments.patientId, patientId));
  }
  // Audit & History
  async createAuditLog(log2) {
    const [newLog] = await db2.insert(auditLogs).values(log2).returning();
    return newLog;
  }
  async listAuditLogsByPatientId(patientId) {
    return await db2.select().from(auditLogs).where(eq(auditLogs.patientId, patientId)).orderBy(sql`${auditLogs.createdAt} DESC`);
  }
  async getSessionHistory(sessionId) {
    return await db2.select().from(sessionHistory).where(eq(sessionHistory.sessionId, sessionId)).orderBy(sql`${sessionHistory.version} DESC`);
  }
  // Patient Transfers
  async transferPatient(data) {
    let transfer;
    await db2.transaction(async (tx) => {
      await tx.update(patients).set({ psychologistId: data.toPsychologistId }).where(eq(patients.id, data.patientId));
      const [newTransfer] = await tx.insert(patientTransfers).values({
        patientId: data.patientId,
        fromPsychologistId: data.fromPsychologistId,
        toPsychologistId: data.toPsychologistId,
        transferredByAdminId: data.transferredByAdminId,
        reason: data.reason
      }).returning();
      transfer = newTransfer;
    });
    return transfer;
  }
  async listTransfersByPatientId(patientId) {
    return await db2.select().from(patientTransfers).where(eq(patientTransfers.patientId, patientId)).orderBy(sql`${patientTransfers.createdAt} DESC`);
  }
  async listCommissionPayoutConfigs(psychologistId) {
    if (psychologistId !== void 0) {
      return await db2.select().from(commissionPayoutConfigs).where(eq(commissionPayoutConfigs.psychologistId, psychologistId)).orderBy(sql`${commissionPayoutConfigs.validFrom} DESC`);
    }
    return await db2.select().from(commissionPayoutConfigs).orderBy(sql`${commissionPayoutConfigs.validFrom} DESC`);
  }
  async getActiveCommissionPayoutConfig(psychologistId, forDate) {
    const results = await db2.select().from(commissionPayoutConfigs).where(
      and(
        eq(commissionPayoutConfigs.psychologistId, psychologistId),
        lte(commissionPayoutConfigs.validFrom, forDate),
        or(
          sql`${commissionPayoutConfigs.validUntil} IS NULL`,
          gte(commissionPayoutConfigs.validUntil, forDate)
        )
      )
    ).orderBy(sql`${commissionPayoutConfigs.validFrom} DESC`).limit(1);
    return results[0];
  }
  async createCommissionPayoutConfig(data) {
    const [config] = await db2.insert(commissionPayoutConfigs).values(data).returning();
    return config;
  }
  async updateCommissionPayoutConfig(id, data) {
    const [updated] = await db2.update(commissionPayoutConfigs).set(data).where(eq(commissionPayoutConfigs.id, id)).returning();
    return updated;
  }
  async listCommissions(filters) {
    const conditions = [];
    if (filters?.psychologistId) conditions.push(eq(commissions.psychologistId, filters.psychologistId));
    if (filters?.status) conditions.push(eq(commissions.status, filters.status));
    if (filters?.exactPeriod) {
      conditions.push(eq(commissions.periodStart, filters.exactPeriod.periodStart));
      conditions.push(eq(commissions.periodEnd, filters.exactPeriod.periodEnd));
    } else {
      if (filters?.periodStart) conditions.push(gte(commissions.periodStart, filters.periodStart));
      if (filters?.periodEnd) conditions.push(lte(commissions.periodEnd, filters.periodEnd));
    }
    if (conditions.length > 0) {
      return await db2.select().from(commissions).where(and(...conditions)).orderBy(sql`${commissions.createdAt} DESC`);
    }
    return await db2.select().from(commissions).orderBy(sql`${commissions.createdAt} DESC`);
  }
  async getCommission(id) {
    const [c] = await db2.select().from(commissions).where(eq(commissions.id, id));
    return c;
  }
  async createCommission(data) {
    const [c] = await db2.insert(commissions).values({
      ...data,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    return c;
  }
  async updateCommission(id, data) {
    const [updated] = await db2.update(commissions).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(commissions.id, id)).returning();
    return updated;
  }
  async listCommissionItems(commissionId) {
    return await db2.select().from(commissionItems).where(eq(commissionItems.commissionId, commissionId)).orderBy(sql`${commissionItems.bookingDate} ASC`);
  }
  async createCommissionItems(items) {
    if (items.length === 0) return [];
    return await db2.insert(commissionItems).values(items).returning();
  }
  async getCommissionDashboard(month) {
    const [year, mon] = month.split("-");
    const periodStart = `${year}-${mon}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const periodEnd = `${year}-${mon}-${lastDay.toString().padStart(2, "0")}`;
    const rows = await db2.select().from(commissions).where(
      and(
        gte(commissions.periodStart, periodStart),
        lte(commissions.periodEnd, periodEnd)
      )
    );
    const totalPendente = rows.filter((r) => r.status === "pending").reduce((acc, r) => acc + parseFloat(r.totalRepasse), 0);
    const totalPago = rows.filter((r) => r.status === "paid").reduce((acc, r) => acc + parseFloat(r.totalRepasse), 0);
    const numPsicologas = new Set(rows.map((r) => r.psychologistId)).size;
    const numLocacoes = rows.reduce((acc, r) => acc + r.totalBookings, 0);
    return {
      totalPendente: totalPendente.toFixed(2),
      totalPago: totalPago.toFixed(2),
      numPsicologas,
      numLocacoes
    };
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  if (!stored) return false;
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "r8q/+&1LM3)cd*zAGpx1xm{NeQHc;#",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {}
  };
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true
    };
  }
  app.use(session2(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        } else if (user.status !== "active") {
          return done(null, false, { message: "Account is not active. Please contact administrator." });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",
        // relative — overridden per-request below
        passReqToCallback: false
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await storage.getUserByGoogleId(profile.id);
          if (!user) {
            const email = profile.emails?.[0]?.value;
            if (email) {
              user = await storage.getUserByEmail(email);
              if (user) {
                await storage.updateUser(user.id, {
                  googleId: profile.id,
                  avatarUrl: profile.photos?.[0]?.value || user.profileImage
                  // Update avatar if not present? Or just store in avatarUrl
                });
                user = await storage.getUser(user.id);
              }
            }
          }
          if (!user) {
            const email = profile.emails?.[0]?.value;
            let username = email ? email.split("@")[0] : `user${profile.id}`;
            const existingUsername = await storage.getUserByUsername(username);
            if (existingUsername) {
              username = `${username}_${Math.floor(Math.random() * 1e3)}`;
            }
            user = await storage.createUser({
              username,
              password: "",
              // No password
              email: email || "",
              fullName: profile.displayName,
              role: "psychologist",
              // Default role
              status: "active",
              googleId: profile.id,
              avatarUrl: profile.photos?.[0]?.value
            });
            await storage.createPsychologist({
              userId: user.id,
              specialization: "Psic\xF3logo (Google Auth)",
              bio: "Bio pendente...",
              hourlyRate: 0
            });
          }
          if (user?.status !== "active") {
            return done(null, false, { message: "Account is not active." });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
    const buildCallbackUrl = (req) => {
      const proto = req.get("x-forwarded-proto") || req.protocol || "https";
      const host = req.get("x-forwarded-host") || req.get("host") || req.hostname;
      return `${proto}://${host}/auth/google/callback`;
    };
    app.get("/auth/google", (req, res, next) => {
      const callbackURL = buildCallbackUrl(req);
      passport.authenticate("google", { scope: ["profile", "email"], callbackURL })(req, res, next);
    });
    app.get(
      "/auth/google/callback",
      (req, res, next) => {
        const callbackURL = buildCallbackUrl(req);
        passport.authenticate("google", { failureRedirect: "/auth", callbackURL })(req, res, next);
      },
      (req, res) => {
        res.redirect("/");
      }
    );
  } else {
    console.warn("Google OAuth credentials not provided. Google Login will be disabled.");
    app.get("/auth/google", (req, res) => {
      res.status(500).json({
        message: "Google OAuth credentials are missing. Check server logs."
      });
    });
    app.get("/auth/google/callback", (req, res) => {
      res.status(500).json({
        message: "Google OAuth credentials are missing. Check server logs."
      });
    });
  }
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });
      if (req.body.role === "psychologist" && req.body.hourlyRate) {
        await storage.createPsychologist({
          userId: user.id,
          specialization: req.body.specialization || "",
          bio: req.body.bio || "",
          hourlyRate: req.body.hourlyRate
        });
      }
      const { password, ...userResponse } = user;
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userResponse);
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        if (user.role === "psychologist") {
          const existingProfile = await storage.getPsychologistByUserId(user.id);
          if (!existingProfile) {
            const newProfile = await storage.createPsychologist({
              userId: user.id,
              specialization: null,
              bio: null,
              hourlyRate: 0
            });
            const allAppointments = await storage.getAllAppointments();
            const orphaned = allAppointments.filter((a) => a.psychologistId === 0);
            for (const appt of orphaned) {
              await storage.updateAppointment(appt.id, { psychologistId: newProfile.id });
            }
          }
        }
        const { password, ...userResponse } = user;
        res.status(200).json(userResponse);
      });
    })(req, res, next);
  });
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userResponse } = req.user;
    res.json(userResponse);
  });
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (req.user.role !== "admin" && req.user.role !== "psychologist" && req.user.role !== "manager") {
        return res.status(403).json({ message: "Acesso n\xE3o autorizado" });
      }
      const users2 = await storage.getAllUsers();
      const safeUsers = users2.map((user) => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error("Erro ao buscar usu\xE1rios:", error);
      res.status(500).json({ message: "Erro ao buscar usu\xE1rios" });
    }
  });
  app.get("/api/user/permission/:permissionName", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const rolePermissions2 = await storage.getRolePermissionsByRole(req.user.role);
      const allPermissions = await storage.getAllPermissions();
      const permission = allPermissions.find((p) => p.name === req.params.permissionName);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      const hasPermission = rolePermissions2.some((rp) => rp.permissionId === permission.id);
      res.json({ hasPermission });
    } catch (error) {
      res.status(500).json({ message: "Error checking permission" });
    }
  });
}

// server/routes.ts
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer3 from "multer";
import path3 from "path";
import crypto3 from "crypto";

// server/services/email.ts
import { Resend } from "resend";
if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY not set. Password recovery emails will not be sent.");
}
var resend = new Resend(process.env.RESEND_API_KEY);
var getAppUrl = () => {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:5000";
};
var sendPasswordResetEmail = async (user, resetToken) => {
  const appUrl = getAppUrl();
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
  if (process.env.NODE_ENV !== "production") {
    console.log("\u{1F4E7} DESENVOLVIMENTO: Email de recupera\xE7\xE3o seria enviado para:", user.email);
    console.log("\u{1F517} Link de recupera\xE7\xE3o:", resetLink);
    console.log("\u26A0\uFE0F  Link v\xE1lido por 1 hora. Use este link para testar a recupera\xE7\xE3o de senha.");
  }
  try {
    if (!user.email || !user.email.includes("@")) {
      throw new Error("Email do usu\xE1rio inv\xE1lido");
    }
    console.log("\u{1F4E7} Enviando email para:", user.email);
    const { data, error } = await resend.emails.send({
      from: "ConsultaPsi <onboarding@resend.dev>",
      to: [user.email],
      subject: "Recupera\xE7\xE3o de Senha - ConsultaPsi",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0097FB; margin: 0; font-size: 28px;">ConsultaPsi</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #0097FB;">
            <h2 style="color: #0097FB; margin-top: 0;">Recupera\xE7\xE3o de Senha</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">Ol\xE1 <strong>${user.fullName}</strong>,</p>
            <p style="font-size: 16px; line-height: 1.6; color: #333;">
              Recebemos uma solicita\xE7\xE3o para redefinir sua senha. Se voc\xEA n\xE3o fez esta solicita\xE7\xE3o, 
              por favor ignore este email e sua senha permanecer\xE1 inalterada.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #0097FB; color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-weight: bold; font-size: 16px;">
                \u{1F510} Redefinir Senha
              </a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                \u23F0 <strong>Este link \xE9 v\xE1lido por apenas 1 hora</strong> por motivos de seguran\xE7a.
              </p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              Se o bot\xE3o n\xE3o funcionar, voc\xEA pode copiar e colar o link abaixo no seu navegador:
            </p>
            <p style="word-break: break-all; font-size: 12px; color: #666; background-color: #f1f1f1; padding: 10px; border-radius: 4px;">
              ${resetLink}
            </p>
          </div>
          
          <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Este \xE9 um email autom\xE1tico. Por favor, n\xE3o responda a este email.
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ConsultaPsi - Sistema de Gest\xE3o em Psicologia
            </p>
          </div>
        </div>
      `
    });
    if (error) {
      console.error("\u274C Erro detalhado do Resend:", error);
      const err = error;
      if (err.statusCode === 403 && err.message && err.message.includes("You can only send testing emails to your own email address")) {
        console.log("\u26A0\uFE0F  RESEND LIMITATION: Este \xE9 um API key de teste que s\xF3 pode enviar emails para: andrewsfranco93@gmail.com");
        console.log("\u{1F517} Para enviar para outros emails, verifique um dom\xEDnio em resend.com/domains");
        console.log("\u{1F4DD} Link de recupera\xE7\xE3o (para teste manual):", resetLink);
        console.log("\u2705 Token gerado com sucesso. Use o link acima para testar o reset de senha.");
        return { id: "resend-limitation", email: user.email, testLink: resetLink };
      }
      console.error("\u274C Tipo do erro:", typeof error);
      console.error("\u274C Conte\xFAdo do erro:", JSON.stringify(error, null, 2));
      throw new Error(`Falha no envio do email via Resend: ${error.message || JSON.stringify(error)}`);
    }
    console.log("\u2705 Email de recupera\xE7\xE3o enviado com sucesso via Resend!");
    console.log("\u{1F4E8} Detalhes do envio:", {
      to: user.email,
      messageId: data?.id,
      from: "ConsultaPsi <onboarding@resend.dev>",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return data;
  } catch (error) {
    console.error("\u274C Erro cr\xEDtico no envio de email:", error);
    console.error("\u274C Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    console.error("\u274C Tipo do erro:", typeof error);
    if (error instanceof Error) {
      console.error("\u274C Mensagem do erro:", error.message);
    }
    throw error;
  }
};

// server/services/whatsapp.ts
import axios from "axios";
var WHATSAPP_API_URL = "https://graph.facebook.com/v17.0";
var WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
var WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Erro ao enviar mensagem WhatsApp:", error);
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
}
function formatPhoneNumber(phone) {
  let digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length === 11 || digitsOnly.length === 10) {
    digitsOnly = `55${digitsOnly}`;
  }
  if (digitsOnly.length >= 12 && digitsOnly.length <= 15) {
    return digitsOnly;
  }
  return null;
}
async function sendWhatsAppAvailability(phoneNumber, message) {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  if (!formattedPhone) {
    throw new Error("N\xFAmero de telefone inv\xE1lido");
  }
  return sendWhatsAppMessage(formattedPhone, message);
}

// server/routes/google-calendar.ts
import { Router } from "express";

// server/services/google-calendar.ts
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { eq as eq2 } from "drizzle-orm";
var SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.send"
];
function buildCalendarRedirectUri() {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) {
    return `https://${replitDomain}/api/google-calendar/auth/callback`;
  }
  return void 0;
}
var REDIRECT_URI = buildCalendarRedirectUri();
var oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);
var tokenCache = {};
function getAuthUrl(userId) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: userId.toString(),
    // Usado para identificar o usuário após a autorização
    prompt: "consent"
    // Sempre solicita permissão (necessário para obter refresh_token)
  });
  return authUrl;
}
async function handleAuthCode(code, userId) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) {
      console.error("Erro: Token de acesso n\xE3o recebido");
      return false;
    }
    tokenCache[userId] = tokens;
    const existingTokens = await db2.select().from(googleTokens).where(eq2(googleTokens.userId, userId));
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1e3);
    if (existingTokens.length > 0) {
      await db2.update(googleTokens).set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existingTokens[0].refreshToken,
        expiryDate,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(googleTokens.userId, userId));
    } else {
      await db2.insert(googleTokens).values({
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiryDate,
        calendarId: "primary"
        // Calendário padrão
      });
    }
    return true;
  } catch (error) {
    console.error("Erro ao processar o c\xF3digo de autoriza\xE7\xE3o:", error);
    return false;
  }
}
async function getUserTokens(userId) {
  if (tokenCache[userId]) {
    const expiryDate = tokenCache[userId].expiry_date;
    if (expiryDate && new Date(expiryDate).getTime() - Date.now() > 6e4) {
      return tokenCache[userId];
    }
  }
  const tokens = await db2.select().from(googleTokens).where(eq2(googleTokens.userId, userId));
  if (tokens.length === 0) {
    return null;
  }
  const userToken = tokens[0];
  if (userToken.expiryDate && new Date(userToken.expiryDate).getTime() <= Date.now()) {
    if (!userToken.refreshToken) {
      return null;
    }
    try {
      oauth2Client.setCredentials({
        refresh_token: userToken.refreshToken
      });
      const { credentials: credentials2 } = await oauth2Client.refreshAccessToken();
      const expiryDate = credentials2.expiry_date ? new Date(credentials2.expiry_date) : new Date(Date.now() + 3600 * 1e3);
      await db2.update(googleTokens).set({
        accessToken: credentials2.access_token,
        expiryDate,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(googleTokens.userId, userId));
      tokenCache[userId] = credentials2;
      return credentials2;
    } catch (error) {
      console.error("Erro ao renovar o token de acesso:", error);
      return null;
    }
  }
  const credentials = {
    access_token: userToken.accessToken,
    refresh_token: userToken.refreshToken,
    expiry_date: userToken.expiryDate?.getTime()
  };
  tokenCache[userId] = credentials;
  return credentials;
}
async function setupClientForUser(userId) {
  const tokens = await getUserTokens(userId);
  if (!tokens) {
    return null;
  }
  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: oauth2Client });
}
async function addEventToCalendar(userId, event) {
  const calendar = await setupClientForUser(userId);
  if (!calendar) {
    return null;
  }
  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startDateTime,
          timeZone: "America/Sao_Paulo"
          // Ajuste para seu fuso horário
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: "America/Sao_Paulo"
          // Ajuste para seu fuso horário
        },
        attendees: event.attendees,
        reminders: {
          useDefault: true
        }
      }
    });
    return response.data.id || null;
  } catch (error) {
    console.error("Erro ao adicionar evento ao calend\xE1rio:", error);
    return null;
  }
}
async function updateCalendarEvent(userId, eventId, event) {
  const calendar = await setupClientForUser(userId);
  if (!calendar) {
    return false;
  }
  try {
    const currentEvent = await calendar.events.get({
      calendarId: "primary",
      eventId
    });
    const requestBody = {
      ...currentEvent.data,
      summary: event.summary ?? currentEvent.data.summary,
      description: event.description ?? currentEvent.data.description,
      location: event.location ?? currentEvent.data.location
    };
    if (event.startDateTime) {
      requestBody.start = {
        dateTime: event.startDateTime,
        timeZone: "America/Sao_Paulo"
      };
    }
    if (event.endDateTime) {
      requestBody.end = {
        dateTime: event.endDateTime,
        timeZone: "America/Sao_Paulo"
      };
    }
    if (event.attendees) {
      requestBody.attendees = event.attendees;
    }
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody
    });
    return true;
  } catch (error) {
    console.error("Erro ao atualizar evento no calend\xE1rio:", error);
    return false;
  }
}
async function deleteCalendarEvent(userId, eventId) {
  const calendar = await setupClientForUser(userId);
  if (!calendar) {
    return false;
  }
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId
    });
    return true;
  } catch (error) {
    console.error("Erro ao remover evento do calend\xE1rio:", error);
    return false;
  }
}
async function listUpcomingEvents(userId, maxResults = 10) {
  const calendar = await setupClientForUser(userId);
  if (!calendar) {
    return null;
  }
  try {
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: (/* @__PURE__ */ new Date()).toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime"
    });
    return response.data.items || [];
  } catch (error) {
    console.error("Erro ao listar eventos do calend\xE1rio:", error);
    return null;
  }
}
async function isUserAuthenticated(userId) {
  try {
    const tokens = await db2.select().from(googleTokens).where(eq2(googleTokens.userId, userId));
    return tokens.length > 0;
  } catch (error) {
    console.error("Erro ao verificar autentica\xE7\xE3o do usu\xE1rio:", error);
    return false;
  }
}
function getAppointmentSchedulingLink(psychologistUserId, eventData) {
  return "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3aKuNW3rK7lCY0OqdA6kDDjma9niQdzEMxU7GkWhEfBGHjPHUcrX27OIVwwR9WMc2HZ04Uaj-C";
}
async function getUserOAuthClient(userId) {
  const tokens = await getUserTokens(userId);
  if (!tokens) return null;
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  client.setCredentials(tokens);
  return client;
}
async function createMeetingEvent(userId, event) {
  const calendar = await setupClientForUser(userId);
  if (!calendar) return null;
  try {
    const attendees = [];
    if (event.attendeeEmail) attendees.push({ email: event.attendeeEmail });
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      requestBody: {
        summary: event.summary,
        description: event.description || "Sess\xE3o de psicologia \u2014 ConsultaPsi",
        start: {
          dateTime: event.startDateTime,
          timeZone: "America/Sao_Paulo"
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: "America/Sao_Paulo"
        },
        conferenceData: {
          createRequest: {
            requestId: event.requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        },
        attendees: attendees.length > 0 ? attendees : void 0,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 10 }
          ]
        }
      }
    });
    const meetLink = response.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri ?? null;
    return { googleEventId: response.data.id, meetLink };
  } catch (error) {
    if (isGoogleTokenExpired(error)) throw error;
    console.error("Erro ao criar evento de reuni\xE3o:", error);
    return null;
  }
}
async function getGmailClient(userId) {
  const oauthClient = await getUserOAuthClient(userId);
  if (!oauthClient) return null;
  return google.gmail({ version: "v1", auth: oauthClient });
}
function isGoogleTokenExpired(error) {
  if (!error || typeof error !== "object") return false;
  const e = error;
  if (e.code === 401) return true;
  const message = String(e.message || "");
  return message.includes("invalid_grant") || message.includes("Token has been expired") || message.includes("token expired") || message.includes("Invalid Credentials");
}
async function sendMeetLinkEmail(params) {
  try {
    const gmail = await getGmailClient(params.userId);
    if (!gmail) return false;
    const dataHora = params.scheduledAt.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
    const emailBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; background: #f9fafb; padding: 20px;">
  <div style="background: #0D9488; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">ConsultaPsi</h1>
    <p style="color: #ccfbf1; margin: 4px 0 0; font-size: 14px;">Sua sess\xE3o est\xE1 confirmada</p>
  </div>
  <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="font-size: 16px; margin: 0 0 16px;">Ol\xE1, <strong>${params.patientName}</strong>!</p>
    <p style="color: #6b7280; margin: 0 0 24px;">Sua sess\xE3o com <strong>${params.psychologistName}</strong> est\xE1 confirmada. Use o link abaixo para participar:</p>
    
    <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #0f766e;"><strong>\u{1F4C5} Data e hor\xE1rio:</strong> ${dataHora}</p>
      <p style="margin: 0; font-size: 14px; color: #0f766e;"><strong>\u23F1\uFE0F Dura\xE7\xE3o:</strong> ${params.durationMinutes} minutos</p>
    </div>
    
    <div style="text-align: center; margin: 32px 0;">
      <a href="${params.meetLink}" 
         style="background: #0D9488; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
        \u{1F3A5} Entrar na Sess\xE3o
      </a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px; margin: 0;">
      Ou acesse pelo link: <a href="${params.meetLink}" style="color: #0D9488;">${params.meetLink}</a><br>
      <em>N\xE3o \xE9 necess\xE1rio ter conta Google para participar.</em>
    </p>
  </div>
</body>
</html>`;
    const subjectEncoded = Buffer.from(
      `Sua sess\xE3o est\xE1 agendada \u2014 ${dataHora}`
    ).toString("base64");
    const rawMessage = [
      `To: ${params.patientEmail}`,
      `From: ${params.psychologistName} <${params.psychologistEmail}>`,
      `Subject: =?utf-8?B?${subjectEncoded}?=`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      emailBody
    ].join("\r\n");
    const encodedMessage = Buffer.from(rawMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage }
    });
    return true;
  } catch (error) {
    if (isGoogleTokenExpired(error)) throw error;
    console.error("Erro ao enviar e-mail do Meet:", error);
    return false;
  }
}

// server/routes/google-calendar.ts
import { eq as eq3 } from "drizzle-orm";
var router = Router();
router.get("/auth", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
  }
  const authUrl = getAuthUrl(req.user.id);
  res.json({ authUrl });
});
router.get("/auth/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ error: "Par\xE2metros ausentes" });
  }
  const userId = parseInt(state, 10);
  if (req.isAuthenticated() && req.user.id !== userId) {
    return res.status(403).json({ error: "ID de usu\xE1rio inv\xE1lido" });
  }
  try {
    const success = await handleAuthCode(code, userId);
    if (success) {
      res.redirect("/profile?googleCalendarConnected=true");
    } else {
      res.redirect("/profile?googleCalendarError=true");
    }
  } catch (error) {
    console.error("Erro durante autentica\xE7\xE3o do Google Calendar:", error);
    res.redirect("/profile?googleCalendarError=true");
  }
});
router.get("/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
  }
  const isAuthenticated = await isUserAuthenticated(req.user.id);
  res.json({ authenticated: isAuthenticated });
});
router.post("/sync/:appointmentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
  }
  const appointmentId = parseInt(req.params.appointmentId, 10);
  try {
    const appointmentResults = await db.select().from(appointments).where(eq3(appointments.id, appointmentId));
    if (appointmentResults.length === 0) {
      return res.status(404).json({ error: "Agendamento n\xE3o encontrado" });
    }
    const appointment = appointmentResults[0];
    const existingSync = await db.select().from(calendarEvents).where(eq3(calendarEvents.appointmentId, appointmentId));
    if (existingSync.length > 0) {
      return res.status(409).json({
        error: "Agendamento j\xE1 sincronizado",
        calendarEventId: existingSync[0].googleEventId
      });
    }
    const psychologistResults = await db.select({
      fullName: users.fullName,
      email: users.email
    }).from(users).where(eq3(users.id, appointment.psychologistId));
    const psychologist = psychologistResults[0];
    const appointmentDate = appointment.date;
    const startTime = appointment.startTime;
    const endTime = appointment.endTime;
    const startDateTime = (/* @__PURE__ */ new Date(`${appointmentDate}T${startTime}`)).toISOString();
    const endDateTime = (/* @__PURE__ */ new Date(`${appointmentDate}T${endTime}`)).toISOString();
    const eventId = await addEventToCalendar(
      req.user.id,
      {
        summary: `Consulta com ${appointment.patientName}`,
        description: appointment.notes || "Sem observa\xE7\xF5es adicionais",
        location: `Sala ${appointment.roomId}`,
        startDateTime,
        endDateTime,
        attendees: [
          { email: req.user.email },
          // Usuário atual
          ...psychologist ? [{ email: psychologist.email }] : []
          // Psicólogo, se disponível
        ]
      }
    );
    if (!eventId) {
      return res.status(500).json({ error: "Erro ao criar evento no Google Calendar" });
    }
    await db.insert(calendarEvents).values({
      appointmentId,
      googleEventId: eventId,
      userId: req.user.id
    });
    res.status(201).json({ googleEventId: eventId });
  } catch (error) {
    console.error("Erro ao sincronizar agendamento com Google Calendar:", error);
    res.status(500).json({ error: "Erro ao sincronizar agendamento" });
  }
});
router.put("/sync/:appointmentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
  }
  const appointmentId = parseInt(req.params.appointmentId, 10);
  try {
    const appointmentResults = await db.select().from(appointments).where(eq3(appointments.id, appointmentId));
    if (appointmentResults.length === 0) {
      return res.status(404).json({ error: "Agendamento n\xE3o encontrado" });
    }
    const appointment = appointmentResults[0];
    const eventResults = await db.select().from(calendarEvents).where(eq3(calendarEvents.appointmentId, appointmentId));
    if (eventResults.length === 0) {
      return res.status(404).json({ error: "Evento n\xE3o encontrado no Google Calendar" });
    }
    const calendarEvent = eventResults[0];
    const appointmentDate = appointment.date;
    const startTime = appointment.startTime;
    const endTime = appointment.endTime;
    const startDateTime = (/* @__PURE__ */ new Date(`${appointmentDate}T${startTime}`)).toISOString();
    const endDateTime = (/* @__PURE__ */ new Date(`${appointmentDate}T${endTime}`)).toISOString();
    const success = await updateCalendarEvent(
      req.user.id,
      calendarEvent.googleEventId,
      {
        summary: `Consulta com ${appointment.patientName}`,
        description: appointment.notes || "Sem observa\xE7\xF5es adicionais",
        location: `Sala ${appointment.roomId}`,
        startDateTime,
        endDateTime
      }
    );
    if (!success) {
      return res.status(500).json({ error: "Erro ao atualizar evento no Google Calendar" });
    }
    await db.update(calendarEvents).set({ lastSynced: /* @__PURE__ */ new Date() }).where(eq3(calendarEvents.id, calendarEvent.id));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao atualizar evento no Google Calendar:", error);
    res.status(500).json({ error: "Erro ao atualizar evento" });
  }
});
router.delete("/sync/:appointmentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
  }
  const appointmentId = parseInt(req.params.appointmentId, 10);
  try {
    const eventResults = await db.select().from(calendarEvents).where(eq3(calendarEvents.appointmentId, appointmentId));
    if (eventResults.length === 0) {
      return res.status(404).json({ error: "Evento n\xE3o encontrado no Google Calendar" });
    }
    const calendarEvent = eventResults[0];
    const success = await deleteCalendarEvent(
      req.user.id,
      calendarEvent.googleEventId
    );
    if (!success) {
      return res.status(500).json({ error: "Erro ao remover evento do Google Calendar" });
    }
    await db.delete(calendarEvents).where(eq3(calendarEvents.id, calendarEvent.id));
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao remover evento do Google Calendar:", error);
    res.status(500).json({ error: "Erro ao remover evento" });
  }
});
router.get("/events", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Usu\xE1rio n\xE3o autenticado" });
  }
  try {
    const events = await listUpcomingEvents(req.user.id);
    if (events === null) {
      return res.status(500).json({ error: "Erro ao recuperar eventos do Google Calendar" });
    }
    res.json(events);
  } catch (error) {
    console.error("Erro ao listar eventos do Google Calendar:", error);
    res.status(500).json({ error: "Erro ao listar eventos" });
  }
});
var google_calendar_default = router;

// server/routes/patient-records.ts
import { Router as Router2 } from "express";
import { z as z2 } from "zod";
import multer from "multer";
import path from "path";

// server/services/ai.ts
import Groq from "groq-sdk";
import { createRequire } from "module";
import { execFile } from "child_process";
import { promisify as promisify2 } from "util";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
var require2 = createRequire(import.meta.url);
var pdfParse = require2("pdf-parse");
var execFileAsync = promisify2(execFile);
if (!process.env.GROQ_API_KEY) {
  console.warn("GROQ_API_KEY not set. AI summarization and invoice NFS-e image analysis will not work.");
}
var groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
var CLINICAL_PROMPT = `Voc\xEA \xE9 um assistente cl\xEDnico especializado em psicologia. 
Analise o documento a seguir e forne\xE7a:

1. **Resumo objetivo** (m\xE1ximo 150 palavras)
2. **Pontos de aten\xE7\xE3o cl\xEDnica** (liste os principais achados relevantes para o acompanhamento psicol\xF3gico)
3. **Insights terap\xEAuticos** (observa\xE7\xF5es que possam apoiar o psic\xF3logo no atendimento)
4. **Sugest\xF5es de follow-up** (perguntas ou temas a explorar nas pr\xF3ximas sess\xF5es)

Seja preciso, emp\xE1tico e use linguagem t\xE9cnica adequada \xE0 psicologia cl\xEDnica.`;
var SUPPORTED_MIME_TYPES = ["application/pdf", "text/plain", "text/"];
function isSupportedMimeType(mimeType) {
  return SUPPORTED_MIME_TYPES.some((supported) => mimeType.startsWith(supported));
}
async function extractTextFromBuffer(fileBuffer, mimeType) {
  if (mimeType === "application/pdf") {
    const data = await pdfParse(fileBuffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new UnsupportedFormatError(
        "N\xE3o foi poss\xEDvel extrair texto deste PDF. O arquivo pode ser uma imagem ou estar protegido."
      );
    }
    return data.text;
  }
  return fileBuffer.toString("utf-8");
}
async function summarizeDocument(fileBuffer, mimeType, fileName) {
  if (!isSupportedMimeType(mimeType)) {
    throw new UnsupportedFormatError(
      `Formato n\xE3o suportado: ${mimeType}. Apenas PDF e arquivos de texto s\xE3o suportados.`
    );
  }
  let textContent;
  try {
    textContent = await extractTextFromBuffer(fileBuffer, mimeType);
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;
    throw new UnsupportedFormatError("N\xE3o foi poss\xEDvel processar este documento.");
  }
  const maxChars = 12e3;
  if (textContent.length > maxChars) {
    textContent = textContent.slice(0, maxChars) + "\n\n[...documento truncado para an\xE1lise...]";
  }
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: CLINICAL_PROMPT
        },
        {
          role: "user",
          content: `Documento: ${fileName}

${textContent}`
        }
      ],
      temperature: 0.4,
      max_tokens: 1500
    });
    const text3 = completion.choices[0]?.message?.content;
    if (!text3) {
      throw new Error("A IA retornou uma resposta vazia.");
    }
    return text3;
  } catch (error) {
    if (error instanceof UnsupportedFormatError) throw error;
    const err = error;
    const status = err?.status || err?.statusCode || err?.error?.status;
    if (status === 429) {
      throw new AIQuotaError(
        "Limite de requisi\xE7\xF5es atingido. Aguarde alguns instantes e tente novamente."
      );
    }
    console.error("Groq API error:", error);
    throw new AIServiceError("Erro ao conectar com a IA. Tente novamente.");
  }
}
var UnsupportedFormatError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsupportedFormatError";
  }
};
var AIServiceError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AIServiceError";
  }
};
var AIQuotaError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "AIQuotaError";
  }
};
var GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
var MAX_BASE64_SIZE_BYTES = 4 * 1024 * 1024;
var NFS_E_EXTRACTION_PROMPT = `Voc\xEA \xE9 um especialista em leitura de Notas Fiscais de Servi\xE7os brasileiras (NFS-e), especialmente de profissionais de sa\xFAde como psic\xF3logos.

Analise a imagem da nota fiscal e extraia TODOS os campos dispon\xEDveis. Para cada campo, informe o valor extra\xEDdo e um score de confian\xE7a de 0 a 1 (0 = n\xE3o encontrado/ileg\xEDvel, 1 = certeza total).

Retorne APENAS um JSON v\xE1lido, sem explica\xE7\xF5es, sem markdown, sem texto adicional.

Estrutura obrigat\xF3ria do JSON (cada chave com objeto { "valor": ... | null, "confianca": n\xFAmero 0-1 }):

chave_nfe, numero_nota, serie, data_emissao (YYYY-MM-DD), codigo_verificacao, protocolo_autorizacao, codigo_municipio_ibge,
emitente_nome, emitente_cnpj_cpf, emitente_crp, emitente_ie, emitente_im, emitente_endereco, emitente_bairro, emitente_municipio, emitente_uf, emitente_cep, emitente_telefone, emitente_email, emitente_complemento,
tomador_nome, tomador_cpf_cnpj, tomador_endereco, tomador_bairro, tomador_municipio, tomador_uf, tomador_cep, tomador_email, tomador_telefone, tomador_ie, tomador_im, tomador_complemento,
descricao_servico, codigo_servico, codigo_cnae, nbs, codigo_municipio_servico,
iss_retido (boolean), aliquota_iss (decimal ex: 0.05 para 5%),
valor_servicos, valor_deducoes, base_calculo, valor_iss, valor_pis, valor_cofins, valor_inss, valor_ir, valor_csll, valor_liquido, valor_ibs, valor_cbs, cst, codigo_classificacao_tributaria,
emitente_divergencias (string ou null: descreva diverg\xEAncias entre dados do emitente na nota e os dados cadastrados fornecidos; null se n\xE3o houver).

Regras: Valores monet\xE1rios como n\xFAmero decimal (ex: 1200.50). Datas YYYY-MM-DD. CPF/CNPJ/CEP formatados. Campo vazio ou ileg\xEDvel: valor null.`;
var GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
var NFS_E_TEXT_EXTRACTION_PROMPT = `Voc\xEA \xE9 um especialista em leitura de Notas Fiscais de Servi\xE7os brasileiras (NFS-e), especialmente de profissionais de sa\xFAde como psic\xF3logos.

Analise o texto da nota fiscal abaixo e extraia TODOS os campos dispon\xEDveis. Para cada campo, informe o valor extra\xEDdo e um score de confian\xE7a de 0 a 1 (0 = n\xE3o encontrado, 1 = certeza total).

Retorne APENAS um JSON v\xE1lido, sem explica\xE7\xF5es, sem markdown, sem texto adicional.

Estrutura obrigat\xF3ria do JSON (cada chave com objeto { "valor": ... | null, "confianca": n\xFAmero 0-1 }):

chave_nfe, numero_nota, serie, data_emissao (YYYY-MM-DD), codigo_verificacao, protocolo_autorizacao, codigo_municipio_ibge,
emitente_nome, emitente_cnpj_cpf, emitente_crp, emitente_ie, emitente_im, emitente_endereco, emitente_bairro, emitente_municipio, emitente_uf, emitente_cep, emitente_telefone, emitente_email, emitente_complemento,
tomador_nome, tomador_cpf_cnpj, tomador_endereco, tomador_bairro, tomador_municipio, tomador_uf, tomador_cep, tomador_email, tomador_telefone, tomador_ie, tomador_im, tomador_complemento,
descricao_servico, codigo_servico, codigo_cnae, nbs, codigo_municipio_servico,
iss_retido (boolean), aliquota_iss (decimal ex: 0.05 para 5%),
valor_servicos, valor_deducoes, base_calculo, valor_iss, valor_pis, valor_cofins, valor_inss, valor_ir, valor_csll, valor_liquido, valor_ibs, valor_cbs, cst, codigo_classificacao_tributaria,
emitente_divergencias (string ou null: descreva diverg\xEAncias entre dados do emitente na nota e os dados cadastrados fornecidos; null se n\xE3o houver).

Regras: Valores monet\xE1rios como n\xFAmero decimal (ex: 1200.50). Datas YYYY-MM-DD. CPF/CNPJ/CEP formatados. Campo vazio ou n\xE3o encontrado: valor null.`;
async function pdfBufferToImageBase64(pdfBuffer) {
  const id = `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const inputPath = join(tmpdir(), `${id}.pdf`);
  const outputPrefix = join(tmpdir(), id);
  const cleanUp = () => {
    for (const f of [inputPath, `${outputPrefix}-1.png`, `${outputPrefix}-01.png`, `${outputPrefix}-001.png`]) {
      try {
        if (existsSync(f)) unlinkSync(f);
      } catch {
      }
    }
  };
  try {
    writeFileSync(inputPath, pdfBuffer);
    try {
      await execFileAsync("pdftoppm", ["-png", "-r", "200", "-f", "1", "-l", "1", inputPath, outputPrefix]);
    } catch (err) {
      throw new UnsupportedFormatError(
        "N\xE3o foi poss\xEDvel processar este PDF escaneado automaticamente. Envie uma foto/print da nota em vez do PDF."
      );
    }
    const candidates = [`${outputPrefix}-1.png`, `${outputPrefix}-01.png`, `${outputPrefix}-001.png`];
    const pngPath = candidates.find(existsSync);
    if (!pngPath) {
      throw new UnsupportedFormatError("N\xE3o foi poss\xEDvel converter o PDF para imagem. O arquivo pode estar corrompido.");
    }
    const pngBuffer = readFileSync(pngPath);
    return pngBuffer.toString("base64");
  } finally {
    cleanUp();
  }
}
async function analyzeInvoicePdf(pdfBase64, psychologistProfile) {
  if (!process.env.GROQ_API_KEY) {
    throw new AIServiceError("GROQ_API_KEY n\xE3o configurada. An\xE1lise de nota fiscal indispon\xEDvel.");
  }
  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  let textContent = null;
  try {
    const parsed = await pdfParse(pdfBuffer);
    const extracted = parsed.text ?? "";
    if (extracted.trim().length >= 20) {
      textContent = extracted;
    }
  } catch {
  }
  if (!textContent) {
    console.log("[analyzeInvoicePdf] Sem texto extra\xEDvel \u2014 usando fallback de vis\xE3o via pdftoppm");
    const imageBase64 = await pdfBufferToImageBase64(pdfBuffer);
    return analyzeInvoiceImage(imageBase64, "image/png", psychologistProfile);
  }
  const maxChars = 12e3;
  if (textContent.length > maxChars) {
    textContent = textContent.slice(0, maxChars) + "\n\n[...documento truncado...]";
  }
  const profileText = psychologistProfile ? `
Dados cadastrados da psic\xF3loga emitente para refer\xEAncia e compara\xE7\xE3o (informe diverg\xEAncias em emitente_divergencias):
${JSON.stringify(psychologistProfile, null, 2)}` : "";
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      messages: [
        { role: "system", content: NFS_E_TEXT_EXTRACTION_PROMPT + profileText },
        { role: "user", content: `Texto extra\xEDdo da nota fiscal:

${textContent}` }
      ],
      temperature: 0.2,
      max_tokens: 2e3,
      response_format: { type: "json_object" }
    });
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      throw new AIServiceError("A IA n\xE3o retornou dados. Tente novamente.");
    }
    let parsed;
    try {
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new AIServiceError("N\xE3o foi poss\xEDvel interpretar a resposta da IA. Tente novamente.");
    }
    const confidences = Object.values(parsed).filter((v) => typeof v === "object" && v !== null && "confianca" in v).map((v) => v.confianca);
    const ai_confidence_score = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    return { data: parsed, ai_confidence_score: Math.round(ai_confidence_score * 1e3) / 1e3 };
  } catch (error) {
    if (error instanceof UnsupportedFormatError || error instanceof AIServiceError) throw error;
    const err = error;
    const status = err?.status ?? err?.statusCode ?? err?.error?.status;
    if (status === 429) {
      throw new AIQuotaError("Limite de requisi\xE7\xF5es atingido. Aguarde alguns instantes e tente novamente.");
    }
    console.error("Groq PDF analysis error:", error);
    throw new AIServiceError("Erro ao analisar o PDF da nota fiscal. Tente novamente.");
  }
}
async function analyzeInvoiceImage(imageBase64, imageType, psychologistProfile) {
  if (!process.env.GROQ_API_KEY) {
    throw new AIServiceError("GROQ_API_KEY n\xE3o configurada. An\xE1lise de nota fiscal indispon\xEDvel.");
  }
  const base64Length = imageBase64.length;
  const estimatedBytes = base64Length * 3 / 4;
  if (estimatedBytes > MAX_BASE64_SIZE_BYTES) {
    throw new UnsupportedFormatError(
      "Imagem muito grande. O tamanho m\xE1ximo para an\xE1lise \xE9 4MB. Reduza a resolu\xE7\xE3o ou compresse a imagem."
    );
  }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const mime = imageType.toLowerCase();
  if (!allowedTypes.some((t) => mime.includes(t))) {
    throw new UnsupportedFormatError("Formato de imagem n\xE3o suportado. Use JPEG, PNG ou WebP.");
  }
  const mediaType = mime.includes("png") ? "image/png" : mime.includes("webp") ? "image/webp" : "image/jpeg";
  const dataUrl = `data:${mediaType};base64,${imageBase64}`;
  const profileText = psychologistProfile ? `
Dados cadastrados da psic\xF3loga emitente para refer\xEAncia e compara\xE7\xE3o (informe diverg\xEAncias em emitente_divergencias):
${JSON.stringify(psychologistProfile, null, 2)}` : "";
  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: NFS_E_EXTRACTION_PROMPT + profileText },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 2e3,
      response_format: { type: "json_object" }
    });
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent || typeof rawContent !== "string") {
      throw new AIServiceError("A IA n\xE3o retornou dados. Tente outra imagem.");
    }
    let parsed;
    try {
      const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new AIServiceError("N\xE3o foi poss\xEDvel interpretar a resposta da IA. Verifique a qualidade da foto e tente novamente.");
    }
    const confidences = Object.values(parsed).filter((v) => typeof v === "object" && v !== null && "confianca" in v).map((v) => v.confianca);
    const ai_confidence_score = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    return { data: parsed, ai_confidence_score: Math.round(ai_confidence_score * 1e3) / 1e3 };
  } catch (error) {
    if (error instanceof UnsupportedFormatError || error instanceof AIServiceError) throw error;
    const err = error;
    const status = err?.status ?? err?.statusCode ?? err?.error?.status;
    if (status === 429) {
      throw new AIQuotaError("Limite de requisi\xE7\xF5es atingido. Aguarde alguns instantes e tente novamente.");
    }
    if (status === 413) {
      throw new UnsupportedFormatError("Imagem muito grande. Use no m\xE1ximo 4MB.");
    }
    console.error("Groq vision error:", error);
    throw new AIServiceError("Erro ao analisar a imagem da nota fiscal. Tente novamente.");
  }
}

// server/routes/patient-records.ts
import { eq as eq4 } from "drizzle-orm";
var router2 = Router2();
var MAX_FILE_SIZE_MB = 4;
var MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES
  },
  fileFilter: function(req, file, cb) {
    const forbidden = /exe|sh|bat|js|php|pl|py/;
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (forbidden.test(ext)) {
      return cb(new Error("Tipo de arquivo n\xE3o permitido por seguran\xE7a."));
    }
    cb(null, true);
  }
});
function uploadSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: `O arquivo excede o tamanho m\xE1ximo permitido de ${MAX_FILE_SIZE_MB}MB.`
          });
        }
        if (err.message) {
          return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: "Erro no upload do arquivo." });
      }
      next();
    });
  };
}
var checkAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "N\xE3o autenticado" });
  }
  next();
};
router2.use(checkAuth);
async function checkPatientAccess(req, res, next) {
  try {
    const user = req.user;
    const patientId = parseInt(req.params.id);
    if (!patientId || isNaN(patientId)) {
      return res.status(400).json({ message: "ID de paciente inv\xE1lido" });
    }
    const patient = await storage.getPatient(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Paciente n\xE3o encontrado" });
    }
    if (user.role === "admin") {
      req.patient = patient;
      return next();
    }
    if (user.role === "psychologist") {
      const psychologist = await storage.getPsychologistByUserId(user.id);
      const psychologistId = psychologist?.id ?? -1;
      if (isPatientOwned(patient, psychologistId, user.id)) {
        req.patient = patient;
        return next();
      }
    }
    await storage.createAuditLog({
      userId: user.id,
      action: "access_denied",
      resourceType: "patient_record",
      resourceId: patientId,
      patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: {
        reason: "unauthorized",
        role: user.role,
        psychologistIdOnPatient: patient.psychologistId
      }
    }).catch(() => {
    });
    return res.status(403).json({
      message: "Acesso negado. Voc\xEA n\xE3o possui permiss\xE3o para visualizar este prontu\xE1rio.",
      code: "FORBIDDEN"
    });
  } catch (error) {
    console.error("checkPatientAccess error:", error);
    return res.status(500).json({ message: "Erro ao verificar permiss\xE3o de acesso" });
  }
}
function isPatientOwned(patient, psychologistId, userId) {
  return patient.psychologistId === psychologistId || patient.createdBy === userId;
}
router2.get("/", async (req, res) => {
  try {
    const user = req.user;
    const activeOnly = req.query.active !== "false";
    let patientsList = await storage.listPatients(activeOnly);
    if (user.role === "psychologist") {
      const psychologist = await storage.getPsychologistByUserId(user.id);
      const psychologistId = psychologist?.id ?? -1;
      patientsList = patientsList.filter((p) => isPatientOwned(p, psychologistId, user.id));
    }
    if (user.role === "admin") {
      const allPsychologists = await db2.select({ id: psychologists.id, fullName: users.fullName }).from(psychologists).innerJoin(users, eq4(psychologists.userId, users.id));
      const psychologistNames = {};
      for (const row of allPsychologists) {
        psychologistNames[row.id] = row.fullName;
      }
      const enriched = patientsList.map((p) => ({
        ...p,
        psychologistName: p.psychologistId ? psychologistNames[p.psychologistId] ?? null : null
      }));
      return res.json(enriched);
    }
    res.json(patientsList);
  } catch (error) {
    console.error("Error listing patients:", error);
    res.status(500).json({ message: "Erro ao listar pacientes" });
  }
});
router2.get("/:id", checkPatientAccess, async (req, res) => {
  try {
    res.json(req.patient);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar paciente" });
  }
});
router2.post("/", async (req, res) => {
  try {
    const data = insertPatientSchema.parse(req.body);
    const userId = req.user.id;
    const userRole = req.user.role;
    let psychologistId = data.psychologistId ?? null;
    if (!psychologistId && userRole === "psychologist") {
      const psychRecord = await storage.getPsychologistByUserId(userId);
      if (psychRecord) psychologistId = psychRecord.id;
    }
    const patientData = { ...data, createdBy: userId, psychologistId };
    const patient = await storage.createPatient(patientData);
    await storage.createAuditLog({
      userId,
      action: "create",
      resourceType: "patient",
      resourceId: patient.id,
      patientId: patient.id,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { name: patient.fullName }
    });
    res.status(201).json(patient);
  } catch (error) {
    if (error instanceof z2.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Erro ao criar paciente" });
  }
});
router2.put("/:id", checkPatientAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    const data = insertPatientSchema.partial().parse(req.body);
    const patient = await storage.updatePatient(id, data);
    if (!patient) {
      return res.status(404).json({ message: "Paciente n\xE3o encontrado" });
    }
    await storage.createAuditLog({
      userId,
      action: "update",
      resourceType: "patient",
      resourceId: patient.id,
      patientId: patient.id,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { changes: Object.keys(data) }
    });
    res.json(patient);
  } catch (error) {
    if (error instanceof z2.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Erro ao atualizar paciente" });
  }
});
router2.get("/:id/medical-record", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const userId = req.user.id;
    const record = await storage.getMedicalRecordByPatientId(patientId);
    await storage.createAuditLog({
      userId,
      action: "view",
      resourceType: "medical_record",
      resourceId: record?.id || 0,
      patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { found: !!record }
    });
    res.json(record || null);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar prontu\xE1rio" });
  }
});
router2.post("/:id/medical-record", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const userId = req.user.id;
    const existing = await storage.getMedicalRecordByPatientId(patientId);
    const data = insertMedicalRecordSchema.parse({ ...req.body, patientId });
    let record;
    if (existing) {
      record = await storage.updateMedicalRecord(existing.id, data);
    } else {
      record = await storage.createMedicalRecord(data);
    }
    await storage.createAuditLog({
      userId,
      action: existing ? "update" : "create",
      resourceType: "medical_record",
      resourceId: record.id,
      patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { method: existing ? "update" : "create" }
    });
    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao salvar prontu\xE1rio" });
  }
});
router2.get("/:id/counts", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const [sessions, documents, assessments] = await Promise.all([
      storage.listSessionsByPatientId(patientId),
      storage.listDocumentsByPatientId(patientId),
      storage.listAssessmentsByPatientId(patientId)
    ]);
    res.json({
      sessions: sessions.filter((s) => s.isActive !== false).length,
      documents: documents.length,
      assessments: assessments.length
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar contagens" });
  }
});
router2.get("/:id/sessions", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const sessions = await storage.listSessionsByPatientId(patientId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar sess\xF5es" });
  }
});
router2.post("/:id/sessions", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const userId = req.user.id;
    const data = insertClinicalSessionSchema.parse({ ...req.body, patientId });
    const session3 = await storage.createSession(data);
    await storage.createAuditLog({
      userId,
      action: "create",
      resourceType: "clinical_session",
      resourceId: session3.id,
      patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { date: session3.sessionDate }
    });
    res.status(201).json(session3);
  } catch (error) {
    console.error(error);
    if (error instanceof z2.ZodError) {
      return res.status(400).json({ message: error.errors });
    }
    res.status(500).json({ message: "Erro ao criar sess\xE3o" });
  }
});
router2.put("/sessions/:sessionId", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const userId = req.user.id;
    const data = insertClinicalSessionSchema.partial().parse(req.body);
    const oldSession = await storage.getSession(sessionId);
    if (!oldSession) return res.status(404).json({ message: "Sess\xE3o n\xE3o encontrada" });
    const updateData = { ...data, editedBy: userId, version: (oldSession.version || 1) + 1 };
    const session3 = await storage.updateSession(sessionId, updateData);
    await storage.createAuditLog({
      userId,
      action: "update",
      resourceType: "clinical_session",
      resourceId: session3.id,
      patientId: session3.patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { version: session3.version }
    });
    res.json(session3);
  } catch (error) {
    res.status(500).json({ message: "Erro ao atualizar sess\xE3o" });
  }
});
router2.patch("/sessions/:sessionId/archive", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const userId = req.user.id;
    const session3 = await storage.getSession(sessionId);
    if (!session3) return res.status(404).json({ message: "Sess\xE3o n\xE3o encontrada" });
    const updated = await storage.updateSession(sessionId, { isActive: false, editedBy: userId });
    await storage.createAuditLog({
      userId,
      action: "archive",
      resourceType: "clinical_session",
      resourceId: sessionId,
      patientId: session3.patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { archived: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erro ao arquivar sess\xE3o" });
  }
});
router2.get("/:id/documents", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const docs = await storage.listDocumentsByPatientId(patientId);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar documentos" });
  }
});
router2.post("/:id/documents", checkPatientAccess, uploadSingle("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const patientId = parseInt(req.params.id);
    const userId = req.user.id;
    const { documentType, documentName } = req.body;
    const docData = {
      patientId,
      documentType: documentType || "other",
      documentName: documentName || req.file.originalname,
      fileData: req.file.buffer,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: userId
    };
    const doc = await storage.createDocument(docData);
    await storage.createAuditLog({
      userId,
      action: "upload",
      resourceType: "document",
      resourceId: doc.id,
      patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { filename: doc.documentName }
    });
    const { fileData, ...docResponse } = doc;
    res.status(201).json(docResponse);
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({ message: "Erro ao fazer upload do documento" });
  }
});
router2.get("/documents/:docId/download", async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    const userId = req.user.id;
    const doc = await storage.getDocument(docId);
    if (!doc) return res.status(404).json({ message: "Documento n\xE3o encontrado" });
    if (!doc.fileData) {
      return res.status(404).json({ message: "Arquivo n\xE3o encontrado" });
    }
    await storage.createAuditLog({
      userId,
      action: "download",
      resourceType: "document",
      resourceId: docId,
      patientId: doc.patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { filename: doc.documentName }
    });
    res.set("Content-Type", doc.mimeType);
    res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.documentName)}"`);
    res.send(doc.fileData);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ message: "Erro ao baixar documento" });
  }
});
router2.post("/documents/:docId/summarize", async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    const doc = await storage.getDocument(docId);
    if (!doc) return res.status(404).json({ message: "Documento n\xE3o encontrado" });
    if (!doc.fileData) {
      return res.status(404).json({ message: "Arquivo n\xE3o encontrado" });
    }
    const summary = await summarizeDocument(doc.fileData, doc.mimeType, doc.documentName);
    res.json({ summary });
  } catch (error) {
    if (error instanceof UnsupportedFormatError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof AIQuotaError) {
      return res.status(429).json({ message: error.message });
    }
    if (error instanceof AIServiceError) {
      return res.status(502).json({ message: error.message });
    }
    console.error("AI summarize error:", error);
    res.status(500).json({ message: "Erro ao processar documento." });
  }
});
router2.delete("/documents/:docId", async (req, res) => {
  try {
    const docId = parseInt(req.params.docId);
    const userId = req.user.id;
    const doc = await storage.getDocument(docId);
    if (!doc) return res.status(404).json({ message: "Documento n\xE3o encontrado" });
    await storage.deleteDocument(docId);
    await storage.createAuditLog({
      userId,
      action: "delete",
      resourceType: "document",
      resourceId: docId,
      patientId: doc.patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { filename: doc.documentName }
    });
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ message: "Erro ao excluir documento" });
  }
});
router2.get("/:id/assessments", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const assessments = await storage.listAssessmentsByPatientId(patientId);
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: "Erro ao listar avalia\xE7\xF5es" });
  }
});
router2.post("/:id/assessments", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const userId = req.user.id;
    const data = insertPsychologicalAssessmentSchema.parse({ ...req.body, patientId });
    const assessment = await storage.createAssessment(data);
    await storage.createAuditLog({
      userId,
      action: "create",
      resourceType: "assessment",
      resourceId: assessment.id,
      patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: { name: assessment.assessmentName }
    });
    res.status(201).json(assessment);
  } catch (error) {
    if (error instanceof z2.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    res.status(500).json({ message: "Erro ao criar avalia\xE7\xE3o" });
  }
});
router2.get("/:id/audit-logs", checkPatientAccess, async (req, res) => {
  try {
    const patientId = parseInt(req.params.id);
    const logs = await storage.listAuditLogsByPatientId(patientId);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
  }
});
router2.patch("/:id/transfer", async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "admin") {
      await storage.createAuditLog({
        userId: user.id,
        action: "transfer_denied",
        resourceType: "patient_record",
        resourceId: parseInt(req.params.id),
        patientId: parseInt(req.params.id),
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
        details: { reason: "not_admin", role: user.role }
      }).catch(() => {
      });
      return res.status(403).json({ message: "Apenas administradores podem transferir pacientes.", code: "FORBIDDEN" });
    }
    const patientId = parseInt(req.params.id);
    const { toPsychologistId, reason } = req.body;
    if (!toPsychologistId) {
      return res.status(400).json({ message: "toPsychologistId \xE9 obrigat\xF3rio." });
    }
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.status(404).json({ message: "Paciente n\xE3o encontrado." });
    const targetPsychologist = await storage.getPsychologist(toPsychologistId);
    if (!targetPsychologist) {
      return res.status(400).json({ message: "Psic\xF3logo de destino n\xE3o encontrado." });
    }
    if (patient.psychologistId === toPsychologistId) {
      return res.status(400).json({ message: "O paciente j\xE1 est\xE1 vinculado a este psic\xF3logo." });
    }
    const result = await storage.transferPatient({
      patientId,
      fromPsychologistId: patient.psychologistId ?? null,
      toPsychologistId,
      transferredByAdminId: user.id,
      reason: reason || null
    });
    await storage.createAuditLog({
      userId: user.id,
      action: "patient_transfer",
      resourceType: "patient",
      resourceId: patientId,
      patientId,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      details: {
        fromPsychologistId: patient.psychologistId,
        toPsychologistId,
        reason: reason || null
      }
    }).catch(() => {
    });
    res.json({ message: "Paciente transferido com sucesso.", transfer: result });
  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ message: "Erro ao transferir paciente." });
  }
});
router2.get("/:id/transfers", async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado.", code: "FORBIDDEN" });
    }
    const patientId = parseInt(req.params.id);
    const transfers = await storage.listTransfersByPatientId(patientId);
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar hist\xF3rico de transfer\xEAncias." });
  }
});
var patient_records_default = router2;

// server/routes/meetings.ts
import { Router as Router3 } from "express";
import { eq as eq5, and as and4, gte as gte2, lte as lte2, desc as desc2 } from "drizzle-orm";
import { z as z3 } from "zod";
var router3 = Router3();
function requireAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "N\xE3o autenticado" });
  next();
}
function canAccessMeeting(user, meeting) {
  return meeting.psychologistId === user.id;
}
function handleGoogleError(res, error) {
  if (isGoogleTokenExpired(error)) {
    return res.status(401).json({
      error: "GOOGLE_TOKEN_EXPIRED",
      message: "Sua conex\xE3o com o Google expirou. Acesse Configura\xE7\xF5es \u2192 Google Calendar e fa\xE7a novo login."
    });
  }
  console.error("Google API error:", error);
  return res.status(500).json({ error: "Erro de comunica\xE7\xE3o com o Google" });
}
router3.get("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { status, dateFrom, dateTo, patientId } = req.query;
    const conditions = [];
    conditions.push(eq5(meetings.psychologistId, user.id));
    if (status && status !== "all") {
      conditions.push(eq5(meetings.status, status));
    }
    if (dateFrom) {
      conditions.push(gte2(meetings.scheduledAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte2(meetings.scheduledAt, new Date(dateTo)));
    }
    if (patientId) {
      conditions.push(eq5(meetings.patientId, parseInt(patientId)));
    }
    const baseQuery = db2.select({
      id: meetings.id,
      psychologistId: meetings.psychologistId,
      patientId: meetings.patientId,
      appointmentId: meetings.appointmentId,
      title: meetings.title,
      description: meetings.description,
      googleEventId: meetings.googleEventId,
      meetLink: meetings.meetLink,
      status: meetings.status,
      scheduledAt: meetings.scheduledAt,
      durationMinutes: meetings.durationMinutes,
      startedAt: meetings.startedAt,
      endedAt: meetings.endedAt,
      actualDuration: meetings.actualDuration,
      patientEmail: meetings.patientEmail,
      patientName: meetings.patientName,
      linkSentAt: meetings.linkSentAt,
      notes: meetings.notes,
      createdAt: meetings.createdAt,
      patientFullName: patients.fullName,
      patientPhone: patients.phone,
      patientPhotoUrl: patients.photoUrl
    }).from(meetings).leftJoin(patients, eq5(meetings.patientId, patients.id)).orderBy(desc2(meetings.scheduledAt));
    const rows = conditions.length > 0 ? await baseQuery.where(and4(...conditions)) : await baseQuery;
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = rows.map((m) => ({
      ...m,
      isToday: m.scheduledAt >= today && m.scheduledAt < tomorrow
    }));
    res.json(result);
  } catch (error) {
    console.error("Erro ao listar reuni\xF5es:", error);
    res.status(500).json({ error: "Erro ao listar reuni\xF5es" });
  }
});
router3.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db2.select({
      id: meetings.id,
      psychologistId: meetings.psychologistId,
      patientId: meetings.patientId,
      title: meetings.title,
      description: meetings.description,
      googleEventId: meetings.googleEventId,
      meetLink: meetings.meetLink,
      status: meetings.status,
      scheduledAt: meetings.scheduledAt,
      durationMinutes: meetings.durationMinutes,
      startedAt: meetings.startedAt,
      endedAt: meetings.endedAt,
      actualDuration: meetings.actualDuration,
      patientEmail: meetings.patientEmail,
      patientName: meetings.patientName,
      linkSentAt: meetings.linkSentAt,
      notes: meetings.notes,
      createdAt: meetings.createdAt,
      patientFullName: patients.fullName,
      patientPhone: patients.phone,
      patientPhotoUrl: patients.photoUrl
    }).from(meetings).leftJoin(patients, eq5(meetings.patientId, patients.id)).where(eq5(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
    const meeting = rows[0];
    if (!canAccessMeeting(user, meeting)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar reuni\xE3o" });
  }
});
var createSchema = z3.object({
  patientId: z3.number().int().positive(),
  title: z3.string().optional(),
  description: z3.string().optional(),
  scheduledAt: z3.string(),
  durationMinutes: z3.number().int().positive().default(50),
  sendLinkNow: z3.boolean().optional().default(false),
  appointmentId: z3.number().int().positive().optional()
});
router3.post("/", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const body = createSchema.parse(req.body);
    const psychologistId = user.id;
    const patientRows = await db2.select().from(patients).where(eq5(patients.id, body.patientId));
    if (!patientRows.length) return res.status(404).json({ error: "Paciente n\xE3o encontrado" });
    const patient = patientRows[0];
    const scheduledAt = new Date(body.scheduledAt);
    const endDateTime = new Date(scheduledAt.getTime() + body.durationMinutes * 6e4);
    const title = body.title || `Sess\xE3o com ${patient.fullName}`;
    const tokenRows = await db2.select().from(googleTokens).where(eq5(googleTokens.userId, psychologistId));
    const hasGoogleCalendar = tokenRows.length > 0;
    let googleEventId = null;
    let meetLink = null;
    if (hasGoogleCalendar) {
      try {
        const calResult = await createMeetingEvent(psychologistId, {
          summary: title,
          description: body.description,
          startDateTime: scheduledAt.toISOString(),
          endDateTime: endDateTime.toISOString(),
          attendeeEmail: patient.email || void 0,
          requestId: `consultapsi-${Date.now()}-${body.patientId}`
        });
        if (calResult) {
          googleEventId = calResult.googleEventId;
          meetLink = calResult.meetLink;
        }
      } catch (googleErr) {
        if (isGoogleTokenExpired(googleErr)) {
          return handleGoogleError(res, googleErr);
        }
        console.error("Google Calendar error during create:", googleErr);
      }
    }
    const [meeting] = await db2.insert(meetings).values({
      psychologistId,
      patientId: body.patientId,
      appointmentId: body.appointmentId ?? null,
      title,
      description: body.description ?? null,
      googleEventId,
      meetLink,
      status: "scheduled",
      scheduledAt,
      durationMinutes: body.durationMinutes,
      patientEmail: patient.email ?? null,
      patientName: patient.fullName
    }).returning();
    let emailSent = false;
    if (body.sendLinkNow && patient.email && meetLink) {
      const psychUser = await db2.select({ fullName: users.fullName, email: users.email }).from(users).where(eq5(users.id, psychologistId));
      const psych = psychUser[0];
      try {
        emailSent = await sendMeetLinkEmail({
          userId: psychologistId,
          patientName: patient.fullName,
          patientEmail: patient.email,
          psychologistName: psych?.fullName || user.fullName,
          psychologistEmail: psych?.email || user.email,
          meetLink,
          scheduledAt,
          durationMinutes: body.durationMinutes
        });
      } catch (emailErr) {
        if (isGoogleTokenExpired(emailErr)) {
          return res.status(201).json({
            ...meeting,
            emailSent: false,
            hasGoogleCalendar,
            warning: "GOOGLE_TOKEN_EXPIRED_EMAIL",
            warningMessage: "Reuni\xE3o criada, mas n\xE3o foi poss\xEDvel enviar o e-mail: token Google expirado. Reconecte sua conta."
          });
        }
      }
      if (emailSent) {
        await db2.update(meetings).set({ linkSentAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq5(meetings.id, meeting.id));
      }
    }
    res.status(201).json({ ...meeting, emailSent, hasGoogleCalendar });
  } catch (error) {
    if (error instanceof z3.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (isGoogleTokenExpired(error)) {
      return handleGoogleError(res, error);
    }
    console.error("Erro ao criar reuni\xE3o:", error);
    res.status(500).json({ error: "Erro ao criar reuni\xE3o" });
  }
});
router3.patch("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db2.select().from(meetings).where(eq5(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
    const meeting = rows[0];
    if (!canAccessMeeting(user, meeting)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const { title, description, scheduledAt, durationMinutes } = req.body;
    const updates = { updatedAt: /* @__PURE__ */ new Date() };
    let newScheduledAt = meeting.scheduledAt;
    let newDuration = meeting.durationMinutes;
    if (title) updates.title = title;
    if (description !== void 0) updates.description = description;
    if (scheduledAt) {
      updates.scheduledAt = new Date(scheduledAt);
      newScheduledAt = new Date(scheduledAt);
    }
    if (durationMinutes) {
      updates.durationMinutes = durationMinutes;
      newDuration = durationMinutes;
    }
    if (meeting.googleEventId && (scheduledAt || durationMinutes || title)) {
      try {
        const endDt = new Date(newScheduledAt.getTime() + newDuration * 6e4);
        await updateCalendarEvent(meeting.psychologistId, meeting.googleEventId, {
          summary: title || meeting.title,
          description,
          startDateTime: newScheduledAt.toISOString(),
          endDateTime: endDt.toISOString()
        });
      } catch (googleErr) {
        if (isGoogleTokenExpired(googleErr)) {
          return handleGoogleError(res, googleErr);
        }
      }
    }
    const [updated] = await db2.update(meetings).set(updates).where(eq5(meetings.id, id)).returning();
    res.json(updated);
  } catch (error) {
    if (isGoogleTokenExpired(error)) return handleGoogleError(res, error);
    res.status(500).json({ error: "Erro ao atualizar reuni\xE3o" });
  }
});
router3.post("/:id/start", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db2.select().from(meetings).where(eq5(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
    const meeting = rows[0];
    if (!canAccessMeeting(user, meeting)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const [updated] = await db2.update(meetings).set({ status: "active", startedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq5(meetings.id, id)).returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao iniciar reuni\xE3o" });
  }
});
router3.post("/:id/end", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db2.select().from(meetings).where(eq5(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
    const meeting = rows[0];
    if (!canAccessMeeting(user, meeting)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const endedAt = /* @__PURE__ */ new Date();
    const startedAt = meeting.startedAt || meeting.scheduledAt;
    const actualDuration = Math.round((endedAt.getTime() - startedAt.getTime()) / 6e4);
    const { notes } = req.body;
    const [updated] = await db2.update(meetings).set({
      status: "ended",
      endedAt,
      actualDuration,
      notes: notes || meeting.notes,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(meetings.id, id)).returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao encerrar reuni\xE3o" });
  }
});
router3.patch("/:id/notes", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db2.select().from(meetings).where(eq5(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
    const meeting = rows[0];
    if (!canAccessMeeting(user, meeting)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    const [updated] = await db2.update(meetings).set({ notes: req.body.notes, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(meetings.id, id)).returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Erro ao salvar anota\xE7\xF5es" });
  }
});
router3.post("/:id/send-link", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db2.select().from(meetings).where(eq5(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
    const meeting = rows[0];
    if (!canAccessMeeting(user, meeting)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    if (!meeting.meetLink) return res.status(400).json({ error: "Sem link do Meet" });
    if (!meeting.patientEmail) return res.status(400).json({ error: "Paciente sem e-mail" });
    const psychUser = await db2.select({ fullName: users.fullName, email: users.email }).from(users).where(eq5(users.id, meeting.psychologistId));
    const psych = psychUser[0];
    try {
      const sent = await sendMeetLinkEmail({
        userId: meeting.psychologistId,
        patientName: meeting.patientName || "Paciente",
        patientEmail: meeting.patientEmail,
        psychologistName: psych?.fullName || user.fullName,
        psychologistEmail: psych?.email || user.email,
        meetLink: meeting.meetLink,
        scheduledAt: meeting.scheduledAt,
        durationMinutes: meeting.durationMinutes
      });
      if (sent) {
        await db2.update(meetings).set({ linkSentAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq5(meetings.id, id));
      }
      res.json({ sent });
    } catch (emailErr) {
      if (isGoogleTokenExpired(emailErr)) {
        return handleGoogleError(res, emailErr);
      }
      throw emailErr;
    }
  } catch (error) {
    if (isGoogleTokenExpired(error)) return handleGoogleError(res, error);
    res.status(500).json({ error: "Erro ao enviar link" });
  }
});
router3.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const id = parseInt(req.params.id);
    const rows = await db2.select().from(meetings).where(eq5(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: "Reuni\xE3o n\xE3o encontrada" });
    const meeting = rows[0];
    if (!canAccessMeeting(user, meeting)) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    if (meeting.googleEventId) {
      try {
        await deleteCalendarEvent(meeting.psychologistId, meeting.googleEventId);
      } catch (googleErr) {
        if (isGoogleTokenExpired(googleErr)) {
          console.warn("Token expirado ao remover evento do Calendar \u2014 prosseguindo com cancelamento:", googleErr);
        }
      }
    }
    await db2.update(meetings).set({ status: "cancelled", updatedAt: /* @__PURE__ */ new Date() }).where(eq5(meetings.id, id));
    res.json({ success: true });
  } catch (error) {
    if (isGoogleTokenExpired(error)) return handleGoogleError(res, error);
    res.status(500).json({ error: "Erro ao cancelar reuni\xE3o" });
  }
});
var meetings_default = router3;

// server/routes/profile.ts
import { Router as Router4 } from "express";
import { eq as eq6 } from "drizzle-orm";
import multer2 from "multer";
import path2 from "path";
import fs from "fs";
import crypto from "crypto";
var router4 = Router4();
var uploadDir = path2.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var avatarStorage = multer2.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique2 = Date.now() + "-" + crypto.randomBytes(6).toString("hex");
    cb(null, `avatar-${unique2}${path2.extname(file.originalname)}`);
  }
});
var avatarUpload = multer2({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|webp)/;
    if (allowed.test(file.mimetype)) return cb(null, true);
    cb(new Error("Apenas imagens JPEG, PNG ou WEBP s\xE3o permitidas."));
  }
});
function requireAuth2(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "N\xE3o autenticado." });
  next();
}
function calcAge(birthDate) {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  const today = /* @__PURE__ */ new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || m === 0 && today.getDate() < birth.getDate()) age--;
  return age;
}
router4.use(requireAuth2);
router4.get("/", async (req, res) => {
  try {
    const user = req.user;
    const [userData] = await db2.select().from(users).where(eq6(users.id, user.id));
    if (!userData) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    const [psychData] = await db2.select().from(psychologists).where(eq6(psychologists.userId, user.id));
    let specializations = [];
    if (psychData) {
      const rows = await db2.select({ id: specializationAreas.id, name: specializationAreas.name, category: specializationAreas.category }).from(psychologistSpecializations).innerJoin(specializationAreas, eq6(psychologistSpecializations.specializationAreaId, specializationAreas.id)).where(eq6(psychologistSpecializations.psychologistId, psychData.id));
      specializations = rows;
    }
    const { password, ...safeUser } = userData;
    return res.json({
      ...safeUser,
      psychologist: psychData || null,
      age: calcAge(userData.birthDate),
      specializations
    });
  } catch (e) {
    console.error("GET /api/profile error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router4.patch("/", async (req, res) => {
  try {
    const user = req.user;
    const { fullName, phone, birthDate, crpNumber, bio } = req.body;
    const userUpdate = {};
    if (fullName !== void 0) userUpdate.fullName = fullName;
    if (birthDate !== void 0) userUpdate.birthDate = birthDate || null;
    if (Object.keys(userUpdate).length > 0) {
      await db2.update(users).set(userUpdate).where(eq6(users.id, user.id));
    }
    const psychUpdate = {};
    if (phone !== void 0) psychUpdate.phone = phone || null;
    if (crpNumber !== void 0) psychUpdate.crpNumber = crpNumber || null;
    if (bio !== void 0) psychUpdate.bio = bio || null;
    if (Object.keys(psychUpdate).length > 0) {
      const [existing] = await db2.select().from(psychologists).where(eq6(psychologists.userId, user.id));
      if (existing) {
        await db2.update(psychologists).set(psychUpdate).where(eq6(psychologists.userId, user.id));
      }
    }
    const [updated] = await db2.select().from(users).where(eq6(users.id, user.id));
    const [updatedPsych] = await db2.select().from(psychologists).where(eq6(psychologists.userId, user.id));
    const { password, ...safeUser } = updated;
    return res.json({ ...safeUser, psychologist: updatedPsych || null, age: calcAge(updated.birthDate) });
  } catch (e) {
    console.error("PATCH /api/profile error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router4.put("/specializations", async (req, res) => {
  try {
    const user = req.user;
    const { specializationIds } = req.body;
    if (!Array.isArray(specializationIds)) {
      return res.status(400).json({ error: "specializationIds deve ser um array." });
    }
    const [psych] = await db2.select().from(psychologists).where(eq6(psychologists.userId, user.id));
    if (!psych) return res.status(404).json({ error: "Perfil de psic\xF3loga n\xE3o encontrado." });
    await db2.delete(psychologistSpecializations).where(eq6(psychologistSpecializations.psychologistId, psych.id));
    if (specializationIds.length > 0) {
      await db2.insert(psychologistSpecializations).values(
        specializationIds.map((id) => ({ psychologistId: psych.id, specializationAreaId: id }))
      );
    }
    const rows = await db2.select({ id: specializationAreas.id, name: specializationAreas.name, category: specializationAreas.category }).from(psychologistSpecializations).innerJoin(specializationAreas, eq6(psychologistSpecializations.specializationAreaId, specializationAreas.id)).where(eq6(psychologistSpecializations.psychologistId, psych.id));
    return res.json({ specializations: rows });
  } catch (e) {
    console.error("PUT /api/profile/specializations error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router4.post(
  "/avatar",
  (req, res, next) => {
    avatarUpload.single("avatar")(req, res, (err) => {
      if (err instanceof multer2.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "Arquivo muito grande. M\xE1ximo 5MB." });
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const user = req.user;
      if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado." });
      const [existingUser] = await db2.select().from(users).where(eq6(users.id, user.id));
      if (!existingUser) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
      if (existingUser.profileImage) {
        try {
          const oldPath = path2.join(process.cwd(), existingUser.profileImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch {
        }
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      await db2.update(users).set({ profileImage: imageUrl }).where(eq6(users.id, user.id));
      return res.json({ profileImage: imageUrl });
    } catch (e) {
      console.error("POST /api/profile/avatar error:", e);
      return res.status(500).json({ error: "Erro interno." });
    }
  }
);
var profile_default = router4;

// server/routes/specialization-areas.ts
import { Router as Router5 } from "express";
import { eq as eq7 } from "drizzle-orm";
var router5 = Router5();
function requireAuth3(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "N\xE3o autenticado." });
  next();
}
router5.use(requireAuth3);
router5.get("/", async (_req, res) => {
  try {
    const areas = await db2.select().from(specializationAreas).orderBy(specializationAreas.category, specializationAreas.name);
    const grouped = {};
    for (const area of areas) {
      const cat = area.category || "Outras";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ id: area.id, name: area.name, isCustom: area.isCustom });
    }
    return res.json(grouped);
  } catch (e) {
    console.error("GET /api/specialization-areas error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router5.post("/", async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Nome \xE9 obrigat\xF3rio." });
    const [existing] = await db2.select().from(specializationAreas).where(eq7(specializationAreas.name, name.trim()));
    if (existing) return res.json(existing);
    const [created] = await db2.insert(specializationAreas).values({ name: name.trim(), category: category || "Personalizada", isCustom: true }).returning();
    return res.status(201).json(created);
  } catch (e) {
    console.error("POST /api/specialization-areas error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
var specialization_areas_default = router5;

// server/routes/admin-psychologists.ts
import { Router as Router6 } from "express";
import { eq as eq8, and as and5, sql as sql2 } from "drizzle-orm";
var router6 = Router6();
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "N\xE3o autenticado." });
  const user = req.user;
  if (user.role !== "admin") return res.status(403).json({ error: "Acesso restrito ao administrador." });
  next();
}
router6.use(requireAdmin);
function calcAge2(birthDate) {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  const today = /* @__PURE__ */ new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || m === 0 && today.getDate() < birth.getDate()) age--;
  return age;
}
function monthsAgo(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const now = /* @__PURE__ */ new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
}
async function getSpecializationsForPsych(psychId) {
  return db2.select({ id: specializationAreas.id, name: specializationAreas.name, category: specializationAreas.category }).from(psychologistSpecializations).innerJoin(specializationAreas, eq8(psychologistSpecializations.specializationAreaId, specializationAreas.id)).where(eq8(psychologistSpecializations.psychologistId, psychId));
}
router6.get("/", async (req, res) => {
  try {
    const { search, status, specializationId } = req.query;
    let psychList = await db2.select({ psych: psychologists, user: users }).from(psychologists).innerJoin(users, eq8(psychologists.userId, users.id)).orderBy(users.fullName);
    if (search) {
      const lower = search.toLowerCase();
      psychList = psychList.filter(
        (r) => r.user.fullName.toLowerCase().includes(lower) || r.user.email.toLowerCase().includes(lower)
      );
    }
    if (status === "active") {
      psychList = psychList.filter((r) => r.user.status === "active");
    } else if (status === "inactive") {
      psychList = psychList.filter((r) => r.user.status !== "active");
    }
    const result = await Promise.all(
      psychList.map(async ({ psych, user }) => {
        const specs = await getSpecializationsForPsych(psych.id);
        if (specializationId && !specs.some((s) => s.id === parseInt(specializationId))) {
          return null;
        }
        const activePatientsCount = await db2.select({ count: sql2`count(*)` }).from(patients).where(and5(eq8(patients.psychologistId, psych.id), eq8(patients.status, "active")));
        const sessionsCount = await db2.select({ count: sql2`count(*)` }).from(clinicalSessions).where(eq8(clinicalSessions.psychologistId, psych.id));
        const { password, ...safeUser } = user;
        return {
          ...psych,
          user: safeUser,
          age: calcAge2(user.birthDate),
          specializations: specs,
          activePatientsCount: Number(activePatientsCount[0]?.count ?? 0),
          sessionsCount: Number(sessionsCount[0]?.count ?? 0),
          monthsAtClinic: monthsAgo(psych.startedAtClinic ?? void 0)
        };
      })
    );
    return res.json(result.filter(Boolean));
  } catch (e) {
    console.error("GET /api/admin/psychologists error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router6.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [psych] = await db2.select().from(psychologists).where(eq8(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psic\xF3loga n\xE3o encontrada." });
    const [user] = await db2.select().from(users).where(eq8(users.id, psych.userId));
    if (!user) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    const specs = await getSpecializationsForPsych(psych.id);
    const activePatientsCount = await db2.select({ count: sql2`count(*)` }).from(patients).where(and5(eq8(patients.psychologistId, psych.id), eq8(patients.status, "active")));
    const sessionsCount = await db2.select({ count: sql2`count(*)` }).from(clinicalSessions).where(eq8(clinicalSessions.psychologistId, psych.id));
    const { password, ...safeUser } = user;
    return res.json({
      ...psych,
      user: safeUser,
      age: calcAge2(user.birthDate),
      specializations: specs,
      activePatientsCount: Number(activePatientsCount[0]?.count ?? 0),
      sessionsCount: Number(sessionsCount[0]?.count ?? 0),
      monthsAtClinic: monthsAgo(psych.startedAtClinic ?? void 0)
    });
  } catch (e) {
    console.error("GET /api/admin/psychologists/:id error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router6.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [psych] = await db2.select().from(psychologists).where(eq8(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psic\xF3loga n\xE3o encontrada." });
    const { fullName, email, birthDate, status, phone, crpNumber, bio, startedAtClinic } = req.body;
    const userUpdate = {};
    if (fullName !== void 0) userUpdate.fullName = fullName;
    if (email !== void 0) userUpdate.email = email;
    if (birthDate !== void 0) userUpdate.birthDate = birthDate || null;
    if (status !== void 0) userUpdate.status = status;
    if (Object.keys(userUpdate).length > 0) {
      await db2.update(users).set(userUpdate).where(eq8(users.id, psych.userId));
    }
    const psychUpdate = {};
    if (phone !== void 0) psychUpdate.phone = phone || null;
    if (crpNumber !== void 0) psychUpdate.crpNumber = crpNumber || null;
    if (bio !== void 0) psychUpdate.bio = bio || null;
    if (startedAtClinic !== void 0) psychUpdate.startedAtClinic = startedAtClinic || null;
    if (Object.keys(psychUpdate).length > 0) {
      await db2.update(psychologists).set(psychUpdate).where(eq8(psychologists.id, id));
    }
    const [updatedUser] = await db2.select().from(users).where(eq8(users.id, psych.userId));
    const [updatedPsych] = await db2.select().from(psychologists).where(eq8(psychologists.id, id));
    const specs = await getSpecializationsForPsych(id);
    const { password, ...safeUser } = updatedUser;
    return res.json({
      ...updatedPsych,
      user: safeUser,
      age: calcAge2(updatedUser.birthDate),
      specializations: specs
    });
  } catch (e) {
    console.error("PATCH /api/admin/psychologists/:id error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router6.put("/:id/specializations", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { specializationIds } = req.body;
    if (!Array.isArray(specializationIds)) {
      return res.status(400).json({ error: "specializationIds deve ser um array." });
    }
    const [psych] = await db2.select().from(psychologists).where(eq8(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psic\xF3loga n\xE3o encontrada." });
    await db2.delete(psychologistSpecializations).where(eq8(psychologistSpecializations.psychologistId, id));
    if (specializationIds.length > 0) {
      await db2.insert(psychologistSpecializations).values(
        specializationIds.map((sid) => ({ psychologistId: id, specializationAreaId: sid }))
      );
    }
    const specs = await getSpecializationsForPsych(id);
    return res.json({ specializations: specs });
  } catch (e) {
    console.error("PUT /api/admin/psychologists/:id/specializations error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
router6.post("/:id/toggle-active", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [psych] = await db2.select().from(psychologists).where(eq8(psychologists.id, id));
    if (!psych) return res.status(404).json({ error: "Psic\xF3loga n\xE3o encontrada." });
    const [user] = await db2.select().from(users).where(eq8(users.id, psych.userId));
    if (!user) return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado." });
    const newStatus = user.status === "active" ? "inactive" : "active";
    await db2.update(users).set({ status: newStatus }).where(eq8(users.id, psych.userId));
    return res.json({ status: newStatus, isActive: newStatus === "active" });
  } catch (e) {
    console.error("POST /api/admin/psychologists/:id/toggle-active error:", e);
    return res.status(500).json({ error: "Erro interno." });
  }
});
var admin_psychologists_default = router6;

// server/routes/care-templates.ts
import { Router as Router7 } from "express";
import { eq as eq9, or as or2, isNull, and as and6, count } from "drizzle-orm";
import { z as z4 } from "zod";
var router7 = Router7();
var checkAuth2 = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "N\xE3o autenticado" });
  next();
};
router7.use(checkAuth2);
router7.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const templates = await db2.select().from(careTemplates).where(or2(eq9(careTemplates.psychologistId, userId), isNull(careTemplates.psychologistId)));
    const result = await Promise.all(
      templates.map(async (t) => {
        const questions = await db2.select().from(careTemplateQuestions).where(eq9(careTemplateQuestions.templateId, t.id)).orderBy(careTemplateQuestions.orderIndex);
        return { ...t, questions, questionCount: questions.length };
      })
    );
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao listar templates" });
  }
});
router7.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { questions = [], ...body } = req.body;
    const templateData = insertCareTemplateSchema.parse({
      ...body,
      psychologistId: userId,
      isDefault: false
    });
    const [template] = await db2.insert(careTemplates).values(templateData).returning();
    if (Array.isArray(questions) && questions.length > 0) {
      const qs = questions.map(
        (q, i) => insertCareTemplateQuestionSchema.parse({ ...q, templateId: template.id, orderIndex: q.orderIndex ?? i })
      );
      await db2.insert(careTemplateQuestions).values(qs);
    }
    const allQuestions = await db2.select().from(careTemplateQuestions).where(eq9(careTemplateQuestions.templateId, template.id)).orderBy(careTemplateQuestions.orderIndex);
    res.status(201).json({ ...template, questions: allQuestions });
  } catch (e) {
    if (e instanceof z4.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao criar template" });
  }
});
router7.get("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const [template] = await db2.select().from(careTemplates).where(
      and6(
        eq9(careTemplates.id, id),
        or2(eq9(careTemplates.psychologistId, userId), isNull(careTemplates.psychologistId))
      )
    );
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    const questions = await db2.select().from(careTemplateQuestions).where(eq9(careTemplateQuestions.templateId, id)).orderBy(careTemplateQuestions.orderIndex);
    res.json({ ...template, questions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao buscar template" });
  }
});
router7.patch("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const [template] = await db2.select().from(careTemplates).where(and6(eq9(careTemplates.id, id), eq9(careTemplates.psychologistId, userId)));
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    const editableSchema = z4.object({
      title: z4.string().min(1).max(100).optional(),
      description: z4.string().max(500).optional()
    });
    const updateData = editableSchema.parse(req.body);
    const [updated] = await db2.update(careTemplates).set({ ...updateData, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(careTemplates.id, id)).returning();
    res.json(updated);
  } catch (e) {
    if (e instanceof z4.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao atualizar template" });
  }
});
router7.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    const [template] = await db2.select().from(careTemplates).where(and6(eq9(careTemplates.id, id), eq9(careTemplates.psychologistId, userId)));
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    const [{ value: dispatchCount }] = await db2.select({ value: count() }).from(careDispatches).where(eq9(careDispatches.templateId, id));
    if (Number(dispatchCount) > 0) {
      return res.status(409).json({
        message: "N\xE3o \xE9 poss\xEDvel excluir este template pois ele possui envios vinculados."
      });
    }
    await db2.delete(careTemplates).where(eq9(careTemplates.id, id));
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao excluir template" });
  }
});
router7.put("/:id/questions", async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = parseInt(req.params.id);
    const [template] = await db2.select().from(careTemplates).where(and6(eq9(careTemplates.id, templateId), eq9(careTemplates.psychologistId, userId)));
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    const questionsSchema = z4.array(
      insertCareTemplateQuestionSchema.omit({ templateId: true }).extend({ orderIndex: z4.number().int() })
    );
    const questions = questionsSchema.parse(req.body);
    await db2.delete(careTemplateQuestions).where(eq9(careTemplateQuestions.templateId, templateId));
    if (questions.length > 0) {
      await db2.insert(careTemplateQuestions).values(
        questions.map((q, i) => ({
          ...q,
          templateId,
          orderIndex: q.orderIndex ?? i
        }))
      );
    }
    const saved = await db2.select().from(careTemplateQuestions).where(eq9(careTemplateQuestions.templateId, templateId)).orderBy(careTemplateQuestions.orderIndex);
    res.json(saved);
  } catch (e) {
    if (e instanceof z4.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao salvar perguntas do template" });
  }
});
router7.post("/:id/questions", async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = parseInt(req.params.id);
    const [template] = await db2.select().from(careTemplates).where(and6(eq9(careTemplates.id, templateId), eq9(careTemplates.psychologistId, userId)));
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    const data = insertCareTemplateQuestionSchema.parse({ ...req.body, templateId });
    const [q] = await db2.insert(careTemplateQuestions).values(data).returning();
    res.status(201).json(q);
  } catch (e) {
    if (e instanceof z4.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao adicionar pergunta" });
  }
});
router7.patch("/:id/questions/:qId", async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = parseInt(req.params.id);
    const qId = parseInt(req.params.qId);
    const [template] = await db2.select().from(careTemplates).where(and6(eq9(careTemplates.id, templateId), eq9(careTemplates.psychologistId, userId)));
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    const editableQuestionSchema = insertCareTemplateQuestionSchema.omit({ templateId: true }).partial();
    const data = editableQuestionSchema.parse(req.body);
    const [updated] = await db2.update(careTemplateQuestions).set(data).where(and6(eq9(careTemplateQuestions.id, qId), eq9(careTemplateQuestions.templateId, templateId))).returning();
    if (!updated) return res.status(404).json({ message: "Pergunta n\xE3o encontrada" });
    res.json(updated);
  } catch (e) {
    if (e instanceof z4.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error(e);
    res.status(500).json({ message: "Erro ao atualizar pergunta" });
  }
});
router7.delete("/:id/questions/:qId", async (req, res) => {
  try {
    const userId = req.user.id;
    const templateId = parseInt(req.params.id);
    const qId = parseInt(req.params.qId);
    const [template] = await db2.select().from(careTemplates).where(and6(eq9(careTemplates.id, templateId), eq9(careTemplates.psychologistId, userId)));
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    await db2.delete(careTemplateQuestions).where(and6(eq9(careTemplateQuestions.id, qId), eq9(careTemplateQuestions.templateId, templateId)));
    res.sendStatus(204);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao remover pergunta" });
  }
});
var care_templates_default = router7;

// server/routes/care-dispatch.ts
import { Router as Router8 } from "express";
import { eq as eq10, desc as desc3, count as count2, and as and7, or as or3, isNull as isNull2 } from "drizzle-orm";

// server/lib/validate-email.ts
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim()) && email.trim().length <= 254;
}

// server/lib/care-token.ts
import crypto2 from "crypto";
function generateResponseToken() {
  return crypto2.randomBytes(32).toString("hex");
}

// server/lib/send-care-email.ts
async function sendCareFormEmail(params) {
  try {
    const gmail = await getGmailClient(params.psychologistUserId);
    if (!gmail) {
      console.warn("sendCareFormEmail: no Gmail client \u2014 user not connected to Google");
      return false;
    }
    const clinicName = process.env.CLINIC_NAME || "ConsultaPsi";
    const firstName = params.patientName.split(" ")[0];
    const expiryStr = params.tokenExpiresAt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "America/Sao_Paulo"
    });
    const typeLabel = {
      text: "texto curto",
      textarea: "texto livre",
      scale: "escala 1-10",
      multiple_choice: "m\xFAltipla escolha"
    };
    const questionsHtml = params.questions.map(
      (q, i) => `
      <div style="margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid #f3f4f6;">
        <p style="font-weight: 600; color: #1f2937; margin: 0 0 4px; font-size: 14px;">
          ${i + 1}. ${q.questionText}
        </p>
        <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em;">
          ${typeLabel[q.questionType] ?? q.questionType}
        </span>
      </div>`
    ).join("");
    const bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #0D9488, #14B8A6); padding: 32px 40px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">${clinicName}</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">
      Acompanhamento com ${params.psychologistName}
    </p>
  </div>

  <!-- Body -->
  <div style="padding: 36px 40px; background: #f9fafb; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">

    <p style="font-size: 16px; color: #374151; margin: 0 0 8px;">
      Ol\xE1, <strong>${firstName}</strong>! \u{1F44B}
    </p>

    ${params.customMessage ? `<p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 24px;">${params.customMessage}</p>` : `<p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 24px;">
        ${params.psychologistName} preparou um breve formul\xE1rio para acompanhar como voc\xEA est\xE1.
        Leva apenas alguns minutinhos! \u{1F49A}
      </p>`}

    <!-- Questions preview -->
    <div style="background: white; border-radius: 10px; padding: 20px 24px; margin-bottom: 28px; border: 1px solid #e5e7eb;">
      <p style="font-size: 11px; color: #9ca3af; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 0.05em;">
        Perguntas do formul\xE1rio
      </p>
      ${questionsHtml}
    </div>

    <!-- CTA button -->
    <div style="text-align: center; margin: 28px 0;">
      <a href="${params.responseUrl}"
         style="display: inline-block; background: #0D9488; color: white;
                padding: 16px 40px; border-radius: 10px; text-decoration: none;
                font-weight: 700; font-size: 16px; letter-spacing: 0.02em;">
        \u{1F4AC} Responder Formul\xE1rio
      </a>
    </div>

    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 16px 0 0;">
      Este link expira em ${expiryStr}. Responda com tranquilidade no seu tempo. \u{1F33F}
    </p>
  </div>

  <!-- Footer -->
  <div style="padding: 20px 40px; text-align: center;">
    <p style="font-size: 12px; color: #d1d5db; margin: 0;">
      ${clinicName} \xB7 Enviado por ${params.psychologistName}
    </p>
  </div>

</body>
</html>`;
    const subjectEncoded = Buffer.from(params.subject).toString("base64");
    const rawMessage = [
      `To: ${params.patientEmail}`,
      `From: ${params.psychologistName} <${params.psychologistEmail}>`,
      `Subject: =?utf-8?B?${subjectEncoded}?=`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      bodyHtml
    ].join("\r\n");
    const encodedMessage = Buffer.from(rawMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage }
    });
    return true;
  } catch (error) {
    if (isGoogleTokenExpired(error)) throw error;
    console.error("sendCareFormEmail error:", error);
    return false;
  }
}

// server/routes/care-dispatch.ts
import { z as z5 } from "zod";
var router8 = Router8();
var checkAuth3 = (req, res, next) => {
  if (!req.isAuthenticated()) return res.status(401).json({ message: "N\xE3o autenticado" });
  next();
};
router8.use(checkAuth3);
function substituteVariables(text3, patientName, psychologistName) {
  const firstName = patientName.split(" ")[0];
  return text3.replace(/\{patient_name\}/g, firstName).replace(/\{patient_full_name\}/g, patientName).replace(/\{psychologist_name\}/g, psychologistName);
}
async function canAccessPatient(user, patientRow) {
  if (user.role === "admin") return true;
  if (user.role === "psychologist") {
    const [psychRow] = await db2.select().from(psychologists).where(eq10(psychologists.userId, user.id));
    const psychId = psychRow?.id ?? -1;
    return patientRow.psychologistId === psychId || patientRow.createdBy === user.id;
  }
  return false;
}
function canAccessDispatch(user, dispatch) {
  if (user.role === "admin") return true;
  return dispatch.psychologistId === user.id;
}
router8.post("/patients/:patientId/dispatch", async (req, res) => {
  try {
    const user = req.user;
    const patientId = parseInt(req.params.patientId);
    const { template_id, subject, custom_message, override_questions } = req.body;
    if (!template_id) return res.status(400).json({ message: "template_id \xE9 obrigat\xF3rio" });
    const [patient] = await db2.select().from(patients).where(eq10(patients.id, patientId));
    if (!patient) return res.status(404).json({ message: "Paciente n\xE3o encontrado" });
    const authorized = await canAccessPatient(user, patient);
    if (!authorized) {
      return res.status(403).json({
        message: "Acesso negado. Voc\xEA n\xE3o possui permiss\xE3o para acessar este paciente.",
        code: "FORBIDDEN"
      });
    }
    if (!patient.email || !isValidEmail(patient.email)) {
      return res.status(422).json({
        error: "email_invalid",
        message: "O paciente n\xE3o possui e-mail v\xE1lido cadastrado. Atualize o perfil antes de enviar."
      });
    }
    const [psychUser] = await db2.select().from(users).where(eq10(users.id, user.id));
    if (!psychUser) return res.status(400).json({ message: "Usu\xE1rio n\xE3o encontrado" });
    const [template] = await db2.select().from(careTemplates).where(
      and7(
        eq10(careTemplates.id, parseInt(template_id)),
        or3(eq10(careTemplates.psychologistId, user.id), isNull2(careTemplates.psychologistId))
      )
    );
    if (!template) return res.status(404).json({ message: "Template n\xE3o encontrado" });
    const templateQuestions = await db2.select().from(careTemplateQuestions).where(eq10(careTemplateQuestions.templateId, template.id)).orderBy(careTemplateQuestions.orderIndex);
    const psychName = psychUser.fullName || psychUser.username;
    const overrideSchema = z5.array(
      z5.object({
        questionText: z5.string().min(1),
        questionType: z5.string(),
        options: z5.array(z5.string()).nullable().optional(),
        isRequired: z5.boolean(),
        orderIndex: z5.number().int()
      })
    );
    let renderedQuestions;
    if (Array.isArray(override_questions) && override_questions.length > 0) {
      const parsed = overrideSchema.parse(override_questions);
      renderedQuestions = parsed.map((q) => ({
        ...q,
        questionText: substituteVariables(q.questionText, patient.fullName, psychName),
        options: q.options ?? null
      }));
    } else {
      renderedQuestions = templateQuestions.map((q) => ({
        ...q,
        questionText: substituteVariables(q.questionText, patient.fullName, psychName)
      }));
    }
    const responseToken = generateResponseToken();
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
    const firstName = patient.fullName.split(" ")[0];
    const finalSubject = subject?.trim() || `Check-in \u2014 ${firstName}`;
    const [dispatch] = await db2.insert(careDispatches).values({
      psychologistId: user.id,
      patientId,
      templateId: template.id,
      subject: finalSubject,
      customMessage: custom_message ?? null,
      responseToken,
      tokenExpiresAt,
      sentToEmail: patient.email,
      status: "sent"
    }).returning();
    if (renderedQuestions.length > 0) {
      await db2.insert(careDispatchQuestions).values(
        renderedQuestions.map((q, i) => ({
          dispatchId: dispatch.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options ?? null,
          isRequired: q.isRequired,
          orderIndex: i
        }))
      );
    }
    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;
    const responseUrl = `${appUrl}/responder/${responseToken}`;
    const emailSent = await sendCareFormEmail({
      psychologistUserId: user.id,
      patientName: patient.fullName,
      patientEmail: patient.email,
      psychologistName: psychName,
      psychologistEmail: psychUser.email,
      subject: finalSubject,
      customMessage: custom_message ?? null,
      questions: renderedQuestions,
      responseUrl,
      tokenExpiresAt
    });
    if (!emailSent) {
      return res.json({
        success: true,
        dispatch,
        warning: "O formul\xE1rio foi salvo mas o e-mail n\xE3o p\xF4de ser enviado (Google n\xE3o conectado). Compartilhe o link manualmente.",
        responseUrl
      });
    }
    return res.status(201).json({ success: true, dispatch, responseUrl });
  } catch (e) {
    console.error("dispatch error:", e);
    if (e?.code === 401) {
      return res.status(401).json({ message: "Sess\xE3o Google expirada. Reconecte sua conta Google." });
    }
    res.status(500).json({ message: "Erro ao enviar formul\xE1rio" });
  }
});
router8.get("/patients/:patientId/dispatches", async (req, res) => {
  try {
    const user = req.user;
    const patientId = parseInt(req.params.patientId);
    const [patient] = await db2.select().from(patients).where(eq10(patients.id, patientId));
    if (!patient) return res.status(404).json({ message: "Paciente n\xE3o encontrado" });
    const authorized = await canAccessPatient(user, patient);
    if (!authorized) {
      return res.status(403).json({
        message: "Acesso negado.",
        code: "FORBIDDEN"
      });
    }
    const dispatches = await db2.select().from(careDispatches).where(eq10(careDispatches.patientId, patientId)).orderBy(desc3(careDispatches.sentAt));
    const now = /* @__PURE__ */ new Date();
    const result = await Promise.all(
      dispatches.map(async (d) => {
        if (d.status !== "answered" && d.tokenExpiresAt < now) {
          await db2.update(careDispatches).set({ status: "expired" }).where(eq10(careDispatches.id, d.id));
          d = { ...d, status: "expired" };
        }
        const [{ value: responseCount }] = await db2.select({ value: count2() }).from(careResponses).where(eq10(careResponses.dispatchId, d.id));
        return { ...d, responseCount: Number(responseCount) };
      })
    );
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao listar hist\xF3rico de envios" });
  }
});
router8.get("/dispatches/:dispatchId/responses", async (req, res) => {
  try {
    const user = req.user;
    const dispatchId = parseInt(req.params.dispatchId);
    const [dispatch] = await db2.select().from(careDispatches).where(eq10(careDispatches.id, dispatchId));
    if (!dispatch) return res.status(404).json({ message: "Envio n\xE3o encontrado" });
    if (!canAccessDispatch(user, dispatch)) {
      return res.status(403).json({
        message: "Acesso negado.",
        code: "FORBIDDEN"
      });
    }
    const questions = await db2.select().from(careDispatchQuestions).where(eq10(careDispatchQuestions.dispatchId, dispatchId)).orderBy(careDispatchQuestions.orderIndex);
    const responses = await db2.select().from(careResponses).where(eq10(careResponses.dispatchId, dispatchId));
    const merged = questions.map((q) => ({
      ...q,
      response: responses.find((r) => r.dispatchQuestionId === q.id) ?? null
    }));
    res.json({ dispatch, questions: merged });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro ao buscar respostas" });
  }
});
var care_dispatch_default = router8;

// server/routes/care-public.ts
import { Router as Router9 } from "express";
import { eq as eq11 } from "drizzle-orm";
import { z as z6 } from "zod";
var router9 = Router9();
router9.get("/respond/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [dispatch] = await db2.select().from(careDispatches).where(eq11(careDispatches.responseToken, token));
    if (!dispatch) {
      return res.status(404).json({ error: "not_found", message: "Formul\xE1rio n\xE3o encontrado." });
    }
    if (/* @__PURE__ */ new Date() > dispatch.tokenExpiresAt) {
      if (dispatch.status !== "expired" && dispatch.status !== "answered") {
        await db2.update(careDispatches).set({ status: "expired" }).where(eq11(careDispatches.id, dispatch.id));
      }
      return res.status(410).json({
        error: "expired",
        message: "Este link expirou. Entre em contato com sua psic\xF3loga para receber um novo formul\xE1rio."
      });
    }
    if (dispatch.status === "answered") {
      return res.status(409).json({
        error: "already_answered",
        message: "Voc\xEA j\xE1 respondeu este formul\xE1rio. Obrigada pela sua participa\xE7\xE3o! \u{1F49A}"
      });
    }
    if (dispatch.status === "sent") {
      await db2.update(careDispatches).set({ status: "opened", openedAt: /* @__PURE__ */ new Date() }).where(eq11(careDispatches.id, dispatch.id));
    }
    const questions = await db2.select().from(careDispatchQuestions).where(eq11(careDispatchQuestions.dispatchId, dispatch.id)).orderBy(careDispatchQuestions.orderIndex);
    const [patient] = await db2.select({ firstName: patients.fullName }).from(patients).where(eq11(patients.id, dispatch.patientId));
    const [psychUser] = await db2.select({ fullName: users.fullName, username: users.username }).from(users).where(eq11(users.id, dispatch.psychologistId));
    const clinicName = process.env.CLINIC_NAME || "ConsultaPsi";
    const patientFirstName = patient?.firstName?.split(" ")[0] ?? "Paciente";
    const psychologistName = psychUser?.fullName || psychUser?.username || "sua psic\xF3loga";
    return res.json({
      clinicName,
      patientFirstName,
      psychologistName,
      subject: dispatch.subject,
      customMessage: dispatch.customMessage,
      questions
    });
  } catch (e) {
    console.error("care respond GET error:", e);
    res.status(500).json({ message: "Erro ao buscar formul\xE1rio" });
  }
});
var answerSchema = z6.object({
  answers: z6.array(
    z6.object({
      dispatch_question_id: z6.number().int().positive(),
      answer_text: z6.string().optional().nullable(),
      answer_choice: z6.string().optional().nullable(),
      answer_scale: z6.number().int().min(1).max(10).optional().nullable()
    })
  )
});
router9.post("/respond/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [dispatch] = await db2.select().from(careDispatches).where(eq11(careDispatches.responseToken, token));
    if (!dispatch) {
      return res.status(404).json({ error: "not_found", message: "Formul\xE1rio n\xE3o encontrado." });
    }
    if (/* @__PURE__ */ new Date() > dispatch.tokenExpiresAt) {
      if (dispatch.status !== "expired") {
        await db2.update(careDispatches).set({ status: "expired" }).where(eq11(careDispatches.id, dispatch.id));
      }
      return res.status(410).json({
        error: "expired",
        message: "Este link expirou."
      });
    }
    if (dispatch.status === "answered") {
      return res.status(409).json({
        error: "already_answered",
        message: "Voc\xEA j\xE1 respondeu este formul\xE1rio."
      });
    }
    const parsed = answerSchema.parse(req.body);
    const { answers } = parsed;
    const questions = await db2.select().from(careDispatchQuestions).where(eq11(careDispatchQuestions.dispatchId, dispatch.id));
    const validQuestionIds = new Set(questions.map((q) => q.id));
    for (const a of answers) {
      if (!validQuestionIds.has(a.dispatch_question_id)) {
        return res.status(422).json({
          error: "invalid_question",
          message: `ID de pergunta inv\xE1lido: ${a.dispatch_question_id}`
        });
      }
    }
    for (const q of questions.filter((q2) => q2.isRequired)) {
      const answer = answers.find((a) => a.dispatch_question_id === q.id);
      const hasValue = answer?.answer_text && answer.answer_text.trim() || answer?.answer_choice && answer.answer_choice.trim() || answer?.answer_scale != null;
      if (!hasValue) {
        return res.status(422).json({
          error: "missing_required",
          message: `A pergunta "${q.questionText}" \xE9 obrigat\xF3ria.`
        });
      }
    }
    if (answers.length > 0) {
      await db2.insert(careResponses).values(
        answers.map((a) => ({
          dispatchId: dispatch.id,
          dispatchQuestionId: a.dispatch_question_id,
          answerText: a.answer_text ?? null,
          answerChoice: a.answer_choice ?? null,
          answerScale: a.answer_scale ?? null
        }))
      );
    }
    await db2.update(careDispatches).set({ status: "answered", answeredAt: /* @__PURE__ */ new Date() }).where(eq11(careDispatches.id, dispatch.id));
    return res.json({ success: true, message: "Respostas enviadas com sucesso!" });
  } catch (e) {
    if (e instanceof z6.ZodError) return res.status(400).json({ message: e.errors[0].message });
    console.error("care respond POST error:", e);
    res.status(500).json({ message: "Erro ao salvar respostas" });
  }
});
var care_public_default = router9;

// server/routes/commissions.ts
import { Router as Router10 } from "express";
import { eq as eq12, and as and8, gte as gte3, lte as lte3 } from "drizzle-orm";
import { z as z7 } from "zod";
var router10 = Router10();
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso negado. Somente administradores." });
  }
  next();
}
router10.use(adminOnly);
function hoursFromTime(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}
async function calcCommissionPreview(psychologistId, periodStart, periodEnd) {
  const bookings = await db2.select({
    id: roomBookings.id,
    date: roomBookings.date,
    startTime: roomBookings.startTime,
    endTime: roomBookings.endTime,
    roomId: roomBookings.roomId,
    roomName: rooms.name,
    roomHourlyRate: rooms.hourlyRate
  }).from(roomBookings).leftJoin(rooms, eq12(roomBookings.roomId, rooms.id)).where(
    and8(
      eq12(roomBookings.psychologistId, psychologistId),
      gte3(roomBookings.date, periodStart),
      lte3(roomBookings.date, periodEnd)
    )
  );
  const allConfigs = await storage.listCommissionPayoutConfigs(psychologistId);
  function configForDate(bookingDate) {
    return allConfigs.find((c) => {
      const after = c.validFrom <= bookingDate;
      const before = !c.validUntil || c.validUntil >= bookingDate;
      return after && before;
    }) ?? null;
  }
  const items = bookings.map((b) => {
    const hours = hoursFromTime(b.startTime, b.endTime);
    const hourlyRate = b.roomHourlyRate ? parseFloat(b.roomHourlyRate) : 0;
    const bookingValue = hours * hourlyRate;
    const config = configForDate(b.date);
    let repasseValue = 0;
    if (config) {
      const val = parseFloat(config.payoutValue);
      repasseValue = config.payoutType === "percentual" ? bookingValue * val / 100 : val;
    }
    return {
      bookingId: b.id,
      bookingDate: b.date,
      roomName: b.roomName,
      startTime: b.startTime,
      endTime: b.endTime,
      bookingValue,
      repasseValue
    };
  });
  const totalRoomsValue = items.reduce((acc, i) => acc + i.bookingValue, 0);
  const totalRepasse = items.reduce((acc, i) => acc + i.repasseValue, 0);
  return { items, totalRoomsValue, totalRepasse, totalBookings: items.length };
}
router10.get("/dashboard", async (req, res) => {
  try {
    const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
    const data = await storage.getCommissionDashboard(month);
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Erro ao buscar dashboard" });
  }
});
router10.get("/", async (req, res) => {
  try {
    const { psychologistId, status, periodStart, periodEnd } = req.query;
    const list = await storage.listCommissions({
      psychologistId: psychologistId ? parseInt(psychologistId) : void 0,
      status,
      periodStart,
      periodEnd
    });
    const enriched = await Promise.all(
      list.map(async (c) => {
        const psych = await storage.getPsychologist(c.psychologistId);
        const user = psych ? await storage.getUser(psych.userId) : null;
        return { ...c, psychologistName: user?.fullName ?? null };
      })
    );
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ message: "Erro ao listar comissionamentos" });
  }
});
router10.get("/preview", async (req, res) => {
  try {
    const { psychologistId, periodStart, periodEnd } = req.query;
    if (!psychologistId || !periodStart || !periodEnd) {
      return res.status(400).json({ message: "Par\xE2metros obrigat\xF3rios: psychologistId, periodStart, periodEnd" });
    }
    const preview = await calcCommissionPreview(
      parseInt(psychologistId),
      periodStart,
      periodEnd
    );
    res.json(preview);
  } catch (e) {
    res.status(500).json({ message: "Erro ao calcular preview" });
  }
});
router10.get("/:id", async (req, res) => {
  try {
    const c = await storage.getCommission(parseInt(req.params.id));
    if (!c) return res.status(404).json({ message: "Comissionamento n\xE3o encontrado" });
    const psych = await storage.getPsychologist(c.psychologistId);
    const user = psych ? await storage.getUser(psych.userId) : null;
    res.json({ ...c, psychologistName: user?.fullName ?? null });
  } catch (e) {
    res.status(500).json({ message: "Erro ao buscar comissionamento" });
  }
});
router10.get("/:id/items", async (req, res) => {
  try {
    const items = await storage.listCommissionItems(parseInt(req.params.id));
    res.json(items);
  } catch (e) {
    res.status(500).json({ message: "Erro ao buscar itens" });
  }
});
router10.post("/generate", async (req, res) => {
  try {
    const schema = z7.object({
      psychologistId: z7.number(),
      periodStart: z7.string(),
      periodEnd: z7.string()
    });
    const { psychologistId, periodStart, periodEnd } = schema.parse(req.body);
    const existing = await storage.listCommissions({ psychologistId, exactPeriod: { periodStart, periodEnd } });
    if (existing.length > 0) {
      return res.status(409).json({ message: "J\xE1 existe um comissionamento para este per\xEDodo e psic\xF3loga." });
    }
    const { items, totalRoomsValue, totalRepasse, totalBookings } = await calcCommissionPreview(
      psychologistId,
      periodStart,
      periodEnd
    );
    const adminId = req.user.id;
    const commission = await storage.createCommission({
      psychologistId,
      periodStart,
      periodEnd,
      totalBookings,
      totalRoomsValue: totalRoomsValue.toFixed(2),
      totalRepasse: totalRepasse.toFixed(2),
      status: "pending",
      paymentDate: null,
      paymentMethod: null,
      paymentNotes: null,
      createdByAdminId: adminId
    });
    await storage.createCommissionItems(
      items.map((i) => ({
        commissionId: commission.id,
        bookingId: i.bookingId,
        bookingDate: i.bookingDate,
        roomName: i.roomName,
        startTime: i.startTime,
        endTime: i.endTime,
        bookingValue: i.bookingValue.toFixed(2),
        repasseValue: i.repasseValue.toFixed(2)
      }))
    );
    res.status(201).json(commission);
  } catch (e) {
    if (e instanceof z7.ZodError) return res.status(400).json({ message: e.errors[0].message });
    res.status(500).json({ message: "Erro ao gerar comissionamento" });
  }
});
router10.patch("/:id/pay", async (req, res) => {
  try {
    const schema = z7.object({
      paymentDate: z7.string(),
      paymentMethod: z7.string().min(1, "Informe o m\xE9todo de pagamento"),
      paymentNotes: z7.string().optional()
    });
    const data = schema.parse(req.body);
    const c = await storage.getCommission(parseInt(req.params.id));
    if (!c) return res.status(404).json({ message: "Comissionamento n\xE3o encontrado" });
    if (c.status === "cancelled") return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel pagar um comissionamento cancelado." });
    const updated = await storage.updateCommission(c.id, { ...data, status: "paid" });
    res.json(updated);
  } catch (e) {
    if (e instanceof z7.ZodError) return res.status(400).json({ message: e.errors[0].message });
    res.status(500).json({ message: "Erro ao registrar pagamento" });
  }
});
router10.patch("/:id/cancel", async (req, res) => {
  try {
    const c = await storage.getCommission(parseInt(req.params.id));
    if (!c) return res.status(404).json({ message: "Comissionamento n\xE3o encontrado" });
    if (c.status === "paid") return res.status(400).json({ message: "N\xE3o \xE9 poss\xEDvel cancelar um comissionamento j\xE1 pago." });
    const updated = await storage.updateCommission(c.id, { status: "cancelled" });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ message: "Erro ao cancelar comissionamento" });
  }
});
var commissions_default = router10;
var commissionConfigsRouter = Router10();
commissionConfigsRouter.use(adminOnly);
commissionConfigsRouter.get("/", async (req, res) => {
  try {
    const { psychologistId } = req.query;
    const configs = await storage.listCommissionPayoutConfigs(
      psychologistId ? parseInt(psychologistId) : void 0
    );
    const enriched = await Promise.all(
      configs.map(async (c) => {
        const psych = await storage.getPsychologist(c.psychologistId);
        const user = psych ? await storage.getUser(psych.userId) : null;
        return { ...c, psychologistName: user?.fullName ?? null };
      })
    );
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ message: "Erro ao listar configura\xE7\xF5es" });
  }
});
commissionConfigsRouter.post("/", async (req, res) => {
  try {
    const schema = z7.object({
      psychologistId: z7.number(),
      payoutType: z7.enum(["percentual", "fixed"]),
      payoutValue: z7.union([z7.string().transform(parseFloat), z7.number()]),
      validFrom: z7.string(),
      validUntil: z7.string().nullable().optional()
    });
    const data = schema.parse(req.body);
    const config = await storage.createCommissionPayoutConfig({
      ...data,
      validUntil: data.validUntil ?? null
    });
    res.status(201).json(config);
  } catch (e) {
    if (e instanceof z7.ZodError) return res.status(400).json({ message: e.errors[0].message });
    res.status(500).json({ message: "Erro ao criar configura\xE7\xE3o" });
  }
});
commissionConfigsRouter.put("/:id", async (req, res) => {
  try {
    const schema = z7.object({
      payoutType: z7.enum(["percentual", "fixed"]).optional(),
      payoutValue: z7.union([z7.string().transform(parseFloat), z7.number()]).optional(),
      validFrom: z7.string().optional(),
      validUntil: z7.string().nullable().optional()
    });
    const parsed = schema.parse(req.body);
    const updateData = {
      ...parsed.payoutType !== void 0 && { payoutType: parsed.payoutType },
      ...parsed.payoutValue !== void 0 && { payoutValue: parsed.payoutValue },
      ...parsed.validFrom !== void 0 && { validFrom: parsed.validFrom },
      ...parsed.validUntil !== void 0 && { validUntil: parsed.validUntil }
    };
    const updated = await storage.updateCommissionPayoutConfig(parseInt(req.params.id), updateData);
    if (!updated) return res.status(404).json({ message: "Configura\xE7\xE3o n\xE3o encontrada" });
    res.json(updated);
  } catch (e) {
    if (e instanceof z7.ZodError) return res.status(400).json({ message: e.errors[0].message });
    res.status(500).json({ message: "Erro ao atualizar configura\xE7\xE3o" });
  }
});

// server/routes.ts
var upload2 = multer3({
  storage: multer3.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 2
    // 2MB max file size
  },
  fileFilter: function(req, file, cb) {
    const allowedExtensions = /jpeg|jpg|png|gif|webp/;
    const allowedMimetypes = /image\/(jpeg|jpg|png|gif|webp)/;
    const extname = allowedExtensions.test(path3.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype.toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Apenas imagens nos formatos JPEG, JPG, PNG, GIF e WEBP s\xE3o permitidas."));
  }
});
async function registerRoutes(app) {
  setupAuth(app);
  const handleZodError = (error) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return { message: validationError.message };
    }
    return { message: "An unexpected error occurred" };
  };
  app.get("/api/psychologists", async (req, res) => {
    try {
      const psychologists2 = await storage.getAllPsychologists();
      const result = await Promise.all(
        psychologists2.map(async (psych) => {
          const user = await storage.getUser(psych.userId);
          return {
            ...psych,
            user: user ? {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              email: user.email,
              role: user.role,
              status: user.status,
              profileImage: user.profileImage
            } : null
          };
        })
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error fetching psychologists" });
    }
  });
  app.get("/api/psychologists/:id", async (req, res) => {
    try {
      const psychologist = await storage.getPsychologist(parseInt(req.params.id));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      const user = await storage.getUser(psychologist.userId);
      res.json({
        ...psychologist,
        user: user ? {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          status: user.status,
          profileImage: user.profileImage
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching psychologist" });
    }
  });
  app.post("/api/psychologists", async (req, res) => {
    try {
      const data = insertPsychologistSchema.parse(req.body);
      const psychologist = await storage.createPsychologist(data);
      res.status(201).json(psychologist);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating psychologist" });
    }
  });
  app.post("/api/psychologists/:id/photo", (req, res, next) => {
    upload2.single("profileImageFile")(req, res, (err) => {
      if (err instanceof multer3.MulterError) {
        console.error("Multer error:", err);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "O arquivo \xE9 muito grande. O tamanho m\xE1ximo permitido \xE9 2MB."
          });
        }
        return res.status(400).json({
          message: `Erro no upload: ${err.message}`
        });
      } else if (err) {
        console.error("Upload error:", err);
        return res.status(400).json({
          message: err.message
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      console.log("Upload request received for psychologist:", req.params.id);
      const psychologistId = parseInt(req.params.id);
      if (isNaN(psychologistId)) {
        return res.status(400).json({ message: "ID da psic\xF3loga inv\xE1lido" });
      }
      const psychologist = await storage.getPsychologist(psychologistId);
      if (!psychologist) {
        console.error("Psychologist not found:", psychologistId);
        return res.status(404).json({ message: "Psic\xF3loga n\xE3o encontrada" });
      }
      if (!req.file) {
        console.error("No file uploaded");
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      const user = await storage.getUser(psychologist.userId);
      if (!user) {
        console.error("User not found:", psychologist.userId);
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      const imageUrl = `/api/users/${psychologist.userId}/photo`;
      await storage.updateUser(psychologist.userId, {
        profileImage: imageUrl,
        profileImageData: req.file.buffer,
        profileImageMimeType: req.file.mimetype
      });
      console.log("Profile image updated successfully:", imageUrl);
      res.json({ profileImage: imageUrl });
    } catch (error) {
      console.error("Error uploading psychologist photo:", error);
      res.status(500).json({
        message: "Erro ao fazer upload da foto",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  app.get("/api/users/:id/photo", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usu\xE1rio inv\xE1lido" });
      }
      const photo = await storage.getUserProfilePhoto(userId);
      if (!photo) {
        return res.status(404).json({ message: "Foto n\xE3o encontrada" });
      }
      res.setHeader("Content-Type", photo.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(photo.data);
    } catch (error) {
      console.error("Error serving user photo:", error);
      res.status(500).json({ message: "Erro ao exibir foto" });
    }
  });
  app.put("/api/psychologists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { profileImage, ...psychologistData } = req.body;
      const updatedPsychologist = await storage.updatePsychologist(id, psychologistData);
      if (!updatedPsychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      if (profileImage) {
        await storage.updateUser(updatedPsychologist.userId, { profileImage });
      }
      res.json(updatedPsychologist);
    } catch (error) {
      res.status(500).json({ message: "Error updating psychologist" });
    }
  });
  app.delete("/api/psychologists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deletePsychologist(id);
      if (!result) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting psychologist" });
    }
  });
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms2 = await storage.getAllRooms();
      res.json(rooms2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching rooms" });
    }
  });
  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const room = await storage.getRoom(parseInt(req.params.id));
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Error fetching room" });
    }
  });
  app.post("/api/rooms", async (req, res) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(data);
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating room" });
    }
  });
  app.put("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedRoom = await storage.updateRoom(id, req.body);
      if (!updatedRoom) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(updatedRoom);
    } catch (error) {
      res.status(500).json({ message: "Error updating room" });
    }
  });
  app.delete("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteRoom(id);
      if (!result) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting room" });
    }
  });
  app.get("/api/rooms/availability/:id", async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const date3 = new Date(req.query.date);
      const startTime = req.query.startTime;
      const endTime = req.query.endTime;
      const isAvailable = await storage.checkRoomAvailability(roomId, date3, startTime, endTime);
      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ message: "Error checking room availability" });
    }
  });
  app.get("/api/appointments", async (req, res) => {
    try {
      let appointments3;
      const user = req.user;
      let psychologistFilter = null;
      if (user?.role === "psychologist") {
        const psychProfile = await storage.getPsychologistByUserId(user.id);
        if (!psychProfile) {
          return res.json([]);
        }
        psychologistFilter = psychProfile.id;
      } else if (req.query.psychologistId) {
        psychologistFilter = parseInt(req.query.psychologistId);
      }
      if (psychologistFilter && req.query.startDate && req.query.endDate) {
        appointments3 = await storage.getAppointmentsByPsychologistIdAndDateRange(
          psychologistFilter,
          new Date(req.query.startDate),
          new Date(req.query.endDate)
        );
      } else if (psychologistFilter && req.query.date) {
        const dateAppts = await storage.getAppointmentsByDate(
          new Date(req.query.date)
        );
        appointments3 = dateAppts.filter((a) => a.psychologistId === psychologistFilter);
      } else if (psychologistFilter) {
        appointments3 = await storage.getAppointmentsByPsychologistId(psychologistFilter);
      } else if (req.query.date) {
        appointments3 = await storage.getAppointmentsByDate(
          new Date(req.query.date)
        );
      } else if (req.query.startDate && req.query.endDate) {
        appointments3 = await storage.getAppointmentsByDateRange(
          new Date(req.query.startDate),
          new Date(req.query.endDate)
        );
      } else {
        appointments3 = await storage.getAllAppointments();
      }
      const now = /* @__PURE__ */ new Date();
      await Promise.all(
        appointments3.filter((a) => a.status === "confirmed").map(async (a) => {
          const dateStr = typeof a.date === "string" ? a.date.split("T")[0] : a.date.toISOString().split("T")[0];
          const [year, month, day] = dateStr.split("-").map(Number);
          const [endHour, endMin] = a.endTime.split(":").map(Number);
          const endDatetime = new Date(year, month - 1, day, endHour, endMin, 0);
          if (endDatetime < now) {
            await storage.updateAppointment(a.id, { status: "completed" });
            a.status = "completed";
          }
        })
      );
      const result = await Promise.all(
        appointments3.map(async (appointment) => {
          const psychologist = await storage.getPsychologist(appointment.psychologistId);
          const psychologistUser = psychologist ? await storage.getUser(psychologist.userId) : null;
          const room = await storage.getRoom(appointment.roomId);
          return {
            ...appointment,
            psychologist: psychologist ? {
              ...psychologist,
              user: psychologistUser ? {
                fullName: psychologistUser.fullName,
                email: psychologistUser.email,
                profileImage: psychologistUser.profileImage
              } : null
            } : null,
            room
          };
        })
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });
  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointment(parseInt(req.params.id));
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      const psychologist = await storage.getPsychologist(appointment.psychologistId);
      const psychologistUser = psychologist ? await storage.getUser(psychologist.userId) : null;
      const room = await storage.getRoom(appointment.roomId);
      res.json({
        ...appointment,
        psychologist: psychologist ? {
          ...psychologist,
          user: psychologistUser ? {
            fullName: psychologistUser.fullName,
            email: psychologistUser.email,
            profileImage: psychologistUser.profileImage
          } : null
        } : null,
        room
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointment" });
    }
  });
  app.post("/api/appointments", async (req, res) => {
    try {
      const user = req.user;
      let body = { ...req.body };
      if (user?.role === "psychologist") {
        const psychProfile = await storage.getPsychologistByUserId(user.id);
        if (!psychProfile) {
          return res.status(400).json({ message: "Perfil de psic\xF3loga n\xE3o encontrado. Pe\xE7a ao administrador para criar seu perfil." });
        }
        body.psychologistId = psychProfile.id;
      }
      const data = insertAppointmentSchema.parse(body);
      const isRoomAvailable = await storage.checkRoomAvailability(
        data.roomId,
        new Date(data.date),
        data.startTime,
        data.endTime
      );
      if (!isRoomAvailable) {
        return res.status(409).json({ message: "Room is not available for the specified time" });
      }
      const appointment = await storage.createAppointment(data);
      await storage.createRoomBooking({
        roomId: data.roomId,
        psychologistId: data.psychologistId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        purpose: `Appointment with ${data.patientName}`
      });
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating appointment" });
    }
  });
  function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }
  app.post("/api/appointments/quick-book", async (req, res) => {
    try {
      const { date: date3, startTime, endTime, patientName, psychologistId, roomId, status, notes } = req.body;
      if (!date3 || !startTime || !endTime || !patientName || !psychologistId) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const psychologist = await storage.getPsychologist(parseInt(psychologistId));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      const isRoomAvailable = await storage.checkRoomAvailability(
        roomId || 1,
        // Default to room 1 if not specified
        new Date(date3),
        startTime,
        endTime
      );
      if (!isRoomAvailable) {
        return res.status(409).json({
          message: "A sala n\xE3o est\xE1 dispon\xEDvel neste hor\xE1rio. Por favor, escolha outro hor\xE1rio."
        });
      }
      const existingAppointments = await storage.getAppointmentsByDate(date3);
      const isTimeSlotTaken = existingAppointments.some((app2) => {
        if (app2.psychologistId !== parseInt(psychologistId)) return false;
        const appStart = timeToMinutes(app2.startTime);
        const appEnd = timeToMinutes(app2.endTime);
        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);
        return newStart < appEnd && newEnd > appStart;
      });
      if (isTimeSlotTaken) {
        return res.status(409).json({
          message: "Este hor\xE1rio j\xE1 foi agendado. Por favor, escolha outro hor\xE1rio."
        });
      }
      const appointmentData = {
        date: date3,
        startTime,
        endTime,
        patientName,
        psychologistId: parseInt(psychologistId),
        roomId: roomId || 1,
        // Default to room 1 if not specified
        status: "pending-confirmation",
        // Special status for quick bookings
        notes: notes || ""
      };
      const appointment = await storage.createAppointment(appointmentData);
      await storage.createRoomBooking({
        roomId: appointmentData.roomId,
        psychologistId: appointmentData.psychologistId,
        date: appointmentData.date,
        startTime: appointmentData.startTime,
        endTime: appointmentData.endTime,
        purpose: `Agendamento online com ${appointmentData.patientName}`
      });
      res.status(201).json({
        success: true,
        message: "Agendamento enviado com sucesso",
        appointment
      });
    } catch (error) {
      console.error("Error processing quick booking:", error);
      res.status(500).json({ message: "Erro ao processar a solicita\xE7\xE3o de agendamento" });
    }
  });
  app.put("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedAppointment = await storage.updateAppointment(id, req.body);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(updatedAppointment);
    } catch (error) {
      res.status(500).json({ message: "Error updating appointment" });
    }
  });
  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteAppointment(id);
      if (!result) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting appointment" });
    }
  });
  app.get("/api/transactions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = req.user;
      let transactions2;
      if (req.query.type) {
        transactions2 = await storage.getTransactionsByType(req.query.type);
      } else if (req.query.startDate && req.query.endDate) {
        transactions2 = await storage.getTransactionsByDateRange(
          new Date(req.query.startDate),
          new Date(req.query.endDate)
        );
      } else {
        transactions2 = await storage.getAllTransactions();
      }
      if (user.role !== "admin") {
        transactions2 = transactions2.filter((transaction) => transaction.responsibleId === user.id);
      }
      const result = await Promise.all(
        transactions2.map(async (transaction) => {
          const responsible = await storage.getUser(transaction.responsibleId);
          let relatedAppointment = null;
          if (transaction.relatedAppointmentId) {
            relatedAppointment = await storage.getAppointment(transaction.relatedAppointmentId);
          }
          return {
            ...transaction,
            responsible: responsible ? {
              id: responsible.id,
              fullName: responsible.fullName,
              email: responsible.email,
              profileImage: responsible.profileImage
            } : null,
            relatedAppointment
          };
        })
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });
  app.get("/api/transactions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = req.user;
      const transaction = await storage.getTransaction(parseInt(req.params.id));
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (transaction.responsibleId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only view your own transactions" });
      }
      const responsible = await storage.getUser(transaction.responsibleId);
      let relatedAppointment = null;
      if (transaction.relatedAppointmentId) {
        relatedAppointment = await storage.getAppointment(transaction.relatedAppointmentId);
      }
      res.json({
        ...transaction,
        responsible: responsible ? {
          id: responsible.id,
          fullName: responsible.fullName,
          email: responsible.email,
          profileImage: responsible.profileImage
        } : null,
        relatedAppointment
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching transaction" });
    }
  });
  app.post("/api/transactions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = req.user;
      const data = insertTransactionSchema.parse({
        ...req.body,
        responsibleId: user.id
      });
      const transaction = await storage.createTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating transaction" });
    }
  });
  app.put("/api/transactions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = parseInt(req.params.id);
      const existingTransaction = await storage.getTransaction(id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (existingTransaction.responsibleId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only update your own transactions" });
      }
      const updatedTransaction = await storage.updateTransaction(id, req.body);
      res.json(updatedTransaction);
    } catch (error) {
      res.status(500).json({ message: "Error updating transaction" });
    }
  });
  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = parseInt(req.params.id);
      const existingTransaction = await storage.getTransaction(id);
      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      if (existingTransaction.responsibleId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: You can only delete your own transactions" });
      }
      const result = await storage.deleteTransaction(id);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting transaction" });
    }
  });
  app.post("/api/users/generate-sample-data", async (req, res) => {
    try {
      const bcrypt = __require("bcrypt");
      const hashedPassword = await bcrypt.hash("123456", 10);
      const sampleUsers = [
        {
          username: "admin",
          password: hashedPassword,
          email: "admin@psicologia.com",
          fullName: "Administrador do Sistema",
          role: "admin",
          status: "active"
        },
        {
          username: "dra.maria",
          password: hashedPassword,
          email: "maria@psicologia.com",
          fullName: "Dra. Maria Silva",
          role: "psychologist",
          status: "active"
        },
        {
          username: "dr.carlos",
          password: hashedPassword,
          email: "carlos@psicologia.com",
          fullName: "Dr. Carlos Santos",
          role: "psychologist",
          status: "active"
        },
        {
          username: "ana.recep",
          password: hashedPassword,
          email: "ana@psicologia.com",
          fullName: "Ana Oliveira",
          role: "receptionist",
          status: "active"
        },
        {
          username: "joao.psi",
          password: hashedPassword,
          email: "joao@psicologia.com",
          fullName: "Jo\xE3o Pereira",
          role: "psychologist",
          status: "inactive"
        }
      ];
      for (const userData of sampleUsers) {
        try {
          await storage.createUser(userData);
        } catch (error) {
          console.log(`User ${userData.username} may already exist, skipping...`);
        }
      }
      res.status(201).json({
        message: "Usu\xE1rios de exemplo criados com sucesso",
        users: sampleUsers.map((u) => ({ username: u.username, fullName: u.fullName, role: u.role }))
      });
    } catch (error) {
      console.error("Error creating sample users:", error);
      res.status(500).json({ message: "Erro ao gerar usu\xE1rios de exemplo" });
    }
  });
  app.get("/api/users/debug", async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const safeUsers = users2.map((user) => {
        const { password, ...safeUser } = user;
        return {
          id: safeUser.id,
          username: safeUser.username,
          fullName: safeUser.fullName,
          email: safeUser.email,
          role: safeUser.role,
          status: safeUser.status
        };
      });
      res.json({
        total: safeUsers.length,
        users: safeUsers
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usu\xE1rios" });
    }
  });
  app.post("/api/transactions/generate-sample-data", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = req.user;
      const today = /* @__PURE__ */ new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);
      await storage.createTransaction({
        description: "Consulta - Pedro Santos",
        amount: 150,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Consulta - Maria Oliveira",
        amount: 150,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Avalia\xE7\xE3o - Jo\xE3o Pereira",
        amount: 200,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5).toISOString().split("T")[0],
        type: "income",
        category: "Avalia\xE7\xE3o",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Workshop de Mindfulness",
        amount: 500,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10).toISOString().split("T")[0],
        type: "income",
        category: "Workshop",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Aluguel do Consult\xF3rio",
        amount: 2500,
        date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString().split("T")[0],
        type: "expense",
        category: "Aluguel",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Conta de Luz",
        amount: 320,
        date: new Date(today.getFullYear(), today.getMonth(), 7).toISOString().split("T")[0],
        type: "expense",
        category: "Luz",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Internet",
        amount: 150,
        date: new Date(today.getFullYear(), today.getMonth(), 8).toISOString().split("T")[0],
        type: "expense",
        category: "Internet",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Material de Escrit\xF3rio",
        amount: 230,
        date: new Date(today.getFullYear(), today.getMonth(), 12).toISOString().split("T")[0],
        type: "expense",
        category: "Material de Escrit\xF3rio",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Consulta - Carlos Silva",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15).toISOString().split("T")[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Consulta - Ana Rodrigues",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 18).toISOString().split("T")[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Sess\xE3o em Grupo - Ansiedade",
        amount: 400,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 22).toISOString().split("T")[0],
        type: "income",
        category: "Sess\xE3o em Grupo",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Aluguel do Consult\xF3rio",
        amount: 2500,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5).toISOString().split("T")[0],
        type: "expense",
        category: "Aluguel",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Conta de Luz",
        amount: 290,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 7).toISOString().split("T")[0],
        type: "expense",
        category: "Luz",
        responsibleId: user.id
      });
      await storage.createTransaction({
        description: "Internet",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 9).toISOString().split("T")[0],
        type: "expense",
        category: "Internet",
        responsibleId: user.id
      });
      res.status(201).json({ message: "Dados de exemplo criados com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao gerar dados de exemplo" });
    }
  });
  app.get("/api/room-bookings", async (req, res) => {
    try {
      let bookings;
      if (req.query.roomId) {
        bookings = await storage.getRoomBookingsByRoomId(parseInt(req.query.roomId));
      } else if (req.query.date) {
        bookings = await storage.getRoomBookingsByDate(new Date(req.query.date));
      } else if (req.query.startDate && req.query.endDate) {
        bookings = await storage.getRoomBookingsByDateRange(
          new Date(req.query.startDate),
          new Date(req.query.endDate)
        );
      } else {
        bookings = await storage.getAllRoomBookings();
      }
      const result = await Promise.all(
        bookings.map(async (booking) => {
          const room = await storage.getRoom(booking.roomId);
          const psychologist = await storage.getPsychologist(booking.psychologistId);
          const psychologistUser = psychologist ? await storage.getUser(psychologist.userId) : null;
          return {
            ...booking,
            room,
            psychologist: psychologist ? {
              ...psychologist,
              user: psychologistUser ? {
                fullName: psychologistUser.fullName,
                email: psychologistUser.email,
                profileImage: psychologistUser.profileImage
              } : null
            } : null
          };
        })
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error fetching room bookings" });
    }
  });
  app.get("/api/room-bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getRoomBooking(parseInt(req.params.id));
      if (!booking) {
        return res.status(404).json({ message: "Room booking not found" });
      }
      const room = await storage.getRoom(booking.roomId);
      const psychologist = await storage.getPsychologist(booking.psychologistId);
      const psychologistUser = psychologist ? await storage.getUser(psychologist.userId) : null;
      res.json({
        ...booking,
        room,
        psychologist: psychologist ? {
          ...psychologist,
          user: psychologistUser ? {
            fullName: psychologistUser.fullName,
            email: psychologistUser.email,
            profileImage: psychologistUser.profileImage
          } : null
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching room booking" });
    }
  });
  app.post("/api/room-bookings", async (req, res) => {
    try {
      const data = insertRoomBookingSchema.parse(req.body);
      const isRoomAvailable = await storage.checkRoomAvailability(
        data.roomId,
        new Date(data.date),
        data.startTime,
        data.endTime
      );
      if (!isRoomAvailable) {
        return res.status(409).json({ message: "Room is not available for the specified time" });
      }
      const booking = await storage.createRoomBooking(data);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating room booking" });
    }
  });
  app.put("/api/room-bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedBooking = await storage.updateRoomBooking(id, req.body);
      if (!updatedBooking) {
        return res.status(404).json({ message: "Room booking not found" });
      }
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Error updating room booking" });
    }
  });
  app.delete("/api/room-bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteRoomBooking(id);
      if (!result) {
        return res.status(404).json({ message: "Room booking not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting room booking" });
    }
  });
  app.get("/api/permissions", async (req, res) => {
    try {
      const permissions2 = await storage.getAllPermissions();
      res.json(permissions2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching permissions" });
    }
  });
  app.post("/api/permissions", async (req, res) => {
    try {
      const data = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(data);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating permission" });
    }
  });
  app.get("/api/role-permissions", async (req, res) => {
    try {
      let rolePermissions2;
      if (req.query.role) {
        rolePermissions2 = await storage.getRolePermissionsByRole(req.query.role);
      } else {
        rolePermissions2 = await storage.getAllRolePermissions();
      }
      const result = await Promise.all(
        rolePermissions2.map(async (rp) => {
          const permission = await storage.getPermission(rp.permissionId);
          return {
            ...rp,
            permission
          };
        })
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Error fetching role permissions" });
    }
  });
  app.post("/api/role-permissions", async (req, res) => {
    try {
      const data = insertRolePermissionSchema.parse(req.body);
      const rolePermission = await storage.createRolePermission(data);
      res.status(201).json(rolePermission);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating role permission" });
    }
  });
  app.delete("/api/role-permissions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteRolePermission(id);
      if (!result) {
        return res.status(404).json({ message: "Role permission not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting role permission" });
    }
  });
  app.post("/api/share/whatsapp", async (req, res) => {
    try {
      const { psychologistId, startDate, endDate, message } = req.body;
      if (!psychologistId || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const psychologist = await storage.getPsychologist(parseInt(psychologistId));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      const psychologistUser = await storage.getUser(psychologist.userId);
      if (!psychologistUser) {
        return res.status(404).json({ message: "Psychologist user not found" });
      }
      const appointments3 = await storage.getAppointmentsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
      const psychologistAppointments = appointments3.filter(
        (app2) => app2.psychologistId === parseInt(psychologistId)
      );
      const availableTimes = calculateAvailableSlots(
        new Date(startDate),
        new Date(endDate),
        psychologistAppointments
      );
      const whatsappMessage = await formatWhatsAppMessage(
        psychologistUser.fullName,
        message || "",
        availableTimes,
        new Date(startDate),
        new Date(endDate),
        parseInt(psychologistId),
        psychologist.userId
      );
      const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
      res.json({
        link: whatsappLink,
        message: whatsappMessage
      });
    } catch (error) {
      res.status(500).json({ message: "Error generating WhatsApp share link" });
    }
  });
  app.post("/api/profile", (req, res, next) => {
    upload2.single("profileImageFile")(req, res, (err) => {
      if (err instanceof multer3.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "O arquivo \xE9 muito grande. O tamanho m\xE1ximo permitido \xE9 2MB."
          });
        }
        return res.status(400).json({
          message: `Erro no upload: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          message: err.message
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      console.log("Profile update request:", {
        body: req.body,
        hasFile: !!req.file,
        filename: req.file?.filename
      });
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      let userId = req.user?.id;
      if (req.body.psychologistId) {
        console.log("Updating psychologist photo, ID:", req.body.psychologistId);
        const psychologistId = parseInt(req.body.psychologistId);
        const psychologist = await storage.getPsychologist(psychologistId);
        if (!psychologist) {
          console.error("Psychologist not found:", psychologistId);
          return res.status(404).json({ message: "Psic\xF3loga n\xE3o encontrada" });
        }
        userId = psychologist.userId;
        console.log("Found psychologist, user ID:", userId);
      }
      if (!userId) {
        return res.status(400).json({ message: "User ID not found" });
      }
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        console.error("User not found:", userId);
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      console.log("Existing user found:", existingUser.id, existingUser.fullName);
      const { fullName, email, birthDate } = req.body;
      const updateData = {};
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (birthDate !== void 0) updateData.birthDate = birthDate || null;
      if (req.file) {
        const imageUrl = `/api/users/${userId}/photo`;
        updateData.profileImage = imageUrl;
        updateData.profileImageData = req.file.buffer;
        updateData.profileImageMimeType = req.file.mimetype;
        console.log("New image URL:", imageUrl);
      }
      console.log("Update data:", { ...updateData, profileImageData: updateData.profileImageData ? "<buffer>" : void 0 });
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        console.error("Failed to update user in storage");
        return res.status(500).json({ message: "Falha ao atualizar perfil do usu\xE1rio" });
      }
      console.log("User updated successfully");
      const { password, profileImageData, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        message: "Error updating profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.post("/api/recover-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "Email v\xE1lido \xE9 obrigat\xF3rio" });
      }
      console.log("\u{1F50D} Verificando recupera\xE7\xE3o de senha para email:", email);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log("\u274C Email n\xE3o encontrado na base de dados:", email);
        return res.status(200).json({
          message: "Se o email existir, voc\xEA receber\xE1 as instru\xE7\xF5es de recupera\xE7\xE3o."
        });
      }
      console.log("\u2705 Usu\xE1rio encontrado:", {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        status: user.status
      });
      if (user.status !== "active") {
        console.log("\u26A0\uFE0F Usu\xE1rio n\xE3o est\xE1 ativo:", user.status);
        return res.status(200).json({
          message: "Se o email existir, voc\xEA receber\xE1 as instru\xE7\xF5es de recupera\xE7\xE3o."
        });
      }
      const resetToken = crypto3.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1e3);
      console.log("\u{1F510} Token gerado:", {
        token: resetToken.substring(0, 8) + "...",
        expiresAt: expiresAt.toISOString(),
        userId: user.id
      });
      await storage.savePasswordResetToken(user.id, resetToken, expiresAt);
      console.log("\u{1F4BE} Token salvo no banco de dados");
      console.log("\u{1F4E7} Enviando email de recupera\xE7\xE3o...");
      try {
        await sendPasswordResetEmail(user, resetToken);
        console.log("\u2705 Processo de recupera\xE7\xE3o conclu\xEDdo com sucesso");
      } catch (emailError) {
        console.log("\u26A0\uFE0F  Erro no envio do email, mas token foi salvo. Verifique logs para detalhes.");
      }
      res.status(200).json({
        message: "Se o email existir, voc\xEA receber\xE1 as instru\xE7\xF5es de recupera\xE7\xE3o."
      });
    } catch (error) {
      console.error("\u274C Erro no processo de recupera\xE7\xE3o de senha:", error);
      res.status(500).json({ message: "Erro ao processar recupera\xE7\xE3o de senha" });
    }
  });
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      console.log("\u{1F50D} Validando token de reset:", {
        token: token.substring(0, 8) + "...",
        fullToken: token,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (!token) {
        console.log("\u274C Token n\xE3o fornecido");
        return res.status(400).json({ message: "Token \xE9 obrigat\xF3rio" });
      }
      const resetToken = await storage.getPasswordResetToken(token);
      console.log("\u{1F5FA} Token encontrado no storage:", {
        found: !!resetToken,
        tokenData: resetToken ? {
          userId: resetToken.userId,
          expiresAt: resetToken.expiresAt,
          used: resetToken.used,
          createdAt: resetToken.createdAt
        } : null
      });
      if (!resetToken) {
        console.log("\u274C Token inv\xE1lido ou expirado");
        return res.status(400).json({
          message: "Token inv\xE1lido ou expirado. Solicite uma nova recupera\xE7\xE3o de senha."
        });
      }
      console.log("\u2705 Token v\xE1lido!");
      res.status(200).json({
        valid: true,
        message: "Token v\xE1lido. Voc\xEA pode redefinir sua senha."
      });
    } catch (error) {
      console.error("\u274C Error validating reset token:", error);
      res.status(500).json({ message: "Erro ao validar token" });
    }
  });
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;
      if (!token || !password || !confirmPassword) {
        return res.status(400).json({
          message: "Token, senha e confirma\xE7\xE3o s\xE3o obrigat\xF3rios"
        });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({
          message: "As senhas n\xE3o coincidem"
        });
      }
      if (password.length < 6) {
        return res.status(400).json({
          message: "A senha deve ter pelo menos 6 caracteres"
        });
      }
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({
          message: "Token inv\xE1lido ou expirado. Solicite uma nova recupera\xE7\xE3o de senha."
        });
      }
      const hashedPassword = await hashPassword(password);
      const updated = await storage.updateUserPassword(resetToken.userId, hashedPassword);
      if (!updated) {
        return res.status(500).json({
          message: "Erro ao atualizar senha. Tente novamente."
        });
      }
      await storage.invalidatePasswordResetToken(token);
      res.status(200).json({
        message: "Sua senha foi alterada com sucesso. Agora voc\xEA j\xE1 pode fazer login com a nova senha."
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });
  app.post("/api/appointments/quick-book", async (req, res) => {
    try {
      const appointmentData = req.body;
      if (!appointmentData.date || !appointmentData.startTime || !appointmentData.endTime || !appointmentData.patientName || !appointmentData.psychologistId) {
        return res.status(400).json({ message: "Dados incompletos para agendamento" });
      }
      const newAppointment = await storage.createAppointment({
        ...appointmentData,
        status: "pending-confirmation"
        // Status especial para agendamentos via WhatsApp
      });
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Erro no agendamento r\xE1pido:", error);
      res.status(500).json({ message: "Erro ao processar agendamento" });
    }
  });
  app.post("/api/whatsapp/share-availability", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const {
        phoneNumber,
        psychologistId,
        startDate,
        endDate,
        customMessage
      } = req.body;
      if (!phoneNumber || !psychologistId || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const psychologist = await storage.getPsychologist(parseInt(psychologistId));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      const psychologistUser = await storage.getUser(psychologist.userId);
      if (!psychologistUser) {
        return res.status(404).json({ message: "Psychologist user not found" });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      const appointments3 = await storage.getAppointmentsByDateRange(start, end);
      const psychologistAppointments = appointments3.filter((app2) => app2.psychologistId === parseInt(psychologistId));
      const availableTimes = calculateAvailableSlots(start, end, psychologistAppointments, psychologist);
      const message = await formatWhatsAppMessage(
        psychologistUser.fullName,
        customMessage || "",
        availableTimes,
        start,
        end,
        parseInt(psychologistId),
        psychologist.userId
        // Usuário do psicólogo para criar eventos no Google Calendar
      );
      const result = await sendWhatsAppAvailability(
        phoneNumber,
        message
      );
      res.json({
        success: true,
        message: "Availability with Google Calendar links shared successfully",
        result
      });
    } catch (error) {
      console.error("Error sharing availability via WhatsApp:", error);
      res.status(500).json({
        message: "Error sharing availability",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app.use("/api/google-calendar", google_calendar_default);
  app.use("/api/meetings", meetings_default);
  console.log("Registering /api/patients routes...");
  app.use("/api/patients", patient_records_default);
  app.use("/api/profile", profile_default);
  app.use("/api/specialization-areas", specialization_areas_default);
  app.use("/api/admin/psychologists", admin_psychologists_default);
  app.use("/api/care", care_public_default);
  app.use("/api/care/templates", care_templates_default);
  app.use("/api/care", care_dispatch_default);
  app.use("/api/admin/commissions", commissions_default);
  app.use("/api/admin/commission-configs", commissionConfigsRouter);
  app.post("/api/invoices/analyze-image", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const { image, image_type, psychologist_profile } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ message: "Campo 'image' (base64) \xE9 obrigat\xF3rio." });
      }
      const mime = (image_type ?? "image/jpeg").toLowerCase();
      let result;
      if (mime === "application/pdf") {
        result = await analyzeInvoicePdf(image, psychologist_profile);
      } else {
        result = await analyzeInvoiceImage(image, mime, psychologist_profile);
      }
      res.json({
        success: true,
        data: result.data,
        ai_confidence_score: result.ai_confidence_score
      });
    } catch (error) {
      if (error instanceof UnsupportedFormatError) {
        return res.status(400).json({ message: error.message });
      }
      if (error instanceof AIQuotaError) {
        return res.status(429).json({ message: error.message });
      }
      if (error instanceof AIServiceError) {
        return res.status(502).json({ message: error.message });
      }
      console.error("Error analyzing invoice file:", error);
      res.status(500).json({ message: "Erro ao analisar o arquivo da nota fiscal." });
    }
  });
  app.post("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const body = req.body;
      const psychologistId = user.id;
      let imagePath = body.image_path;
      let imageUrl = body.image_url;
      const imageBase64 = body.image;
      const imageType = body.image_type || "image/jpeg";
      let imageData = null;
      let imageMimeType = null;
      if (!imagePath && !imageUrl && !imageBase64) {
        return res.status(400).json({ message: "Imagem da nota \xE9 obrigat\xF3ria (image_path, image_url ou image em base64)." });
      }
      if (imageBase64 && typeof imageBase64 === "string") {
        try {
          const buf = Buffer.from(imageBase64, "base64");
          if (buf.length > 4 * 1024 * 1024) return res.status(400).json({ message: "Arquivo muito grande (m\xE1x. 4MB)." });
          imageData = buf;
          imageMimeType = imageType;
        } catch (err) {
          console.error("Error saving invoice image:", err);
          return res.status(400).json({ message: "Erro ao salvar imagem da nota." });
        }
      }
      const valorLiquido = body.valor_liquido != null ? Number(body.valor_liquido) : null;
      const valorServicos = body.valor_servicos != null ? Number(body.valor_servicos) : null;
      const invoice = await storage.createInvoice({
        psychologistId,
        clinicId: body.clinic_id ?? null,
        chaveNfe: body.chave_nfe ?? null,
        numeroNota: body.numero_nota ?? null,
        serie: body.serie ?? null,
        dataEmissao: body.data_emissao ?? null,
        emitenteNome: body.emitente_nome ?? null,
        emitenteCnpjCpf: body.emitente_cnpj_cpf ?? null,
        emitenteCrp: body.emitente_crp ?? null,
        emitenteIe: body.emitente_ie ?? null,
        emitenteIm: body.emitente_im ?? null,
        emitenteEndereco: body.emitente_endereco ?? null,
        emitenteBairro: body.emitente_bairro ?? null,
        emitenteMunicipio: body.emitente_municipio ?? null,
        emitenteUf: body.emitente_uf ?? null,
        emitenteCep: body.emitente_cep ?? null,
        emitenteTelefone: body.emitente_telefone ?? null,
        emitenteEmail: body.emitente_email ?? null,
        tomadorNome: body.tomador_nome ?? null,
        tomadorCpfCnpj: body.tomador_cpf_cnpj ?? null,
        tomadorEndereco: body.tomador_endereco ?? null,
        tomadorBairro: body.tomador_bairro ?? null,
        tomadorMunicipio: body.tomador_municipio ?? null,
        tomadorUf: body.tomador_uf ?? null,
        tomadorCep: body.tomador_cep ?? null,
        tomadorEmail: body.tomador_email ?? null,
        patientId: body.patient_id ?? null,
        descricaoServico: body.descricao_servico ?? null,
        codigoServico: body.codigo_servico ?? null,
        codigoCnae: body.codigo_cnae ?? null,
        issRetido: Boolean(body.iss_retido),
        aliquotaIss: body.aliquota_iss != null ? String(body.aliquota_iss) : null,
        valorServicos: valorServicos != null ? String(valorServicos) : null,
        valorDeducoes: body.valor_deducoes != null ? String(Number(body.valor_deducoes)) : null,
        baseCalculo: body.base_calculo != null ? String(Number(body.base_calculo)) : null,
        valorIss: body.valor_iss != null ? String(Number(body.valor_iss)) : null,
        valorPis: body.valor_pis != null ? String(Number(body.valor_pis)) : null,
        valorCofins: body.valor_cofins != null ? String(Number(body.valor_cofins)) : null,
        valorInss: body.valor_inss != null ? String(Number(body.valor_inss)) : null,
        valorIr: body.valor_ir != null ? String(Number(body.valor_ir)) : null,
        valorCsll: body.valor_csll != null ? String(Number(body.valor_csll)) : null,
        valorLiquido: valorLiquido != null ? String(valorLiquido) : valorServicos != null ? String(valorServicos) : null,
        imageUrl: imageUrl ?? null,
        imagePath: imagePath ?? null,
        imageData,
        imageMimeType,
        aiRawResponse: body.ai_raw_response ?? null,
        aiConfidenceScore: body.ai_confidence_score != null ? String(Number(body.ai_confidence_score)) : null,
        aiExtractedAt: body.ai_extracted_at ? new Date(body.ai_extracted_at) : null,
        revisadoPelaPsicologa: Boolean(body.revisado_pela_psicologa),
        observacoes: body.observacoes ?? null,
        status: body.status ?? "ativa"
      });
      const { imageData: _invoiceImageData, ...invoiceResponse } = invoice;
      res.status(201).json({ ...invoiceResponse, message: "Nota fiscal registrada com sucesso" });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Erro ao salvar nota fiscal" });
    }
  });
  app.get("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const dataEmissaoFrom = req.query.data_emissao_from;
      const dataEmissaoTo = req.query.data_emissao_to;
      const status = req.query.status;
      const search = req.query.search;
      const result = await storage.getInvoicesByUserId(user.id, { limit, offset, dataEmissaoFrom, dataEmissaoTo, status, search });
      res.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
      res.json(result);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Erro ao buscar notas fiscais" });
    }
  });
  app.get("/api/invoices/summary", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const dataEmissaoFrom = req.query.data_emissao_from;
      const dataEmissaoTo = req.query.data_emissao_to;
      const status = req.query.status;
      const summary = await storage.getInvoicesSummary(user.id, { dataEmissaoFrom, dataEmissaoTo, status });
      res.json(summary);
    } catch (error) {
      console.error("Error fetching invoice summary:", error);
      res.status(500).json({ message: "Erro ao buscar resumo" });
    }
  });
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID inv\xE1lido" });
      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal n\xE3o encontrada" });
      if (invoice.psychologistId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const { imageData: _invoiceImageData, ...invoiceResponse } = invoice;
      res.json(invoiceResponse);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Erro ao buscar nota fiscal" });
    }
  });
  app.put("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID inv\xE1lido" });
      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal n\xE3o encontrada" });
      if (invoice.psychologistId !== user.id) {
        return res.status(403).json({ message: "Apenas a psic\xF3loga que registrou pode editar." });
      }
      const body = req.body;
      const updated = await storage.updateInvoice(id, {
        numeroNota: body.numero_nota,
        serie: body.serie,
        dataEmissao: body.data_emissao,
        tomadorNome: body.tomador_nome,
        tomadorCpfCnpj: body.tomador_cpf_cnpj,
        tomadorEndereco: body.tomador_endereco,
        tomadorMunicipio: body.tomador_municipio,
        tomadorUf: body.tomador_uf,
        tomadorCep: body.tomador_cep,
        tomadorEmail: body.tomador_email,
        patientId: body.patient_id != null ? body.patient_id : void 0,
        descricaoServico: body.descricao_servico,
        valorServicos: body.valor_servicos != null ? String(Number(body.valor_servicos)) : void 0,
        valorLiquido: body.valor_liquido != null ? String(Number(body.valor_liquido)) : void 0,
        observacoes: body.observacoes,
        status: body.status
      });
      const { imageData: _invoiceImageData, ...updatedResponse } = updated ?? {};
      res.json(updatedResponse);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Erro ao atualizar nota fiscal" });
    }
  });
  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID inv\xE1lido" });
      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal n\xE3o encontrada" });
      if (invoice.psychologistId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const { status } = req.body;
      if (!status || !["ativa", "cancelada", "pendente"].includes(status)) {
        return res.status(400).json({ message: "Status inv\xE1lido. Use: ativa, cancelada ou pendente." });
      }
      const updated = await storage.updateInvoice(id, { status });
      const { imageData: _invoiceImageData, ...updatedResponse } = updated ?? {};
      res.json(updatedResponse);
    } catch (error) {
      console.error("Error patching invoice status:", error);
      res.status(500).json({ message: "Erro ao alterar status" });
    }
  });
  app.get("/api/admin/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const psychologistId = req.query.psychologist_id != null ? parseInt(req.query.psychologist_id, 10) : void 0;
      const dataEmissaoFrom = req.query.data_emissao_from;
      const dataEmissaoTo = req.query.data_emissao_to;
      const status = req.query.status;
      const search = req.query.search;
      const result = await storage.getInvoicesAdmin({ limit, offset, psychologistId, dataEmissaoFrom, dataEmissaoTo, status, search });
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin invoices:", error);
      res.status(500).json({ message: "Erro ao buscar notas fiscais" });
    }
  });
  app.get("/api/admin/invoices/summary", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const psychologistId = req.query.psychologist_id != null ? parseInt(req.query.psychologist_id, 10) : void 0;
      const dataEmissaoFrom = req.query.data_emissao_from;
      const dataEmissaoTo = req.query.data_emissao_to;
      const status = req.query.status;
      const summary = await storage.getInvoicesSummaryAdmin({ psychologistId, dataEmissaoFrom, dataEmissaoTo, status });
      res.json(summary);
    } catch (error) {
      console.error("Error fetching admin invoice summary:", error);
      res.status(500).json({ message: "Erro ao buscar resumo" });
    }
  });
  app.get("/api/admin/invoices/export", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const psychologistId = req.query.psychologist_id != null ? parseInt(req.query.psychologist_id, 10) : void 0;
      const dataEmissaoFrom = req.query.data_emissao_from;
      const dataEmissaoTo = req.query.data_emissao_to;
      const status = req.query.status;
      const { invoices: invoices2 } = await storage.getInvoicesAdmin({ limit: 1e4, offset: 0, psychologistId, dataEmissaoFrom, dataEmissaoTo, status });
      const headers = ["Chave NF-e", "N\xFAmero", "S\xE9rie", "Data Emiss\xE3o", "Psic\xF3loga", "Tomador", "Valor L\xEDquido", "Status", "Registrada em"];
      const rows = invoices2.map((inv) => [
        inv.chaveNfe ?? "",
        inv.numeroNota ?? "",
        inv.serie ?? "",
        inv.dataEmissao ?? "",
        inv.user?.fullName ?? "",
        inv.tomadorNome ?? "",
        inv.valorLiquido ?? "",
        inv.status ?? "",
        inv.dataUpload ? new Date(inv.dataUpload).toLocaleString("pt-BR") : ""
      ]);
      const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=notas-fiscais.csv");
      res.send("\uFEFF" + csv);
    } catch (error) {
      console.error("Error exporting invoices:", error);
      res.status(500).json({ message: "Erro ao exportar" });
    }
  });
  app.get("/api/admin/invoices/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const referenceMonth = req.query.referenceMonth;
      if (!referenceMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) {
        return res.status(400).json({ message: "M\xEAs de refer\xEAncia \xE9 obrigat\xF3rio (YYYY-MM)" });
      }
      const [year, month] = referenceMonth.split("-").map(Number);
      const dataEmissaoFrom = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const dataEmissaoTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { invoices: invoices2 } = await storage.getInvoicesAdmin({ limit: 1e4, offset: 0, dataEmissaoFrom, dataEmissaoTo });
      const psychologistIdsWithInvoice = new Set(invoices2.map((inv) => inv.psychologistId));
      const allUsers = await storage.getAllUsers();
      const nonAdminUsers = allUsers.filter((u) => u.role !== "admin");
      const sent = nonAdminUsers.filter((u) => psychologistIdsWithInvoice.has(u.id)).map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role }));
      const pending = nonAdminUsers.filter((u) => !psychologistIdsWithInvoice.has(u.id)).map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role }));
      res.json({ referenceMonth, sent, pending, totalUsers: nonAdminUsers.length, totalSent: sent.length, totalPending: pending.length });
    } catch (error) {
      console.error("Error fetching invoice status:", error);
      res.status(500).json({ message: "Erro ao buscar status de notas fiscais" });
    }
  });
  app.get("/api/invoices/:id/image", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const invoiceId = parseInt(req.params.id, 10);
      if (isNaN(invoiceId)) return res.status(400).json({ message: "ID inv\xE1lido" });
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal n\xE3o encontrada" });
      if (invoice.psychologistId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      if (!invoice.imageData) {
        return res.status(404).json({ message: "Arquivo da imagem n\xE3o encontrado" });
      }
      res.setHeader("Content-Type", invoice.imageMimeType || "image/jpeg");
      res.setHeader("Content-Disposition", "inline");
      res.send(invoice.imageData);
    } catch (error) {
      console.error("Error serving invoice image:", error);
      res.status(500).json({ message: "Erro ao exibir imagem" });
    }
  });
  app.get("/api/invoices/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const invoiceId = parseInt(req.params.id, 10);
      if (isNaN(invoiceId)) return res.status(400).json({ message: "ID inv\xE1lido" });
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal n\xE3o encontrada" });
      if (invoice.psychologistId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      if (!invoice.imageData) {
        return res.status(404).json({ message: "Arquivo da imagem n\xE3o encontrado" });
      }
      const mimeType = invoice.imageMimeType || "image/jpeg";
      const fileExt = mimeType.includes("pdf") ? ".pdf" : mimeType.includes("png") ? ".png" : mimeType.includes("webp") ? ".webp" : ".jpg";
      const filename = `nota-${invoice.numeroNota ?? invoice.id}${fileExt}`;
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(invoice.imageData);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      res.status(500).json({ message: "Erro ao baixar nota fiscal" });
    }
  });
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "N\xE3o autenticado" });
      }
      const user = req.user;
      const invoiceId = parseInt(req.params.id, 10);
      if (isNaN(invoiceId)) return res.status(400).json({ message: "ID inv\xE1lido" });
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal n\xE3o encontrada" });
      if (invoice.psychologistId !== user.id) {
        return res.status(403).json({ message: "Acesso negado. Voc\xEA s\xF3 pode excluir suas pr\xF3prias notas." });
      }
      await storage.deleteInvoice(invoiceId);
      res.json({ message: "Nota fiscal exclu\xEDda com sucesso" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Erro ao excluir nota fiscal" });
    }
  });
  const httpServer = createServer(app);
  return httpServer;
}
function calculateAvailableSlots(startDate, endDate, appointments3, psychologist) {
  const availableTimes = [];
  const workingHours = {
    start: "08:00",
    end: "18:00"
  };
  const slotDuration = 60;
  const dates = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  dates.forEach((date3) => {
    const dateString = date3.toISOString().split("T")[0];
    const dateAppointments = appointments3.filter((app) => {
      const appDate = new Date(app.date).toISOString().split("T")[0];
      return appDate === dateString;
    });
    const busyTimes = dateAppointments.map((app) => ({
      start: app.startTime,
      end: app.endTime
    }));
    const slots = calculateTimeSlots(workingHours.start, workingHours.end, slotDuration, busyTimes);
    availableTimes.push({
      date: dateString,
      slots
    });
  });
  return availableTimes;
}
function calculateTimeSlots(startTime, endTime, durationMinutes, busySlots) {
  const availableSlots = [];
  let currentTime = /* @__PURE__ */ new Date(`2000-01-01T${startTime}`);
  const endTimeDate = /* @__PURE__ */ new Date(`2000-01-01T${endTime}`);
  while (currentTime < endTimeDate) {
    const currentTimeStr = currentTime.toTimeString().substring(0, 5);
    const slotEndTime = new Date(currentTime.getTime() + durationMinutes * 6e4);
    const slotEndTimeStr = slotEndTime.toTimeString().substring(0, 5);
    const isAvailable = !busySlots.some((busy) => {
      return currentTimeStr < busy.end && slotEndTimeStr > busy.start;
    });
    if (isAvailable) {
      availableSlots.push(`${currentTimeStr} - ${slotEndTimeStr}`);
    }
    currentTime = slotEndTime;
  }
  return availableSlots;
}
async function formatWhatsAppMessage(psychologistName, customMessage, availableTimes, startDate, endDate, psychologistId, psychologistUserId) {
  const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  let message = customMessage.trim() ? customMessage + "\n\n" : "";
  message += `*Hor\xE1rios dispon\xEDveis - ${psychologistName}*
`;
  message += `Per\xEDodo: ${dateFormatter.format(startDate)} a ${dateFormatter.format(endDate)}

`;
  for (const item of availableTimes) {
    const date3 = new Date(item.date);
    const formattedDate = dateFormatter.format(date3);
    message += `*${formattedDate} (${getDayOfWeek(date3)})*
`;
    if (item.slots.length === 0) {
      message += "Sem hor\xE1rios dispon\xEDveis neste dia.\n";
    } else {
      for (const slot of item.slots) {
        const [startTime, endTime] = slot.split(" - ");
        const eventData = {
          summary: `Consulta com ${psychologistName}`,
          date: item.date,
          startTime,
          endTime,
          details: `Hor\xE1rio dispon\xEDvel para agendamento com ${psychologistName}. Clique para confirmar.`
        };
        try {
          const googleCalendarLink = getAppointmentSchedulingLink(
            psychologistUserId,
            eventData
          );
          message += `- ${slot} \u{1F449} [Agendar via Google Calendar](${googleCalendarLink})
`;
        } catch (error) {
          console.error(`Erro ao criar evento no Google Calendar: ${error}`);
          const encodedDate = encodeURIComponent(item.date);
          const encodedTime = encodeURIComponent(slot);
          const encodedPsychologistId = encodeURIComponent(psychologistId.toString());
          const baseUrl = process.env.BASE_URL || "https://management-consultancy-psi.replit.app";
          const bookingLink = `${baseUrl}/quick-booking?date=${encodedDate}&time=${encodedTime}&psychologist=${encodedPsychologistId}`;
          message += `- ${slot} \u{1F449} [Agendar](${bookingLink})
`;
        }
      }
    }
    message += "\n";
  }
  message += "Clique nos links para agendar diretamente ou entre em contato para mais informa\xE7\xF5es.";
  return message;
}
function getDayOfWeek(date3) {
  const days = ["Domingo", "Segunda", "Ter\xE7a", "Quarta", "Quinta", "Sexta", "S\xE1bado"];
  return days[date3.getDay()];
}

// server/seed-specializations.ts
import { sql as sql3 } from "drizzle-orm";
var PREDEFINED_AREAS = [
  // Transtornos Clínicos (10)
  { name: "Ansiedade", category: "Transtornos Cl\xEDnicos" },
  { name: "Depress\xE3o", category: "Transtornos Cl\xEDnicos" },
  { name: "Burnout e Estresse", category: "Transtornos Cl\xEDnicos" },
  { name: "TOC", category: "Transtornos Cl\xEDnicos" },
  { name: "TDAH", category: "Transtornos Cl\xEDnicos" },
  { name: "Trauma e TEPT", category: "Transtornos Cl\xEDnicos" },
  { name: "Transtornos Alimentares", category: "Transtornos Cl\xEDnicos" },
  { name: "Depend\xEAncia Qu\xEDmica", category: "Transtornos Cl\xEDnicos" },
  { name: "Transtorno Bipolar", category: "Transtornos Cl\xEDnicos" },
  { name: "Esquizofrenia e Psicose", category: "Transtornos Cl\xEDnicos" },
  // Público-Alvo (5)
  { name: "Psicologia Infantil", category: "P\xFAblico-Alvo" },
  { name: "Psicologia do Adolescente", category: "P\xFAblico-Alvo" },
  { name: "Psicologia do Idoso", category: "P\xFAblico-Alvo" },
  { name: "Psicologia da Mulher", category: "P\xFAblico-Alvo" },
  { name: "Psicologia LGBTQIA+", category: "P\xFAblico-Alvo" },
  // Abordagem (9)
  { name: "Psicologia Familiar", category: "Abordagem" },
  { name: "Terapia de Casal", category: "Abordagem" },
  { name: "Terapia Cognitivo-Comportamental (TCC)", category: "Abordagem" },
  { name: "Psican\xE1lise", category: "Abordagem" },
  { name: "Psicologia Anal\xEDtica (Jung)", category: "Abordagem" },
  { name: "EMDR", category: "Abordagem" },
  { name: "Mindfulness", category: "Abordagem" },
  { name: "Terapia de Aceita\xE7\xE3o e Compromisso (ACT)", category: "Abordagem" },
  { name: "Gestalt-terapia", category: "Abordagem" },
  // Área de Atuação (10)
  { name: "Psicologia Escolar", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Psicologia Organizacional", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Psicologia Hospitalar", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Neuropsicologia", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Avalia\xE7\xE3o Psicol\xF3gica", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Psicologia Forense", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Psicologia do Esporte", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Orienta\xE7\xE3o Vocacional", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Sa\xFAde Mental no Trabalho", category: "\xC1rea de Atua\xE7\xE3o" },
  { name: "Psicologia da Sa\xFAde", category: "\xC1rea de Atua\xE7\xE3o" },
  // Especialidade (5)
  { name: "Luto e Perdas", category: "Especialidade" },
  { name: "Autismo (TEA)", category: "Especialidade" },
  { name: "Viol\xEAncia e Abuso", category: "Especialidade" },
  { name: "Sa\xFAde Sexual", category: "Especialidade" },
  { name: "Fobias", category: "Especialidade" }
];
async function seedSpecializationAreas() {
  try {
    const [{ count: count3 }] = await db2.select({ count: sql3`count(*)` }).from(specializationAreas);
    if (Number(count3) >= PREDEFINED_AREAS.length) return;
    for (const area of PREDEFINED_AREAS) {
      await db2.insert(specializationAreas).values({ name: area.name, category: area.category, isCustom: false }).onConflictDoNothing();
    }
    console.log(`Seeded ${PREDEFINED_AREAS.length} specialization areas.`);
  } catch (e) {
    console.error("Failed to seed specialization areas:", e);
  }
}

// server/seed-care.ts
import { sql as sql4 } from "drizzle-orm";
async function seedCareTemplates() {
  try {
    const [{ count: count3 }] = await db2.select({ count: sql4`count(*)` }).from(careTemplates);
    if (Number(count3) > 0) return;
    const [template] = await db2.insert(careTemplates).values({
      psychologistId: null,
      title: "Check-in Semanal",
      description: "Formul\xE1rio padr\xE3o de acompanhamento semanal do paciente.",
      isDefault: true
    }).returning();
    await db2.insert(careTemplateQuestions).values([
      {
        templateId: template.id,
        questionText: "Como est\xE1 sua semana, {patient_name}?",
        questionType: "textarea",
        isRequired: true,
        orderIndex: 0
      },
      {
        templateId: template.id,
        questionText: "Em uma escala de 1 a 10, como voc\xEA avalia seu bem-estar hoje?",
        questionType: "scale",
        isRequired: true,
        orderIndex: 1
      },
      {
        templateId: template.id,
        questionText: "H\xE1 algo que gostaria de compartilhar antes da nossa pr\xF3xima sess\xE3o?",
        questionType: "textarea",
        isRequired: false,
        orderIndex: 2
      }
    ]);
    console.log("Seeded default care template: Check-in Semanal");
  } catch (e) {
    console.error("Failed to seed care templates:", e);
  }
}

// server/log.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// server/app.ts
async function createApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path4.startsWith("/api")) {
        let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "\u2026";
        }
        log(logLine);
      }
    });
    next();
  });
  await seedSpecializationAreas();
  await seedCareTemplates();
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  return { app, server };
}

// server/vercel-handler.ts
var appPromise = null;
function getApp() {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
}
async function handler(req, res) {
  const { app } = await getApp();
  return app(req, res);
}
export {
  handler as default
};
