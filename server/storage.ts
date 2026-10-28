import {
  users, type User, type InsertUser,
  psychologists, type Psychologist, type InsertPsychologist,
  rooms, type Room, type InsertRoom,
  appointments, type Appointment, type InsertAppointment,
  transactions, type Transaction, type InsertTransaction,
  roomBookings, type RoomBooking, type InsertRoomBooking,
  permissions, type Permission, type InsertPermission,
  rolePermissions, type RolePermission, type InsertRolePermission,
  passwordResetTokens, type PasswordResetToken, type InsertPasswordResetToken,
  invoices, type Invoice, type InsertInvoice,
  // Patient Record System
  patients, type Patient, type InsertPatient,
  medicalRecords, type MedicalRecord, type InsertMedicalRecord,
  clinicalSessions, type ClinicalSession, type InsertClinicalSession,
  patientDocuments, type PatientDocument, type InsertPatientDocument,
  psychologicalAssessments, type PsychologicalAssessment, type InsertPsychologicalAssessment,
  auditLogs, type AuditLog,
  sessionHistory, type SessionHistory,
  patientTransfers, type PatientTransfer,
  commissionPayoutConfigs, type CommissionPayoutConfig, type InsertCommissionPayoutConfig,
  commissions, type Commission,
  commissionItems, type CommissionItem,
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, gte, lte, sql, desc, ilike, or, getTableColumns } from "drizzle-orm";

const PostgresSessionStore = connectPg(session);

// company_id is optional on insert while the column still defaults to Empresa 1 (multi-empresa, fase 0).
type NewAuditLog = Omit<AuditLog, "id" | "createdAt" | "companyId"> & { companyId?: number | null };
type NewCommission = Omit<Commission, "id" | "createdAt" | "updatedAt" | "companyId"> & { companyId?: number | null };

// Listagens de notas fiscais não devem trazer o bytea da imagem (pode ter
// alguns MB por nota) — só as buscas de uma única nota (para servir a
// imagem/download) precisam da coluna completa.
const { imageData: _invoiceImageDataColumn, ...invoiceListColumns } = getTableColumns(invoices);

// Idem para usuários: getUser() roda em toda requisição autenticada
// (passport deserializeUser), então nunca deve carregar o bytea da foto de
// perfil — só a rota dedicada de servir a foto usa getUserProfilePhoto().
const { profileImageData: _userProfileImageDataColumn, ...userColumns } = getTableColumns(users);

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUserProfilePhoto(id: number): Promise<{ data: Buffer; mimeType: string } | undefined>;

  // Psychologist related methods
  getPsychologist(id: number): Promise<Psychologist | undefined>;
  getPsychologistByUserId(userId: number): Promise<Psychologist | undefined>;
  createPsychologist(psychologist: InsertPsychologist): Promise<Psychologist>;
  updatePsychologist(id: number, psychologist: Partial<Psychologist>): Promise<Psychologist | undefined>;
  deletePsychologist(id: number): Promise<boolean>;
  getAllPsychologists(): Promise<Psychologist[]>;

  // Room related methods
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<Room>): Promise<Room | undefined>;
  deleteRoom(id: number): Promise<boolean>;
  getAllRooms(): Promise<Room[]>;

  // Appointment related methods
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  getAllAppointments(): Promise<Appointment[]>;
  getAppointmentsByPsychologistId(psychologistId: number): Promise<Appointment[]>;
  getAppointmentsByDate(date: Date): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]>;
  getAppointmentsByPsychologistIdAndDateRange(psychologistId: number, startDate: Date, endDate: Date): Promise<Appointment[]>;

  // Transaction related methods
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByType(type: string): Promise<Transaction[]>;
  getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>;

  // Room booking related methods
  getRoomBooking(id: number): Promise<RoomBooking | undefined>;
  createRoomBooking(roomBooking: InsertRoomBooking): Promise<RoomBooking>;
  updateRoomBooking(id: number, roomBooking: Partial<RoomBooking>): Promise<RoomBooking | undefined>;
  deleteRoomBooking(id: number): Promise<boolean>;
  getAllRoomBookings(): Promise<RoomBooking[]>;
  getRoomBookingsByRoomId(roomId: number): Promise<RoomBooking[]>;
  getRoomBookingsByDate(date: Date): Promise<RoomBooking[]>;
  getRoomBookingsByDateRange(startDate: Date, endDate: Date): Promise<RoomBooking[]>;
  checkRoomAvailability(roomId: number, date: Date, startTime: string, endTime: string): Promise<boolean>;

  // Permission related methods
  getPermission(id: number): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: number, permission: Partial<Permission>): Promise<Permission | undefined>;
  deletePermission(id: number): Promise<boolean>;
  getAllPermissions(): Promise<Permission[]>;

  // Role permission related methods
  getRolePermission(id: number): Promise<RolePermission | undefined>;
  createRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission>;
  updateRolePermission(id: number, rolePermission: Partial<RolePermission>): Promise<RolePermission | undefined>;
  deleteRolePermission(id: number): Promise<boolean>;
  getAllRolePermissions(): Promise<RolePermission[]>;
  getRolePermissionsByRole(role: string): Promise<RolePermission[]>;

  // Invoice related methods (NFS-e)
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;
  getInvoicesByUserId(userId: number, opts?: { limit?: number; offset?: number; dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string; search?: string }): Promise<{ invoices: Omit<Invoice, "imageData">[]; total: number }>;
  getInvoicesSummary(psychologistId: number, opts?: { dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string }): Promise<{ totalCount: number; sumValorServicos: string; sumValorLiquido: string }>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByReferenceMonth(referenceMonth: string): Promise<Invoice[]>;
  getInvoiceByUserAndMonth(userId: number, referenceMonth: string): Promise<Invoice | undefined>;
  getInvoicesAdmin(opts?: { limit?: number; offset?: number; psychologistId?: number; dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string; search?: string }): Promise<{ invoices: (Omit<Invoice, "imageData"> & { user: User })[]; total: number }>;
  getInvoicesSummaryAdmin(opts?: { psychologistId?: number; dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string }): Promise<{ totalCount: number; sumValorServicos: string; sumValorLiquido: string }>;

  // Patient Record System Methods
  // Patients
  getPatient(id: number): Promise<Patient | undefined>;
  getPatientByCpf(cpf: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<Patient>): Promise<Patient | undefined>;
  listPatients(activeOnly?: boolean): Promise<Patient[]>;

  // Medical Records
  getMedicalRecordByPatientId(patientId: number): Promise<MedicalRecord | undefined>;
  createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord>;
  updateMedicalRecord(id: number, record: Partial<MedicalRecord>): Promise<MedicalRecord | undefined>;

  // Clinical Sessions
  getSession(id: number): Promise<ClinicalSession | undefined>;
  createSession(session: InsertClinicalSession): Promise<ClinicalSession>;
  updateSession(id: number, session: Partial<ClinicalSession>): Promise<ClinicalSession | undefined>;
  listSessionsByPatientId(patientId: number): Promise<ClinicalSession[]>;

  // Documents
  getDocument(id: number): Promise<PatientDocument | undefined>;
  createDocument(document: InsertPatientDocument & { uploadedBy: number; fileData: Buffer }): Promise<PatientDocument>;
  listDocumentsByPatientId(patientId: number): Promise<Omit<PatientDocument, "fileData" | "aiSummary" | "aiSummaryModel">[]>;
  deleteDocument(id: number): Promise<boolean>;
  saveDocumentSummary(id: number, summary: string, model: string): Promise<PatientDocument | undefined>;

  // Assessments
  getAssessment(id: number): Promise<PsychologicalAssessment | undefined>;
  createAssessment(assessment: InsertPsychologicalAssessment): Promise<PsychologicalAssessment>;
  listAssessmentsByPatientId(patientId: number): Promise<PsychologicalAssessment[]>;

  // Audit & History
  createAuditLog(log: NewAuditLog): Promise<AuditLog>;
  listAuditLogsByPatientId(patientId: number): Promise<AuditLog[]>;
  getSessionHistory(sessionId: number): Promise<SessionHistory[]>;
  getInvoiceWithUser(id: number): Promise<(Invoice & { user: User }) | undefined>;
  getAllInvoicesWithUsers(): Promise<(Invoice & { user: User })[]>;

  // Patient Transfers
  transferPatient(data: {
    patientId: number;
    fromPsychologistId: number | null;
    toPsychologistId: number;
    transferredByAdminId: number;
    reason: string | null;
  }): Promise<PatientTransfer>;
  listTransfersByPatientId(patientId: number): Promise<PatientTransfer[]>;

  // Commission methods
  listCommissionPayoutConfigs(psychologistId?: number): Promise<CommissionPayoutConfig[]>;
  getActiveCommissionPayoutConfig(psychologistId: number, forDate: string): Promise<CommissionPayoutConfig | undefined>;
  createCommissionPayoutConfig(data: InsertCommissionPayoutConfig): Promise<CommissionPayoutConfig>;
  updateCommissionPayoutConfig(id: number, data: Partial<InsertCommissionPayoutConfig>): Promise<CommissionPayoutConfig | undefined>;
  listCommissions(filters?: { psychologistId?: number; status?: string; periodStart?: string; periodEnd?: string; exactPeriod?: { periodStart: string; periodEnd: string } }): Promise<Commission[]>;
  getCommission(id: number): Promise<Commission | undefined>;
  createCommission(data: NewCommission): Promise<Commission>;
  updateCommission(id: number, data: Partial<Commission>): Promise<Commission | undefined>;
  listCommissionItems(commissionId: number): Promise<CommissionItem[]>;
  createCommissionItems(items: Omit<CommissionItem, "id">[]): Promise<CommissionItem[]>;
  getCommissionDashboard(month: string): Promise<{ totalPendente: string; totalPago: string; numPsicologas: number; numLocacoes: number }>;

  // Session store
  sessionStore: session.Store;
  getUserByEmail: (email: string) => Promise<User | undefined>;
  getUserByGoogleId: (googleId: string) => Promise<User | undefined>;
  savePasswordResetToken: (userId: number, token: string, expiresAt: Date) => Promise<void>;
  getPasswordResetToken: (token: string) => Promise<PasswordResetToken | undefined>;
  invalidatePasswordResetToken: (token: string) => Promise<void>;
  updateUserPassword: (userId: number, hashedPassword: string) => Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      // connect-pg-simple's types expect a `pg.Pool`; @neondatabase/serverless's
      // Pool only differs in internal/private fields it never touches
      // (it just calls .query()), so this is safe at runtime.
      pool: pool as any,
      createTableIfMissing: true
    });
  }

  // User methods
  // Nota: os métodos de leitura abaixo omitem propositalmente profileImageData
  // (bytea) do select — getUser() em particular roda a cada requisição
  // autenticada via passport deserializeUser, então nunca deve trazer o
  // binário da foto. Quem precisa da foto usa getUserProfilePhoto().
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select(userColumns).from(users).where(eq(users.id, id));
    return user as User | undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select(userColumns).from(users).where(eq(users.username, username));
    return user as User | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const [deletedUser] = await db.delete(users).where(eq(users.id, id)).returning();
    return !!deletedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select(userColumns).from(users) as User[];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select(userColumns).from(users).where(eq(users.email, email));
    return user as User | undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select(userColumns).from(users).where(eq(users.googleId, googleId));
    return user as User | undefined;
  }

  async getUserProfilePhoto(id: number): Promise<{ data: Buffer; mimeType: string } | undefined> {
    const [row] = await db.select({
      data: users.profileImageData,
      mimeType: users.profileImageMimeType,
    }).from(users).where(eq(users.id, id));
    if (!row || !row.data) return undefined;
    return { data: row.data, mimeType: row.mimeType || "image/jpeg" };
  }

  // Password Reset
  async savePasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false
    });
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    console.log('🔍 [DB] Buscando token:', token.substring(0, 8) + '...');

    const [resetToken] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));

    if (!resetToken) {
      console.log('❌ [DB] Token não encontrado');
      return undefined;
    }

    console.log('🗺 [DB] Token encontrado:', {
      userId: resetToken.userId,
      expiresAt: resetToken.expiresAt,
      used: resetToken.used,
      isExpired: new Date(resetToken.expiresAt) < new Date(),
      currentTime: new Date()
    });

    // Check if token has expired or been used
    if (new Date(resetToken.expiresAt) < new Date() || resetToken.used) {
      console.log('❌ [DB] Token expirado ou já usado');
      return undefined;
    }

    return resetToken;
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<boolean> {
    const [updatedUser] = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return !!updatedUser;
  }

  // Psychologist methods
  async getPsychologist(id: number): Promise<Psychologist | undefined> {
    const [psych] = await db.select().from(psychologists).where(eq(psychologists.id, id));
    return psych;
  }

  async getPsychologistByUserId(userId: number): Promise<Psychologist | undefined> {
    const [psych] = await db.select().from(psychologists).where(eq(psychologists.userId, userId));
    return psych;
  }

  async createPsychologist(psychologist: InsertPsychologist): Promise<Psychologist> {
    const [newPsych] = await db.insert(psychologists).values({
      ...psychologist,
      hourlyRate: psychologist.hourlyRate.toString()
    }).returning();
    return newPsych;
  }

  async updatePsychologist(id: number, data: Partial<Psychologist>): Promise<Psychologist | undefined> {
    const [updated] = await db.update(psychologists).set(data).where(eq(psychologists.id, id)).returning();
    return updated;
  }

  async deletePsychologist(id: number): Promise<boolean> {
    const [deleted] = await db.delete(psychologists).where(eq(psychologists.id, id)).returning();
    return !!deleted;
  }

  async getAllPsychologists(): Promise<Psychologist[]> {
    return await db.select().from(psychologists);
  }

  // Room methods
  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, data: Partial<Room>): Promise<Room | undefined> {
    const [updated] = await db.update(rooms).set(data).where(eq(rooms.id, id)).returning();
    return updated;
  }

  async deleteRoom(id: number): Promise<boolean> {
    const [deleted] = await db.delete(rooms).where(eq(rooms.id, id)).returning();
    return !!deleted;
  }

  async getAllRooms(): Promise<Room[]> {
    return await db.select().from(rooms);
  }

  // Appointment methods
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const [appt] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appt;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppt] = await db.insert(appointments).values(appointment).returning();
    return newAppt;
  }

  async updateAppointment(id: number, data: Partial<Appointment>): Promise<Appointment | undefined> {
    const [updated] = await db.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return updated;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    const [deleted] = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return !!deleted;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments);
  }

  async getAppointmentsByPsychologistId(psychologistId: number): Promise<Appointment[]> {
    return await db.select().from(appointments).where(eq(appointments.psychologistId, psychologistId));
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const all = await this.getAllAppointments();
    const dateString = date.toISOString().split('T')[0];
    return all.filter(a => new Date(a.date).toISOString().split('T')[0] === dateString);
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        gte(appointments.date, startDate.toISOString()),
        lte(appointments.date, endDate.toISOString())
      ));
  }

  async getAppointmentsByPsychologistIdAndDateRange(psychologistId: number, startDate: Date, endDate: Date): Promise<Appointment[]> {
    return await db.select().from(appointments)
      .where(and(
        eq(appointments.psychologistId, psychologistId),
        gte(appointments.date, startDate.toISOString()),
        lte(appointments.date, endDate.toISOString())
      ));
  }

  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    return tx;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values({
      ...transaction,
      amount: transaction.amount.toString()
    }).returning();
    return newTx;
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined> {
    const [updated] = await db.update(transactions).set(data).where(eq(transactions.id, id)).returning();
    return updated;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const [deleted] = await db.delete(transactions).where(eq(transactions.id, id)).returning();
    return !!deleted;
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }

  async getTransactionsByType(type: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.type, type));
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(and(
        gte(transactions.date, startDate.toISOString()),
        lte(transactions.date, endDate.toISOString())
      ));
  }

  // RoomBooking methods
  async getRoomBooking(id: number): Promise<RoomBooking | undefined> {
    const [booking] = await db.select().from(roomBookings).where(eq(roomBookings.id, id));
    return booking;
  }

  async createRoomBooking(booking: InsertRoomBooking): Promise<RoomBooking> {
    const [newBooking] = await db.insert(roomBookings).values(booking).returning();
    return newBooking;
  }

  async updateRoomBooking(id: number, data: Partial<RoomBooking>): Promise<RoomBooking | undefined> {
    const [updated] = await db.update(roomBookings).set(data).where(eq(roomBookings.id, id)).returning();
    return updated;
  }

  async deleteRoomBooking(id: number): Promise<boolean> {
    const [deleted] = await db.delete(roomBookings).where(eq(roomBookings.id, id)).returning();
    return !!deleted;
  }

  async getAllRoomBookings(): Promise<RoomBooking[]> {
    return await db.select().from(roomBookings);
  }

  async getRoomBookingsByRoomId(roomId: number): Promise<RoomBooking[]> {
    return await db.select().from(roomBookings).where(eq(roomBookings.roomId, roomId));
  }

  async getRoomBookingsByDate(date: Date): Promise<RoomBooking[]> {
    const all = await this.getAllRoomBookings();
    const dateString = date.toISOString().split('T')[0];
    return all.filter(b => new Date(b.date).toISOString().split('T')[0] === dateString);
  }

  async getRoomBookingsByDateRange(startDate: Date, endDate: Date): Promise<RoomBooking[]> {
    return await db.select().from(roomBookings)
      .where(and(
        gte(roomBookings.date, startDate.toISOString()),
        lte(roomBookings.date, endDate.toISOString())
      ));
  }

  async checkRoomAvailability(roomId: number, date: Date, startTime: string, endTime: string): Promise<boolean> {
    const bookings = await this.getRoomBookingsByDate(date);
    const hasOverlap = bookings.some(booking => {
      if (booking.roomId !== roomId) return false;
      return (startTime < booking.endTime && endTime > booking.startTime);
    });
    return !hasOverlap;
  }

  // Permission methods
  async getPermission(id: number): Promise<Permission | undefined> {
    const [perm] = await db.select().from(permissions).where(eq(permissions.id, id));
    return perm;
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [newPerm] = await db.insert(permissions).values(permission).returning();
    return newPerm;
  }

  async updatePermission(id: number, data: Partial<Permission>): Promise<Permission | undefined> {
    const [updated] = await db.update(permissions).set(data).where(eq(permissions.id, id)).returning();
    return updated;
  }

  async deletePermission(id: number): Promise<boolean> {
    const [deleted] = await db.delete(permissions).where(eq(permissions.id, id)).returning();
    return !!deleted;
  }

  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions);
  }

  // RolePermission methods
  async getRolePermission(id: number): Promise<RolePermission | undefined> {
    const [rp] = await db.select().from(rolePermissions).where(eq(rolePermissions.id, id));
    return rp;
  }

  async createRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const [newRp] = await db.insert(rolePermissions).values(rolePermission).returning();
    return newRp;
  }

  async updateRolePermission(id: number, data: Partial<RolePermission>): Promise<RolePermission | undefined> {
    const [updated] = await db.update(rolePermissions).set(data).where(eq(rolePermissions.id, id)).returning();
    return updated;
  }

  async deleteRolePermission(id: number): Promise<boolean> {
    const [deleted] = await db.delete(rolePermissions).where(eq(rolePermissions.id, id)).returning();
    return !!deleted;
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions);
  }

  async getRolePermissionsByRole(role: string): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
  }

  // Invoice methods (NFS-e)
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice!;
  }

  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updated] = await db.update(invoices).set({ ...data, updatedAt: new Date() }).where(eq(invoices.id, id)).returning();
    return updated;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const [deleted] = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return !!deleted;
  }

  async getInvoicesByUserId(psychologistId: number, opts?: { limit?: number; offset?: number; dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string; search?: string }): Promise<{ invoices: Omit<Invoice, "imageData">[]; total: number }> {
    const conditions = [eq(invoices.psychologistId, psychologistId)];
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    if (opts?.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(ilike(invoices.tomadorNome, term), ilike(invoices.tomadorCpfCnpj, term))!);
    }
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(invoices).where(whereClause);
    const total = totalResult[0]?.count ?? 0;
    let query = db.select(invoiceListColumns).from(invoices).where(whereClause).orderBy(desc(invoices.dataUpload));
    if (opts?.limit != null) query = query.limit(opts.limit) as typeof query;
    if (opts?.offset != null) query = query.offset(opts.offset) as typeof query;
    const rows = await query;
    return { invoices: rows, total };
  }

  async getInvoicesSummary(psychologistId: number, opts?: { dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string }): Promise<{ totalCount: number; sumValorServicos: string; sumValorLiquido: string }> {
    const conditions = [eq(invoices.psychologistId, psychologistId)];
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const [row] = await db.select({
      totalCount: sql<number>`count(*)::int`,
      sumValorServicos: sql<string>`coalesce(sum(${invoices.valorServicos})::text, '0')`,
      sumValorLiquido: sql<string>`coalesce(sum(${invoices.valorLiquido})::text, '0')`,
    }).from(invoices).where(whereClause);
    return { totalCount: row?.totalCount ?? 0, sumValorServicos: row?.sumValorServicos ?? "0", sumValorLiquido: row?.sumValorLiquido ?? "0" };
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoicesByReferenceMonth(_referenceMonth: string): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoiceByUserAndMonth(_userId: number, _referenceMonth: string): Promise<Invoice | undefined> {
    return undefined;
  }

  async getInvoicesAdmin(opts?: { limit?: number; offset?: number; psychologistId?: number; dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string; search?: string }): Promise<{ invoices: (Omit<Invoice, "imageData"> & { user: User })[]; total: number }> {
    const conditions: ReturnType<typeof eq>[] = [];
    if (opts?.psychologistId != null) conditions.push(eq(invoices.psychologistId, opts.psychologistId));
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    if (opts?.search) {
      const term = `%${opts.search}%`;
      conditions.push(or(ilike(invoices.tomadorNome, term), ilike(invoices.tomadorCpfCnpj, term))!);
    }
    const whereClause = conditions.length === 0 ? sql`1=1` : conditions.length === 1 ? conditions[0] : and(...conditions);
    const totalCountResult = await db.select({ count: sql<number>`count(*)::int` }).from(invoices).where(whereClause);
    const totalCount = totalCountResult[0]?.count ?? 0;
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    const result = await db.select({ invoices: invoiceListColumns, users: userColumns }).from(invoices).innerJoin(users, eq(invoices.psychologistId, users.id)).where(whereClause).orderBy(desc(invoices.dataUpload)).limit(limit).offset(offset);
    const invoicesWithUsers = result.map((r) => ({ ...r.invoices, user: r.users as User }));
    return { invoices: invoicesWithUsers, total: totalCount };
  }

  async getInvoicesSummaryAdmin(opts?: { psychologistId?: number; dataEmissaoFrom?: string; dataEmissaoTo?: string; status?: string }): Promise<{ totalCount: number; sumValorServicos: string; sumValorLiquido: string }> {
    const conditions: ReturnType<typeof eq>[] = [];
    if (opts?.psychologistId != null) conditions.push(eq(invoices.psychologistId, opts.psychologistId));
    if (opts?.dataEmissaoFrom) conditions.push(gte(invoices.dataEmissao, opts.dataEmissaoFrom));
    if (opts?.dataEmissaoTo) conditions.push(lte(invoices.dataEmissao, opts.dataEmissaoTo));
    if (opts?.status) conditions.push(eq(invoices.status, opts.status));
    const whereClause = conditions.length === 0 ? sql`1=1` : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [row] = await db.select({ totalCount: sql<number>`count(*)::int`, sumValorServicos: sql<string>`coalesce(sum(${invoices.valorServicos})::text, '0')`, sumValorLiquido: sql<string>`coalesce(sum(${invoices.valorLiquido})::text, '0')` }).from(invoices).where(whereClause);
    return { totalCount: row?.totalCount ?? 0, sumValorServicos: row?.sumValorServicos ?? "0", sumValorLiquido: row?.sumValorLiquido ?? "0" };
  }

  async getInvoiceWithUser(id: number): Promise<(Invoice & { user: User }) | undefined> {
    const result = await db.select().from(invoices).innerJoin(users, eq(invoices.psychologistId, users.id)).where(eq(invoices.id, id));
    if (result.length === 0) return undefined;
    return { ...result[0].invoices, user: result[0].users };
  }

  async getAllInvoicesWithUsers(): Promise<(Invoice & { user: User })[]> {
    const result = await db.select().from(invoices).innerJoin(users, eq(invoices.psychologistId, users.id)).orderBy(desc(invoices.dataUpload));
    return result.map((r) => ({ ...r.invoices, user: r.users }));
  }

  // Patient Record System Implementation

  // Patients
  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByCpf(cpf: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.cpf, cpf));
    return patient;
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async updatePatient(id: number, data: Partial<Patient>): Promise<Patient | undefined> {
    const [updated] = await db.update(patients).set(data).where(eq(patients.id, id)).returning();
    return updated;
  }

  async listPatients(activeOnly: boolean = true): Promise<Patient[]> {
    let query = db.select().from(patients);
    if (activeOnly) {
      // @ts-ignore - Status field exists but might be inferred incorrectly sometimes
      return await db.select().from(patients).where(eq(patients.status, 'active'));
    }
    return await query;
  }

  // Medical Records
  async getMedicalRecordByPatientId(patientId: number): Promise<MedicalRecord | undefined> {
    const [record] = await db.select().from(medicalRecords).where(eq(medicalRecords.patientId, patientId));
    return record;
  }

  async createMedicalRecord(record: InsertMedicalRecord): Promise<MedicalRecord> {
    const [newRecord] = await db.insert(medicalRecords).values(record).returning();
    return newRecord;
  }

  async updateMedicalRecord(id: number, record: Partial<MedicalRecord>): Promise<MedicalRecord | undefined> {
    const [updated] = await db.update(medicalRecords).set(record).where(eq(medicalRecords.id, id)).returning();
    return updated;
  }

  // Clinical Sessions
  async getSession(id: number): Promise<ClinicalSession | undefined> {
    const [session] = await db.select().from(clinicalSessions).where(eq(clinicalSessions.id, id));
    return session;
  }

  async createSession(session: InsertClinicalSession): Promise<ClinicalSession> {
    const [newSession] = await db.insert(clinicalSessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: number, session: Partial<ClinicalSession>): Promise<ClinicalSession | undefined> {
    const [updated] = await db.update(clinicalSessions).set(session).where(eq(clinicalSessions.id, id)).returning();
    return updated;
  }

  async listSessionsByPatientId(patientId: number): Promise<ClinicalSession[]> {
    return await db.select().from(clinicalSessions)
      .where(eq(clinicalSessions.patientId, patientId))
      .orderBy(sql`${clinicalSessions.sessionDate} DESC, ${clinicalSessions.sessionTime} DESC`);
  }

  // Documents
  async getDocument(id: number): Promise<PatientDocument | undefined> {
    const [doc] = await db.select().from(patientDocuments).where(eq(patientDocuments.id, id));
    return doc;
  }

  async createDocument(document: InsertPatientDocument & { uploadedBy: number; fileData: Buffer }): Promise<PatientDocument> {
    const [newDoc] = await db.insert(patientDocuments).values(document).returning();
    return newDoc;
  }

  async listDocumentsByPatientId(patientId: number): Promise<Omit<PatientDocument, "fileData" | "aiSummary" | "aiSummaryModel">[]> {
    return await db.select({
      id: patientDocuments.id,
      patientId: patientDocuments.patientId,
      documentType: patientDocuments.documentType,
      documentName: patientDocuments.documentName,
      filePath: patientDocuments.filePath,
      fileSize: patientDocuments.fileSize,
      mimeType: patientDocuments.mimeType,
      uploadedBy: patientDocuments.uploadedBy,
      createdAt: patientDocuments.createdAt,
      // Only the date: lets the UI show "Ver resumo" without shipping the summary text
      aiSummaryAt: patientDocuments.aiSummaryAt,
    }).from(patientDocuments).where(eq(patientDocuments.patientId, patientId));
  }

  async saveDocumentSummary(id: number, summary: string, model: string): Promise<PatientDocument | undefined> {
    const [doc] = await db
      .update(patientDocuments)
      .set({ aiSummary: summary, aiSummaryAt: new Date(), aiSummaryModel: model })
      .where(eq(patientDocuments.id, id))
      .returning();
    return doc;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const [deleted] = await db.delete(patientDocuments).where(eq(patientDocuments.id, id)).returning();
    return !!deleted;
  }

  // Assessments
  async getAssessment(id: number): Promise<PsychologicalAssessment | undefined> {
    const [assessment] = await db.select().from(psychologicalAssessments).where(eq(psychologicalAssessments.id, id));
    return assessment;
  }

  async createAssessment(assessment: InsertPsychologicalAssessment): Promise<PsychologicalAssessment> {
    const [newAssessment] = await db.insert(psychologicalAssessments).values(assessment).returning();
    return newAssessment;
  }

  async listAssessmentsByPatientId(patientId: number): Promise<PsychologicalAssessment[]> {
    return await db.select().from(psychologicalAssessments).where(eq(psychologicalAssessments.patientId, patientId));
  }

  // Audit & History
  async createAuditLog(log: NewAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async listAuditLogsByPatientId(patientId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(eq(auditLogs.patientId, patientId))
      .orderBy(sql`${auditLogs.createdAt} DESC`);
  }

  async getSessionHistory(sessionId: number): Promise<SessionHistory[]> {
    return await db.select().from(sessionHistory)
      .where(eq(sessionHistory.sessionId, sessionId))
      .orderBy(sql`${sessionHistory.version} DESC`);
  }

  // Patient Transfers
  async transferPatient(data: {
    patientId: number;
    fromPsychologistId: number | null;
    toPsychologistId: number;
    transferredByAdminId: number;
    reason: string | null;
  }): Promise<PatientTransfer> {
    // Transacão atômica: UPDATE patients + INSERT patient_transfers
    let transfer!: PatientTransfer;
    await db.transaction(async (tx) => {
      // 1. Atualiza vínculo do paciente
      await tx.update(patients)
        .set({ psychologistId: data.toPsychologistId })
        .where(eq(patients.id, data.patientId));
      // 2. Registra histórico imutável
      const [newTransfer] = await tx.insert(patientTransfers).values({
        patientId: data.patientId,
        fromPsychologistId: data.fromPsychologistId,
        toPsychologistId: data.toPsychologistId,
        transferredByAdminId: data.transferredByAdminId,
        reason: data.reason,
      }).returning();
      transfer = newTransfer;
    });
    return transfer;
  }

  async listTransfersByPatientId(patientId: number): Promise<PatientTransfer[]> {
    return await db.select().from(patientTransfers)
      .where(eq(patientTransfers.patientId, patientId))
      .orderBy(sql`${patientTransfers.createdAt} DESC`);
  }

  async listCommissionPayoutConfigs(psychologistId?: number): Promise<CommissionPayoutConfig[]> {
    if (psychologistId !== undefined) {
      return await db.select().from(commissionPayoutConfigs)
        .where(eq(commissionPayoutConfigs.psychologistId, psychologistId))
        .orderBy(sql`${commissionPayoutConfigs.validFrom} DESC`);
    }
    return await db.select().from(commissionPayoutConfigs)
      .orderBy(sql`${commissionPayoutConfigs.validFrom} DESC`);
  }

  async getActiveCommissionPayoutConfig(psychologistId: number, forDate: string): Promise<CommissionPayoutConfig | undefined> {
    const results = await db.select().from(commissionPayoutConfigs)
      .where(
        and(
          eq(commissionPayoutConfigs.psychologistId, psychologistId),
          lte(commissionPayoutConfigs.validFrom, forDate),
          or(
            sql`${commissionPayoutConfigs.validUntil} IS NULL`,
            gte(commissionPayoutConfigs.validUntil, forDate)
          )
        )
      )
      .orderBy(sql`${commissionPayoutConfigs.validFrom} DESC`)
      .limit(1);
    return results[0];
  }

  async createCommissionPayoutConfig(data: InsertCommissionPayoutConfig): Promise<CommissionPayoutConfig> {
    const [config] = await db.insert(commissionPayoutConfigs).values(data).returning();
    return config;
  }

  async updateCommissionPayoutConfig(id: number, data: Partial<InsertCommissionPayoutConfig>): Promise<CommissionPayoutConfig | undefined> {
    const [updated] = await db.update(commissionPayoutConfigs).set(data).where(eq(commissionPayoutConfigs.id, id)).returning();
    return updated;
  }

  async listCommissions(filters?: { psychologistId?: number; status?: string; periodStart?: string; periodEnd?: string; exactPeriod?: { periodStart: string; periodEnd: string } }): Promise<Commission[]> {
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
      return await db.select().from(commissions).where(and(...conditions)).orderBy(sql`${commissions.createdAt} DESC`);
    }
    return await db.select().from(commissions).orderBy(sql`${commissions.createdAt} DESC`);
  }

  async getCommission(id: number): Promise<Commission | undefined> {
    const [c] = await db.select().from(commissions).where(eq(commissions.id, id));
    return c;
  }

  async createCommission(data: NewCommission): Promise<Commission> {
    const [c] = await db.insert(commissions).values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return c;
  }

  async updateCommission(id: number, data: Partial<Commission>): Promise<Commission | undefined> {
    const [updated] = await db.update(commissions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(commissions.id, id))
      .returning();
    return updated;
  }

  async listCommissionItems(commissionId: number): Promise<CommissionItem[]> {
    return await db.select().from(commissionItems)
      .where(eq(commissionItems.commissionId, commissionId))
      .orderBy(sql`${commissionItems.bookingDate} ASC`);
  }

  async createCommissionItems(items: Omit<CommissionItem, "id">[]): Promise<CommissionItem[]> {
    if (items.length === 0) return [];
    return await db.insert(commissionItems).values(items).returning();
  }

  async getCommissionDashboard(month: string): Promise<{ totalPendente: string; totalPago: string; numPsicologas: number; numLocacoes: number }> {
    const [year, mon] = month.split("-");
    const periodStart = `${year}-${mon}-01`;
    const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
    const periodEnd = `${year}-${mon}-${lastDay.toString().padStart(2, "0")}`;

    const rows = await db.select().from(commissions)
      .where(
        and(
          gte(commissions.periodStart, periodStart),
          lte(commissions.periodEnd, periodEnd)
        )
      );

    const totalPendente = rows
      .filter(r => r.status === "pending")
      .reduce((acc, r) => acc + parseFloat(r.totalRepasse), 0);

    const totalPago = rows
      .filter(r => r.status === "paid")
      .reduce((acc, r) => acc + parseFloat(r.totalRepasse), 0);

    const numPsicologas = new Set(rows.map(r => r.psychologistId)).size;
    const numLocacoes = rows.reduce((acc, r) => acc + r.totalBookings, 0);

    return {
      totalPendente: totalPendente.toFixed(2),
      totalPago: totalPago.toFixed(2),
      numPsicologas,
      numLocacoes,
    };
  }
}

// Use memory storage for local development
// Use database storage for production
export const storage = new DatabaseStorage();