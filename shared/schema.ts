import { pgTable, text, serial, integer, boolean, date, time, decimal, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

// User & Auth related schemas
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("psychologist"), // admin, psychologist, receptionist
  status: text("status").notNull().default("active"), // active, inactive, pending
  profileImage: text("profile_image"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  profileImage: true,
  googleId: true,
  avatarUrl: true,
});

// Psychologist specific info
export const psychologists = pgTable("psychologists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  specialization: text("specialization"),
  bio: text("bio"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
});

export const insertPsychologistSchema = createInsertSchema(psychologists).pick({
  userId: true,
  specialization: true,
  bio: true,
  hourlyRate: true,
}).extend({
  hourlyRate: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ])
});

// Rooms
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  hasWifi: boolean("has_wifi").notNull().default(true),
  hasAirConditioning: boolean("has_air_conditioning").notNull().default(true),
  squareMeters: integer("square_meters"),
  imageUrl: text("image_url"),
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  capacity: true,
  hasWifi: true,
  hasAirConditioning: true,
  squareMeters: true,
  imageUrl: true,
});

// Appointments
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientName: text("patient_name").notNull(),
  psychologistId: integer("psychologist_id").notNull(),
  roomId: integer("room_id").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, confirmed, canceled, completed, pending-confirmation (para agendamentos rápidos via WhatsApp)
  notes: text("notes"),
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  patientName: true,
  psychologistId: true,
  roomId: true,
  date: true,
  startTime: true,
  endTime: true,
  status: true,
  notes: true,
});

// Finances
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // income, expense
  category: text("category").notNull(),
  date: date("date").notNull(),
  responsibleId: integer("responsible_id").notNull(),
  relatedAppointmentId: integer("related_appointment_id"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  description: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  responsibleId: true,
  relatedAppointmentId: true,
}).extend({
  amount: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ])
});

// Room bookings
export const roomBookings = pgTable("room_bookings", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  psychologistId: integer("psychologist_id").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  purpose: text("purpose"),
});

export const insertRoomBookingSchema = createInsertSchema(roomBookings).pick({
  roomId: true,
  psychologistId: true,
  date: true,
  startTime: true,
  endTime: true,
  purpose: true,
});

// Permissions
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  permissionId: integer("permission_id").notNull(),
});

export const insertPermissionSchema = createInsertSchema(permissions).pick({
  name: true,
  description: true,
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).pick({
  role: true,
  permissionId: true,
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  psychologist: one(psychologists, {
    fields: [users.id],
    references: [psychologists.userId],
  }),
  transactions: many(transactions, {
    relationName: "userTransactions",
  }),
  invoices: many(invoices, {
    relationName: "userInvoices",
  }),
}));

export const psychologistsRelations = relations(psychologists, ({ one, many }) => ({
  user: one(users, {
    fields: [psychologists.userId],
    references: [users.id],
  }),
  appointments: many(appointments, {
    relationName: "psychologistAppointments",
  }),
  roomBookings: many(roomBookings, {
    relationName: "psychologistRoomBookings",
  }),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  appointments: many(appointments, {
    relationName: "roomAppointments",
  }),
  bookings: many(roomBookings, {
    relationName: "roomBookings",
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  psychologist: one(psychologists, {
    fields: [appointments.psychologistId],
    references: [psychologists.id],
  }),
  room: one(rooms, {
    fields: [appointments.roomId],
    references: [rooms.id],
  }),
  transactions: many(transactions, {
    relationName: "appointmentTransactions",
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  responsibleUser: one(users, {
    fields: [transactions.responsibleId],
    references: [users.id],
    relationName: "userTransactions",
  }),
  appointment: one(appointments, {
    fields: [transactions.relatedAppointmentId],
    references: [appointments.id],
    relationName: "appointmentTransactions",
  }),
}));

export const roomBookingsRelations = relations(roomBookings, ({ one }) => ({
  room: one(rooms, {
    fields: [roomBookings.roomId],
    references: [rooms.id],
    relationName: "roomBookings",
  }),
  psychologist: one(psychologists, {
    fields: [roomBookings.psychologistId],
    references: [psychologists.id],
    relationName: "psychologistRoomBookings",
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions, {
    relationName: "permissionRoles",
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
    relationName: "permissionRoles",
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Psychologist = typeof psychologists.$inferSelect;
export type InsertPsychologist = z.infer<typeof insertPsychologistSchema>;

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type RoomBooking = typeof roomBookings.$inferSelect;
export type InsertRoomBooking = z.infer<typeof insertRoomBookingSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// Google Calendar Tokens
export const googleTokens = pgTable("google_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiryDate: timestamp("expiry_date").notNull(),
  calendarId: text("calendar_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGoogleTokenSchema = createInsertSchema(googleTokens).pick({
  userId: true,
  accessToken: true,
  refreshToken: true,
  expiryDate: true,
  calendarId: true,
});

export const googleTokensRelations = relations(googleTokens, ({ one }) => ({
  user: one(users, {
    fields: [googleTokens.userId],
    references: [users.id],
  }),
}));

export type GoogleToken = typeof googleTokens.$inferSelect;
export type InsertGoogleToken = z.infer<typeof insertGoogleTokenSchema>;

// Appointments to Google Calendar mapping
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  googleEventId: text("google_event_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  lastSynced: timestamp("last_synced").notNull().defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).pick({
  appointmentId: true,
  googleEventId: true,
  userId: true,
});

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  appointment: one(appointments, {
    fields: [calendarEvents.appointmentId],
    references: [appointments.id],
  }),
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).pick({
  userId: true,
  token: true,
  expiresAt: true,
  used: true,
});

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;

// Invoices (Notas Fiscais)
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  referenceMonth: text("reference_month").notNull(), // Formato: YYYY-MM (ex: 2025-01)
  filePath: text("file_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // em bytes
  status: text("status").notNull().default("enviada"), // enviada, pendente, aprovada
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).pick({
  userId: true,
  referenceMonth: true,
  filePath: true,
  originalFilename: true,
  mimeType: true,
  fileSize: true,
  status: true,
});

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
    relationName: "userInvoices",
  }),
}));

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Export all patient record schemas
export * from "./patient-schema";

