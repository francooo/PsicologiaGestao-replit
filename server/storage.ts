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
  sessionHistory, type SessionHistory
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

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

  // Invoice related methods
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  deleteInvoice(id: number): Promise<boolean>;
  getInvoicesByUserId(userId: number): Promise<Invoice[]>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByReferenceMonth(referenceMonth: string): Promise<Invoice[]>;
  getInvoicesByReferenceMonth(referenceMonth: string): Promise<Invoice[]>;
  getInvoiceByUserAndMonth(userId: number, referenceMonth: string): Promise<Invoice | undefined>;

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
  createDocument(document: InsertPatientDocument & { uploadedBy: number }): Promise<PatientDocument>;
  listDocumentsByPatientId(patientId: number): Promise<PatientDocument[]>;
  deleteDocument(id: number): Promise<boolean>;

  // Assessments
  getAssessment(id: number): Promise<PsychologicalAssessment | undefined>;
  createAssessment(assessment: InsertPsychologicalAssessment): Promise<PsychologicalAssessment>;
  listAssessmentsByPatientId(patientId: number): Promise<PsychologicalAssessment[]>;

  // Audit & History
  createAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog>;
  listAuditLogsByPatientId(patientId: number): Promise<AuditLog[]>;
  getSessionHistory(sessionId: number): Promise<SessionHistory[]>;
  getInvoiceWithUser(id: number): Promise<(Invoice & { user: User }) | undefined>;
  getAllInvoicesWithUsers(): Promise<(Invoice & { user: User })[]>;

  // Session store
  sessionStore: session.Store;
  getUserByEmail: (email: string) => Promise<User | undefined>;
  savePasswordResetToken: (userId: number, token: string, expiresAt: Date) => Promise<void>;
  getPasswordResetToken: (token: string) => Promise<PasswordResetToken | undefined>;
  invalidatePasswordResetToken: (token: string) => Promise<void>;
  updateUserPassword: (userId: number, hashedPassword: string) => Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private psychologists: Map<number, Psychologist>;
  private rooms: Map<number, Room>;
  private appointments: Map<number, Appointment>;
  private transactions: Map<number, Transaction>;
  private roomBookings: Map<number, RoomBooking>;
  private permissions: Map<number, Permission>;
  private rolePermissions: Map<number, RolePermission>;
  private passwordResetTokens: Map<string, PasswordResetToken>;
  private tokensFilePath: string;

  // For auto-incrementing IDs
  private userIdCounter: number = 1;
  private psychologistIdCounter: number = 1;
  private roomIdCounter: number = 1;
  private appointmentIdCounter: number = 1;
  private transactionIdCounter: number = 1;
  private roomBookingIdCounter: number = 1;
  private permissionIdCounter: number = 1;
  private rolePermissionIdCounter: number = 1;

  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.psychologists = new Map();
    this.rooms = new Map();
    this.appointments = new Map();
    this.transactions = new Map();
    this.roomBookings = new Map();
    this.permissions = new Map();
    this.rolePermissions = new Map();
    this.passwordResetTokens = new Map();
    this.tokensFilePath = path.join(process.cwd(), 'dev-tokens.json');

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    // Load persisted tokens on startup
    this.loadPersistedTokens();

    // Initialize with default permissions
    this.initDefaultData();
  }

  private initDefaultData() {
    // Create default permissions
    const defaultPermissions = [
      { name: "dashboard_view", description: "View dashboard" },
      { name: "appointments_view", description: "View appointments" },
      { name: "appointments_manage", description: "Manage appointments" },
      { name: "psychologists_view", description: "View psychologists" },
      { name: "psychologists_manage", description: "Manage psychologists" },
      { name: "rooms_view", description: "View rooms" },
      { name: "rooms_manage", description: "Manage rooms" },
      { name: "rooms_book", description: "Book rooms" },
      { name: "financial_view", description: "View financial information" },
      { name: "financial_manage", description: "Manage financial information" },
      { name: "permissions_view", description: "View permissions" },
      { name: "permissions_manage", description: "Manage permissions" }
    ];

    defaultPermissions.forEach(permission => {
      this.createPermission({
        name: permission.name,
        description: permission.description
      });
    });
  }

  private loadPersistedTokens() {
    try {
      if (fs.existsSync(this.tokensFilePath)) {
        const data = fs.readFileSync(this.tokensFilePath, 'utf8');
        const tokens = JSON.parse(data);

        for (const [token, tokenData] of Object.entries(tokens)) {
          // Convert date strings back to Date objects
          const resetToken = tokenData as any;
          resetToken.expiresAt = new Date(resetToken.expiresAt);
          resetToken.createdAt = new Date(resetToken.createdAt);

          // Only load non-expired tokens
          if (resetToken.expiresAt > new Date() && !resetToken.used) {
            this.passwordResetTokens.set(token, resetToken);
          }
        }

        console.log('💾 Tokens carregados do arquivo:', this.passwordResetTokens.size);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar tokens:', error);
    }
  }

  private persistTokens() {
    try {
      const tokensObj = Object.fromEntries(this.passwordResetTokens.entries());
      fs.writeFileSync(this.tokensFilePath, JSON.stringify(tokensObj, null, 2));
      console.log('💾 Token salvo no arquivo');
    } catch (error) {
      console.error('❌ Erro ao salvar tokens:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = {
      ...user,
      id,
      role: user.role || 'user',
      status: user.status || 'active',
      profileImage: user.profileImage || null
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Psychologist methods
  async getPsychologist(id: number): Promise<Psychologist | undefined> {
    return this.psychologists.get(id);
  }

  async getPsychologistByUserId(userId: number): Promise<Psychologist | undefined> {
    return Array.from(this.psychologists.values()).find(psych => psych.userId === userId);
  }

  async createPsychologist(psychologist: InsertPsychologist): Promise<Psychologist> {
    const id = this.psychologistIdCounter++;
    const newPsychologist: Psychologist = {
      ...psychologist,
      id,
      specialization: psychologist.specialization || null,
      bio: psychologist.bio || null,
      hourlyRate: psychologist.hourlyRate.toString()
    };
    this.psychologists.set(id, newPsychologist);
    return newPsychologist;
  }

  async updatePsychologist(id: number, psychologistData: Partial<Psychologist>): Promise<Psychologist | undefined> {
    const existingPsychologist = this.psychologists.get(id);
    if (!existingPsychologist) return undefined;

    const updatedPsychologist = { ...existingPsychologist, ...psychologistData };
    this.psychologists.set(id, updatedPsychologist);
    return updatedPsychologist;
  }

  async deletePsychologist(id: number): Promise<boolean> {
    return this.psychologists.delete(id);
  }

  async getAllPsychologists(): Promise<Psychologist[]> {
    return Array.from(this.psychologists.values());
  }

  // Room methods
  async getRoom(id: number): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const id = this.roomIdCounter++;
    const newRoom: Room = {
      ...room,
      id,
      hasWifi: room.hasWifi || false,
      hasAirConditioning: room.hasAirConditioning || false,
      squareMeters: room.squareMeters || null,
      imageUrl: room.imageUrl || null
    };
    this.rooms.set(id, newRoom);
    return newRoom;
  }

  async updateRoom(id: number, roomData: Partial<Room>): Promise<Room | undefined> {
    const existingRoom = this.rooms.get(id);
    if (!existingRoom) return undefined;

    const updatedRoom = { ...existingRoom, ...roomData };
    this.rooms.set(id, updatedRoom);
    return updatedRoom;
  }

  async deleteRoom(id: number): Promise<boolean> {
    return this.rooms.delete(id);
  }

  async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  // Appointment methods
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const id = this.appointmentIdCounter++;
    const newAppointment: Appointment = {
      ...appointment,
      id,
      status: appointment.status || 'scheduled',
      notes: appointment.notes || null
    };
    this.appointments.set(id, newAppointment);
    return newAppointment;
  }

  async updateAppointment(id: number, appointmentData: Partial<Appointment>): Promise<Appointment | undefined> {
    const existingAppointment = this.appointments.get(id);
    if (!existingAppointment) return undefined;

    const updatedAppointment = { ...existingAppointment, ...appointmentData };
    this.appointments.set(id, updatedAppointment);
    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }

  async getAppointmentsByPsychologistId(psychologistId: number): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter(appointment => appointment.psychologistId === psychologistId);
  }

  async getAppointmentsByDate(date: Date): Promise<Appointment[]> {
    const dateString = date.toISOString().split('T')[0];
    return Array.from(this.appointments.values())
      .filter(appointment => {
        const appointmentDate = new Date(appointment.date).toISOString().split('T')[0];
        return appointmentDate === dateString;
      });
  }

  async getAppointmentsByDateRange(startDate: Date, endDate: Date): Promise<Appointment[]> {
    return Array.from(this.appointments.values())
      .filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate >= startDate && appointmentDate <= endDate;
      });
  }

  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const newTransaction: Transaction = {
      ...transaction,
      id,
      amount: transaction.amount.toString(),
      relatedAppointmentId: transaction.relatedAppointmentId || null
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transactionData: Partial<Transaction>): Promise<Transaction | undefined> {
    const existingTransaction = this.transactions.get(id);
    if (!existingTransaction) return undefined;

    const updatedTransaction = { ...existingTransaction, ...transactionData };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async getTransactionsByType(type: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.type === type);
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
  }

  // Room booking methods
  async getRoomBooking(id: number): Promise<RoomBooking | undefined> {
    return this.roomBookings.get(id);
  }

  async createRoomBooking(roomBooking: InsertRoomBooking): Promise<RoomBooking> {
    const id = this.roomBookingIdCounter++;
    const newRoomBooking: RoomBooking = {
      ...roomBooking,
      id,
      purpose: roomBooking.purpose || null
    };
    this.roomBookings.set(id, newRoomBooking);
    return newRoomBooking;
  }

  async updateRoomBooking(id: number, roomBookingData: Partial<RoomBooking>): Promise<RoomBooking | undefined> {
    const existingRoomBooking = this.roomBookings.get(id);
    if (!existingRoomBooking) return undefined;

    const updatedRoomBooking = { ...existingRoomBooking, ...roomBookingData };
    this.roomBookings.set(id, updatedRoomBooking);
    return updatedRoomBooking;
  }

  async deleteRoomBooking(id: number): Promise<boolean> {
    return this.roomBookings.delete(id);
  }

  async getAllRoomBookings(): Promise<RoomBooking[]> {
    return Array.from(this.roomBookings.values());
  }

  async getRoomBookingsByRoomId(roomId: number): Promise<RoomBooking[]> {
    return Array.from(this.roomBookings.values())
      .filter(booking => booking.roomId === roomId);
  }

  async getRoomBookingsByDate(date: Date): Promise<RoomBooking[]> {
    const dateString = date.toISOString().split('T')[0];
    return Array.from(this.roomBookings.values())
      .filter(booking => {
        const bookingDate = new Date(booking.date).toISOString().split('T')[0];
        return bookingDate === dateString;
      });
  }

  async getRoomBookingsByDateRange(startDate: Date, endDate: Date): Promise<RoomBooking[]> {
    return Array.from(this.roomBookings.values())
      .filter(booking => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= startDate && bookingDate <= endDate;
      });
  }

  async checkRoomAvailability(roomId: number, date: Date, startTime: string, endTime: string): Promise<boolean> {
    const dateString = date.toISOString().split('T')[0];
    const bookingsOnDate = await this.getRoomBookingsByDate(date);

    // Check if there are any overlapping bookings
    const hasOverlap = bookingsOnDate.some(booking => {
      if (booking.roomId !== roomId) return false;

      const bookingStartTime = booking.startTime;
      const bookingEndTime = booking.endTime;

      // Check for overlap
      return (startTime < bookingEndTime && endTime > bookingStartTime);
    });

    return !hasOverlap;
  }

  // Permission methods
  async getPermission(id: number): Promise<Permission | undefined> {
    return this.permissions.get(id);
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const id = this.permissionIdCounter++;
    const newPermission: Permission = {
      ...permission,
      id,
      description: permission.description || null
    };
    this.permissions.set(id, newPermission);
    return newPermission;
  }

  async updatePermission(id: number, permissionData: Partial<Permission>): Promise<Permission | undefined> {
    const existingPermission = this.permissions.get(id);
    if (!existingPermission) return undefined;

    const updatedPermission = { ...existingPermission, ...permissionData };
    this.permissions.set(id, updatedPermission);
    return updatedPermission;
  }

  async deletePermission(id: number): Promise<boolean> {
    return this.permissions.delete(id);
  }

  async getAllPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  // Role permission methods
  async getRolePermission(id: number): Promise<RolePermission | undefined> {
    return this.rolePermissions.get(id);
  }

  async createRolePermission(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const id = this.rolePermissionIdCounter++;
    const newRolePermission: RolePermission = { ...rolePermission, id };
    this.rolePermissions.set(id, newRolePermission);
    return newRolePermission;
  }

  async updateRolePermission(id: number, rolePermissionData: Partial<RolePermission>): Promise<RolePermission | undefined> {
    const existingRolePermission = this.rolePermissions.get(id);
    if (!existingRolePermission) return undefined;

    const updatedRolePermission = { ...existingRolePermission, ...rolePermissionData };
    this.rolePermissions.set(id, updatedRolePermission);
    return updatedRolePermission;
  }

  async deleteRolePermission(id: number): Promise<boolean> {
    return this.rolePermissions.delete(id);
  }

  async getAllRolePermissions(): Promise<RolePermission[]> {
    return Array.from(this.rolePermissions.values());
  }

  async getRolePermissionsByRole(role: string): Promise<RolePermission[]> {
    return Array.from(this.rolePermissions.values())
      .filter(rp => rp.role === role);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async savePasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    const resetToken: PasswordResetToken = {
      id: Date.now(), // Simple ID for in-memory storage
      userId,
      token,
      expiresAt,
      used: false,
      createdAt: new Date()
    };
    this.passwordResetTokens.set(token, resetToken);

    // Persist to file for development
    this.persistTokens();
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    console.log('🔍 Buscando token no storage:', {
      token: token.substring(0, 8) + '...',
      totalTokensStored: this.passwordResetTokens.size,
      allTokens: Array.from(this.passwordResetTokens.keys()).map(k => k.substring(0, 8) + '...')
    });

    const resetToken = this.passwordResetTokens.get(token);
    if (!resetToken) {
      console.log('❌ Token não encontrado no storage');
      return undefined;
    }

    console.log('🗺 Token encontrado:', {
      userId: resetToken.userId,
      expiresAt: resetToken.expiresAt,
      used: resetToken.used,
      createdAt: resetToken.createdAt,
      isExpired: resetToken.expiresAt < new Date(),
      currentTime: new Date()
    });

    // Check if token has expired
    if (resetToken.expiresAt < new Date() || resetToken.used) {
      console.log('❌ Token expirado ou já usado');
      return undefined;
    }

    console.log('✅ Token válido retornado');
    return resetToken;
  }

  async invalidatePasswordResetToken(token: string): Promise<void> {
    const resetToken = this.passwordResetTokens.get(token);
    if (resetToken) {
      resetToken.used = true;
      this.passwordResetTokens.set(token, resetToken);

      // Persist to file for development
      this.persistTokens();
    }
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    user.password = hashedPassword;
    this.users.set(userId, user);
    return true;
  }

  // Invoice methods (stub implementations for MemStorage)
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return undefined;
  }
  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    throw new Error('MemStorage does not support invoices');
  }
  async deleteInvoice(id: number): Promise<boolean> {
    return false;
  }
  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return [];
  }
  async getAllInvoices(): Promise<Invoice[]> {
    return [];
  }
  async getInvoicesByReferenceMonth(referenceMonth: string): Promise<Invoice[]> {
    return [];
  }
  async getInvoiceByUserAndMonth(userId: number, referenceMonth: string): Promise<Invoice | undefined> {
    return undefined;
  }
  async getInvoiceWithUser(id: number): Promise<(Invoice & { user: User }) | undefined> {
    return undefined;
  }
  async getAllInvoicesWithUsers(): Promise<(Invoice & { user: User })[]> {
    return [];
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
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
    return await db.select().from(users);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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
    const [newPsych] = await db.insert(psychologists).values(psychologist).returning();
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

  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [tx] = await db.select().from(transactions).where(eq(transactions.id, id));
    return tx;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(transaction).returning();
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

  // Invoice methods
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const [deleted] = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return !!deleted;
  }

  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.userId, userId));
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoicesByReferenceMonth(referenceMonth: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.referenceMonth, referenceMonth));
  }

  async getInvoiceByUserAndMonth(userId: number, referenceMonth: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.referenceMonth, referenceMonth)));
    return invoice;
  }

  async getInvoiceWithUser(id: number): Promise<(Invoice & { user: User }) | undefined> {
    const result = await db.select({
      id: invoices.id,
      userId: invoices.userId,
      referenceMonth: invoices.referenceMonth,
      filePath: invoices.filePath,
      originalFilename: invoices.originalFilename,
      mimeType: invoices.mimeType,
      fileSize: invoices.fileSize,
      status: invoices.status,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      user: users
    })
      .from(invoices)
      .innerJoin(users, eq(invoices.userId, users.id))
      .where(eq(invoices.id, id));

    if (result.length === 0) return undefined;
    return { ...result[0], user: result[0].user };
  }

  async getAllInvoicesWithUsers(): Promise<(Invoice & { user: User })[]> {
    const result = await db.select({
      id: invoices.id,
      userId: invoices.userId,
      referenceMonth: invoices.referenceMonth,
      filePath: invoices.filePath,
      originalFilename: invoices.originalFilename,
      mimeType: invoices.mimeType,
      fileSize: invoices.fileSize,
      status: invoices.status,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
      user: users
    })
      .from(invoices)
      .innerJoin(users, eq(invoices.userId, users.id));

    return result.map(r => ({ ...r, user: r.user }));
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

  async createDocument(document: InsertPatientDocument & { uploadedBy: number }): Promise<PatientDocument> {
    const [newDoc] = await db.insert(patientDocuments).values(document).returning();
    return newDoc;
  }

  async listDocumentsByPatientId(patientId: number): Promise<PatientDocument[]> {
    return await db.select().from(patientDocuments).where(eq(patientDocuments.patientId, patientId));
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
  async createAuditLog(log: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> {
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
}

// Use memory storage for local development
// Use database storage for production
export const storage = new DatabaseStorage();