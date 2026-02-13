import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertAppointmentSchema, insertRoomSchema, insertPsychologistSchema, insertTransactionSchema, insertRoomBookingSchema, insertPermissionSchema, insertRolePermissionSchema, insertInvoiceSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "./services/email";
import * as WhatsAppService from "./services/whatsapp";
import googleCalendarRoutes from "./routes/google-calendar";
import * as GoogleCalendarService from "./services/google-calendar";

// Configure multer for image upload
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 1024 * 1024 * 2, // 2MB max file size
  },
  fileFilter: function (req, file, cb) {
    // Allowed extensions
    const allowedExtensions = /jpeg|jpg|png|gif|webp/;
    // Allowed mimetypes
    const allowedMimetypes = /image\/(jpeg|jpg|png|gif|webp)/;

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimetypes.test(file.mimetype.toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error("Apenas imagens nos formatos JPEG, JPG, PNG, GIF e WEBP são permitidas."));
  },
});

// Configure multer for invoice upload (PDF, JPG, PNG - 5MB max)
const invoiceUploadDir = path.join(process.cwd(), "uploads", "invoices");
if (!fs.existsSync(invoiceUploadDir)) {
  fs.mkdirSync(invoiceUploadDir, { recursive: true });
}

const invoiceStorageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, invoiceUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `invoice-${uniqueSuffix}${ext}`);
  },
});

const invoiceUpload = multer({
  storage: invoiceStorageConfig,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5MB max file size
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = /image\/(jpeg|jpg|png)|application\/pdf/.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error("Apenas arquivos nos formatos PDF, JPG ou PNG são permitidos."));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Error handler for Zod validation errors
  const handleZodError = (error: unknown) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return { message: validationError.message };
    }
    return { message: 'An unexpected error occurred' };
  };

  // Psychologists routes
  app.get("/api/psychologists", async (req, res) => {
    try {
      const psychologists = await storage.getAllPsychologists();

      // Get associated user details for each psychologist
      const result = await Promise.all(
        psychologists.map(async (psych) => {
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

  // Upload de foto para psicóloga específica
  app.post("/api/psychologists/:id/photo", (req, res, next) => {
    upload.single("profileImageFile")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: "O arquivo é muito grande. O tamanho máximo permitido é 2MB."
          });
        }
        return res.status(400).json({
          message: `Erro no upload: ${err.message}`
        });
      } else if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          message: err.message
        });
      }
      next();
    });
  }, async (req, res) => {
    try {
      console.log('Upload request received for psychologist:', req.params.id);
      const psychologistId = parseInt(req.params.id);

      if (isNaN(psychologistId)) {
        return res.status(400).json({ message: "ID da psicóloga inválido" });
      }

      // Verificar se a psicóloga existe
      const psychologist = await storage.getPsychologist(psychologistId);
      if (!psychologist) {
        console.error('Psychologist not found:', psychologistId);
        return res.status(404).json({ message: "Psicóloga não encontrada" });
      }

      // Verificar se há arquivo
      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      console.log('File uploaded:', req.file.filename);

      // Obter usuário associado
      const user = await storage.getUser(psychologist.userId);
      if (!user) {
        console.error('User not found:', psychologist.userId);
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Remover foto antiga se existir
      if (user.profileImage) {
        try {
          const oldImagePath = path.join(process.cwd(), user.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log('Old image deleted:', oldImagePath);
          }
        } catch (err) {
          console.error("Error deleting old profile image:", err);
        }
      }

      // Atualizar foto do usuário associado
      const imageUrl = `/uploads/${req.file.filename}`;
      await storage.updateUser(psychologist.userId, { profileImage: imageUrl });

      console.log('Profile image updated successfully:', imageUrl);
      res.json({ profileImage: imageUrl });
    } catch (error) {
      console.error("Error uploading psychologist photo:", error);
      res.status(500).json({
        message: "Erro ao fazer upload da foto",
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });

  app.put("/api/psychologists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { profileImage, ...psychologistData } = req.body;

      // Atualizar dados da psicóloga
      const updatedPsychologist = await storage.updatePsychologist(id, psychologistData);
      if (!updatedPsychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Se houver profileImage, atualizar o usuário associado
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

  // Rooms routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
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

  // Room availability check
  app.get("/api/rooms/availability/:id", async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const date = new Date(req.query.date as string);
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;

      const isAvailable = await storage.checkRoomAvailability(roomId, date, startTime, endTime);
      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ message: "Error checking room availability" });
    }
  });

  // Appointments routes
  app.get("/api/appointments", async (req, res) => {
    try {
      let appointments;

      if (req.query.psychologistId) {
        appointments = await storage.getAppointmentsByPsychologistId(
          parseInt(req.query.psychologistId as string)
        );
      } else if (req.query.date) {
        appointments = await storage.getAppointmentsByDate(
          new Date(req.query.date as string)
        );
      } else if (req.query.startDate && req.query.endDate) {
        appointments = await storage.getAppointmentsByDateRange(
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
      } else {
        appointments = await storage.getAllAppointments();
      }

      // Get associated psychologist and room details
      const result = await Promise.all(
        appointments.map(async (appointment) => {
          const psychologist = await storage.getPsychologist(appointment.psychologistId);
          const psychologistUser = psychologist
            ? await storage.getUser(psychologist.userId)
            : null;

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
      const psychologistUser = psychologist
        ? await storage.getUser(psychologist.userId)
        : null;

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
      const data = insertAppointmentSchema.parse(req.body);

      // Check if room is available for the specified time
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

      // Also create a room booking
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

  // Helper function to convert time string to minutes for comparison
  function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Handle quick booking from shared WhatsApp links - no authentication required
  app.post("/api/appointments/quick-book", async (req, res) => {
    try {
      const { date, startTime, endTime, patientName, psychologistId, roomId, status, notes } = req.body;

      // Validate required fields
      if (!date || !startTime || !endTime || !patientName || !psychologistId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if psychologist exists
      const psychologist = await storage.getPsychologist(parseInt(psychologistId));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Check if room exists and is available
      const isRoomAvailable = await storage.checkRoomAvailability(
        roomId || 1, // Default to room 1 if not specified
        new Date(date),
        startTime,
        endTime
      );

      if (!isRoomAvailable) {
        return res.status(409).json({
          message: "A sala não está disponível neste horário. Por favor, escolha outro horário."
        });
      }

      // Check for time slot conflicts with the psychologist
      const existingAppointments = await storage.getAppointmentsByDate(date);
      const isTimeSlotTaken = existingAppointments.some(app => {
        // Check if time slots overlap for the same psychologist
        if (app.psychologistId !== parseInt(psychologistId)) return false;

        // Convert times to minutes for easier comparison
        const appStart = timeToMinutes(app.startTime);
        const appEnd = timeToMinutes(app.endTime);
        const newStart = timeToMinutes(startTime);
        const newEnd = timeToMinutes(endTime);

        // Check for overlap
        return (newStart < appEnd && newEnd > appStart);
      });

      if (isTimeSlotTaken) {
        return res.status(409).json({
          message: "Este horário já foi agendado. Por favor, escolha outro horário."
        });
      }

      // Create appointment with "pending-confirmation" status
      const appointmentData = {
        date,
        startTime,
        endTime,
        patientName,
        psychologistId: parseInt(psychologistId),
        roomId: roomId || 1, // Default to room 1 if not specified
        status: "pending-confirmation", // Special status for quick bookings
        notes: notes || ""
      };

      const appointment = await storage.createAppointment(appointmentData);

      // Also create a room booking
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
      res.status(500).json({ message: "Erro ao processar a solicitação de agendamento" });
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

  // Financial transactions routes
  app.get("/api/transactions", async (req, res) => {
    try {
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user;
      let transactions;

      if (req.query.type) {
        transactions = await storage.getTransactionsByType(req.query.type as string);
      } else if (req.query.startDate && req.query.endDate) {
        transactions = await storage.getTransactionsByDateRange(
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
      } else {
        transactions = await storage.getAllTransactions();
      }

      // Filtrar transações do usuário autenticado (a menos que seja admin)
      if (user.role !== 'admin') {
        transactions = transactions.filter(transaction => transaction.responsibleId === user.id);
      }

      // Get user info for responsible party
      const result = await Promise.all(
        transactions.map(async (transaction) => {
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
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user;
      const transaction = await storage.getTransaction(parseInt(req.params.id));

      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verificar se o usuário é responsável pela transação ou é admin
      if (transaction.responsibleId !== user.id && user.role !== 'admin') {
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
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user;

      // Adicionar o responsibleId automaticamente
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
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const existingTransaction = await storage.getTransaction(id);

      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verificar se o usuário é responsável pela transação ou é admin
      if (existingTransaction.responsibleId !== req.user.id && req.user.role !== 'admin') {
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
      // Verificar se o usuário está autenticado
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const existingTransaction = await storage.getTransaction(id);

      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verificar se o usuário é responsável pela transação ou é admin
      if (existingTransaction.responsibleId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only delete your own transactions" });
      }

      const result = await storage.deleteTransaction(id);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting transaction" });
    }
  });

  // API para gerar usuários de exemplo para testes
  app.post("/api/users/generate-sample-data", async (req, res) => {
    try {
      // Hash a simple password for demo users
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('123456', 10);

      // Create sample users
      const sampleUsers = [
        {
          username: 'admin',
          password: hashedPassword,
          email: 'admin@psicologia.com',
          fullName: 'Administrador do Sistema',
          role: 'admin',
          status: 'active'
        },
        {
          username: 'dra.maria',
          password: hashedPassword,
          email: 'maria@psicologia.com',
          fullName: 'Dra. Maria Silva',
          role: 'psychologist',
          status: 'active'
        },
        {
          username: 'dr.carlos',
          password: hashedPassword,
          email: 'carlos@psicologia.com',
          fullName: 'Dr. Carlos Santos',
          role: 'psychologist',
          status: 'active'
        },
        {
          username: 'ana.recep',
          password: hashedPassword,
          email: 'ana@psicologia.com',
          fullName: 'Ana Oliveira',
          role: 'receptionist',
          status: 'active'
        },
        {
          username: 'joao.psi',
          password: hashedPassword,
          email: 'joao@psicologia.com',
          fullName: 'João Pereira',
          role: 'psychologist',
          status: 'inactive'
        }
      ];

      // Create users in storage
      for (const userData of sampleUsers) {
        try {
          await storage.createUser(userData);
        } catch (error) {
          // User might already exist, continue with next
          console.log(`User ${userData.username} may already exist, skipping...`);
        }
      }

      res.status(201).json({
        message: "Usuários de exemplo criados com sucesso",
        users: sampleUsers.map(u => ({ username: u.username, fullName: u.fullName, role: u.role }))
      });
    } catch (error) {
      console.error('Error creating sample users:', error);
      res.status(500).json({ message: "Erro ao gerar usuários de exemplo" });
    }
  });

  // API para listar usuários cadastrados (sem autenticação para debug)
  app.get("/api/users/debug", async (req, res) => {
    try {
      const users = await storage.getAllUsers();

      // Remove passwords for security
      const safeUsers = users.map(user => {
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
      console.error('Error fetching users:', error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // API para gerar dados de exemplo para testes
  app.post("/api/transactions/generate-sample-data", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = req.user;
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(today.getMonth() - 1);

      // Mês atual - Receitas
      await storage.createTransaction({
        description: "Consulta - Pedro Santos",
        amount: 150,
        date: new Date().toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Consulta - Maria Oliveira",
        amount: 150,
        date: new Date().toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Avaliação - João Pereira",
        amount: 200,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5).toISOString().split('T')[0],
        type: "income",
        category: "Avaliação",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Workshop de Mindfulness",
        amount: 500,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10).toISOString().split('T')[0],
        type: "income",
        category: "Workshop",
        responsibleId: user.id
      });

      // Mês atual - Despesas
      await storage.createTransaction({
        description: "Aluguel do Consultório",
        amount: 2500,
        date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString().split('T')[0],
        type: "expense",
        category: "Aluguel",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Conta de Luz",
        amount: 320,
        date: new Date(today.getFullYear(), today.getMonth(), 7).toISOString().split('T')[0],
        type: "expense",
        category: "Luz",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Internet",
        amount: 150,
        date: new Date(today.getFullYear(), today.getMonth(), 8).toISOString().split('T')[0],
        type: "expense",
        category: "Internet",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Material de Escritório",
        amount: 230,
        date: new Date(today.getFullYear(), today.getMonth(), 12).toISOString().split('T')[0],
        type: "expense",
        category: "Material de Escritório",
        responsibleId: user.id
      });

      // Mês passado - Receitas
      await storage.createTransaction({
        description: "Consulta - Carlos Silva",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15).toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Consulta - Ana Rodrigues",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 18).toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Sessão em Grupo - Ansiedade",
        amount: 400,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 22).toISOString().split('T')[0],
        type: "income",
        category: "Sessão em Grupo",
        responsibleId: user.id
      });

      // Mês passado - Despesas
      await storage.createTransaction({
        description: "Aluguel do Consultório",
        amount: 2500,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5).toISOString().split('T')[0],
        type: "expense",
        category: "Aluguel",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Conta de Luz",
        amount: 290,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 7).toISOString().split('T')[0],
        type: "expense",
        category: "Luz",
        responsibleId: user.id
      });

      await storage.createTransaction({
        description: "Internet",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 9).toISOString().split('T')[0],
        type: "expense",
        category: "Internet",
        responsibleId: user.id
      });

      res.status(201).json({ message: "Dados de exemplo criados com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao gerar dados de exemplo" });
    }
  });

  // Room bookings routes
  app.get("/api/room-bookings", async (req, res) => {
    try {
      let bookings;

      if (req.query.roomId) {
        bookings = await storage.getRoomBookingsByRoomId(parseInt(req.query.roomId as string));
      } else if (req.query.date) {
        bookings = await storage.getRoomBookingsByDate(new Date(req.query.date as string));
      } else if (req.query.startDate && req.query.endDate) {
        bookings = await storage.getRoomBookingsByDateRange(
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
      } else {
        bookings = await storage.getAllRoomBookings();
      }

      // Enrich with room and psychologist data
      const result = await Promise.all(
        bookings.map(async (booking) => {
          const room = await storage.getRoom(booking.roomId);
          const psychologist = await storage.getPsychologist(booking.psychologistId);
          const psychologistUser = psychologist
            ? await storage.getUser(psychologist.userId)
            : null;

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
      const psychologistUser = psychologist
        ? await storage.getUser(psychologist.userId)
        : null;

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

      // Check if room is available
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

  // Permission routes
  app.get("/api/permissions", async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
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

  // Role permission routes
  app.get("/api/role-permissions", async (req, res) => {
    try {
      let rolePermissions;

      if (req.query.role) {
        rolePermissions = await storage.getRolePermissionsByRole(req.query.role as string);
      } else {
        rolePermissions = await storage.getAllRolePermissions();
      }

      // Enrich with permission details
      const result = await Promise.all(
        rolePermissions.map(async (rp) => {
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

  // WhatsApp sharing endpoint
  app.post("/api/share/whatsapp", async (req, res) => {
    try {
      const { psychologistId, startDate, endDate, message } = req.body;

      if (!psychologistId || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get psychologist info
      const psychologist = await storage.getPsychologist(parseInt(psychologistId));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const psychologistUser = await storage.getUser(psychologist.userId);
      if (!psychologistUser) {
        return res.status(404).json({ message: "Psychologist user not found" });
      }

      // Get all appointments in date range
      const appointments = await storage.getAppointmentsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );

      // Filter by psychologist
      const psychologistAppointments = appointments.filter(
        app => app.psychologistId === parseInt(psychologistId)
      );

      // Format message with available slots
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

      // Generate WhatsApp link
      const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

      res.json({
        link: whatsappLink,
        message: whatsappMessage
      });
    } catch (error) {
      res.status(500).json({ message: "Error generating WhatsApp share link" });
    }
  });

  // Generate HttpServer instance
  // User profile management route
  app.post("/api/profile", (req, res, next) => {
    upload.single("profileImageFile")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: "O arquivo é muito grande. O tamanho máximo permitido é 2MB."
          });
        }
        return res.status(400).json({
          message: `Erro no upload: ${err.message}`
        });
      } else if (err) {
        // Custom errors from fileFilter
        return res.status(400).json({
          message: err.message
        });
      }
      // No error, proceed to the route handler
      next();
    });
  }, async (req, res) => {
    try {
      console.log('Profile update request:', {
        body: req.body,
        hasFile: !!req.file,
        filename: req.file?.filename
      });

      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let userId = req.user?.id;

      // Se psychologistId foi enviado, buscar o userId da psicóloga
      if (req.body.psychologistId) {
        console.log('Updating psychologist photo, ID:', req.body.psychologistId);
        const psychologistId = parseInt(req.body.psychologistId);
        const psychologist = await storage.getPsychologist(psychologistId);
        if (!psychologist) {
          console.error('Psychologist not found:', psychologistId);
          return res.status(404).json({ message: "Psicóloga não encontrada" });
        }
        userId = psychologist.userId;
        console.log('Found psychologist, user ID:', userId);
      }

      if (!userId) {
        return res.status(400).json({ message: "User ID not found" });
      }

      // Get existing user data
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        console.error('User not found:', userId);
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      console.log('Existing user found:', existingUser.id, existingUser.fullName);

      // Process new data
      const { fullName, email } = req.body;
      const updateData: any = {};

      // Only update fields provided
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;

      // Process profile image if uploaded
      if (req.file) {
        console.log('Processing uploaded file:', req.file.filename);

        // If there's an existing profile image, remove it to save space
        if (existingUser.profileImage) {
          try {
            const oldImagePath = path.join(process.cwd(), existingUser.profileImage);
            if (fs.existsSync(oldImagePath)) {
              fs.unlinkSync(oldImagePath);
              console.log('Old image deleted:', oldImagePath);
            }
          } catch (err) {
            console.error("Error deleting old profile image:", err);
          }
        }

        // Save path to uploaded image
        const imageUrl = `/uploads/${req.file.filename}`;
        updateData.profileImage = imageUrl;
        console.log('New image URL:', imageUrl);
      }

      console.log('Update data:', updateData);

      // Update user in database
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        console.error('Failed to update user in storage');
        return res.status(500).json({ message: "Falha ao atualizar perfil do usuário" });
      }

      console.log('User updated successfully');

      // Return updated user data without sensitive info
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        message: "Error updating profile",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Serve uploaded images
  app.use("/uploads", express.static(uploadDir));

  // Password Recovery
  app.post("/api/recover-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Email válido é obrigatório" });
      }

      console.log('🔍 Verificando recuperação de senha para email:', email);

      // Buscar usuário pelo email na tabela de usuários
      const user = await storage.getUserByEmail(email);

      if (!user) {
        console.log('❌ Email não encontrado na base de dados:', email);
        // Por segurança, não informamos se o email existe ou não
        return res.status(200).json({
          message: "Se o email existir, você receberá as instruções de recuperação."
        });
      }

      console.log('✅ Usuário encontrado:', {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        status: user.status
      });

      // Verificar se o usuário está ativo
      if (user.status !== 'active') {
        console.log('⚠️ Usuário não está ativo:', user.status);
        // Por segurança, retornamos a mesma mensagem
        return res.status(200).json({
          message: "Se o email existir, você receberá as instruções de recuperação."
        });
      }

      // Gerar token único e seguro
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      console.log('🔐 Token gerado:', {
        token: resetToken.substring(0, 8) + '...',
        expiresAt: expiresAt.toISOString(),
        userId: user.id
      });

      // Salvar token no banco com expiração
      await storage.savePasswordResetToken(user.id, resetToken, expiresAt);
      console.log('💾 Token salvo no banco de dados');

      // Enviar email
      console.log('📧 Enviando email de recuperação...');
      try {
        await sendPasswordResetEmail(user, resetToken);
        console.log('✅ Processo de recuperação concluído com sucesso');
      } catch (emailError) {
        console.log('⚠️  Erro no envio do email, mas token foi salvo. Verifique logs para detalhes.');
        // Continue execution even if email fails - token is still valid
      }

      res.status(200).json({
        message: "Se o email existir, você receberá as instruções de recuperação."
      });
    } catch (error) {
      console.error('❌ Erro no processo de recuperação de senha:', error);
      res.status(500).json({ message: "Erro ao processar recuperação de senha" });
    }
  });

  // Reset Password - Validate token and show reset form
  app.get("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;

      console.log('🔍 Validando token de reset:', {
        token: token.substring(0, 8) + '...',
        fullToken: token,
        timestamp: new Date().toISOString()
      });

      if (!token) {
        console.log('❌ Token não fornecido');
        return res.status(400).json({ message: "Token é obrigatório" });
      }

      // Verificar se o token é válido
      const resetToken = await storage.getPasswordResetToken(token);

      console.log('🗺 Token encontrado no storage:', {
        found: !!resetToken,
        tokenData: resetToken ? {
          userId: resetToken.userId,
          expiresAt: resetToken.expiresAt,
          used: resetToken.used,
          createdAt: resetToken.createdAt
        } : null
      });

      if (!resetToken) {
        console.log('❌ Token inválido ou expirado');
        return res.status(400).json({
          message: "Token inválido ou expirado. Solicite uma nova recuperação de senha."
        });
      }

      console.log('✅ Token válido!');
      // Token válido - retornar sucesso (frontend renderizará o formulário)
      res.status(200).json({
        valid: true,
        message: "Token válido. Você pode redefinir sua senha."
      });
    } catch (error) {
      console.error('❌ Error validating reset token:', error);
      res.status(500).json({ message: "Erro ao validar token" });
    }
  });

  // Reset Password - Process new password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token || !password || !confirmPassword) {
        return res.status(400).json({
          message: "Token, senha e confirmação são obrigatórios"
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({
          message: "As senhas não coincidem"
        });
      }

      // Validar força da senha
      if (password.length < 6) {
        return res.status(400).json({
          message: "A senha deve ter pelo menos 6 caracteres"
        });
      }

      // Verificar se o token é válido
      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken) {
        return res.status(400).json({
          message: "Token inválido ou expirado. Solicite uma nova recuperação de senha."
        });
      }

      // Hash da nova senha
      const hashedPassword = await hashPassword(password);

      // Atualizar senha no banco
      const updated = await storage.updateUserPassword(resetToken.userId, hashedPassword);

      if (!updated) {
        return res.status(500).json({
          message: "Erro ao atualizar senha. Tente novamente."
        });
      }

      // Invalidar o token para evitar reutilização
      await storage.invalidatePasswordResetToken(token);

      res.status(200).json({
        message: "Sua senha foi alterada com sucesso. Agora você já pode fazer login com a nova senha."
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });

  // Endpoint para agendamento rápido via WhatsApp
  app.post("/api/appointments/quick-book", async (req, res) => {
    try {
      const appointmentData = req.body;

      // Validar dados básicos
      if (!appointmentData.date || !appointmentData.startTime || !appointmentData.endTime ||
        !appointmentData.patientName || !appointmentData.psychologistId) {
        return res.status(400).json({ message: "Dados incompletos para agendamento" });
      }

      // Adicionar status especial para agendamentos via WhatsApp
      const newAppointment = await storage.createAppointment({
        ...appointmentData,
        status: "pending-confirmation", // Status especial para agendamentos via WhatsApp
      });

      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Erro no agendamento rápido:", error);
      res.status(500).json({ message: "Erro ao processar agendamento" });
    }
  });

  // WhatsApp Integration
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

      // Verificar se o psicólogo existe
      const psychologist = await storage.getPsychologist(parseInt(psychologistId));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      // Obter usuário associado ao psicólogo para pegar o nome
      const psychologistUser = await storage.getUser(psychologist.userId);
      if (!psychologistUser) {
        return res.status(404).json({ message: "Psychologist user not found" });
      }

      // Converter datas
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Obter compromissos no período para verificar disponibilidade
      const appointments = await storage.getAppointmentsByDateRange(start, end);
      const psychologistAppointments = appointments.filter(app => app.psychologistId === parseInt(psychologistId));

      // Calcular slots disponíveis
      const availableTimes = calculateAvailableSlots(start, end, psychologistAppointments, psychologist);

      // Gerar a mensagem com links para o Google Calendar
      const message = await formatWhatsAppMessage(
        psychologistUser.fullName,
        customMessage || "",
        availableTimes,
        start,
        end,
        parseInt(psychologistId),
        psychologist.userId // Usuário do psicólogo para criar eventos no Google Calendar
      );

      // Enviar via WhatsApp
      const result = await WhatsAppService.sendWhatsAppAvailability(
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

  // Google Calendar routes
  app.use("/api/google-calendar", googleCalendarRoutes);

  // ========== INVOICE ROUTES ==========

  // POST /api/invoices - Upload de nota fiscal (usuário autenticado)
  app.post("/api/invoices", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    invoiceUpload.single("invoiceFile")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            message: "O arquivo é muito grande. O tamanho máximo permitido é 5MB."
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
      const user = req.user as any;
      const { referenceMonth } = req.body;

      if (!referenceMonth) {
        // Remove o arquivo se o mês não foi informado
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: "Mês de referência é obrigatório" });
      }

      // Validar formato do mês (YYYY-MM)
      const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
      if (!monthRegex.test(referenceMonth)) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: "Formato do mês inválido. Use YYYY-MM (ex: 2025-01)" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Verificar se já existe uma nota para este mês
      const existingInvoice = await storage.getInvoiceByUserAndMonth(user.id, referenceMonth);
      if (existingInvoice) {
        // Remove o arquivo enviado
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          message: `Já existe uma nota fiscal enviada para o mês ${referenceMonth}`
        });
      }

      // Criar a nota fiscal
      const invoice = await storage.createInvoice({
        userId: user.id,
        referenceMonth,
        filePath: `/uploads/invoices/${req.file.filename}`,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        status: "enviada"
      });

      console.log(`Invoice uploaded: ${invoice.id} by user ${user.id} for month ${referenceMonth}`);

      res.status(201).json({
        ...invoice,
        message: "Nota fiscal enviada com sucesso"
      });
    } catch (error) {
      console.error("Error uploading invoice:", error);
      // Remove o arquivo em caso de erro
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) { }
      }
      res.status(500).json({ message: "Erro ao enviar nota fiscal" });
    }
  });

  // GET /api/invoices - Lista notas do usuário logado
  app.get("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user as any;
      console.log(`[DEBUG] GET /api/invoices - user.id: ${user.id}, type: ${typeof user.id}`);

      const invoices = await storage.getInvoicesByUserId(user.id);
      console.log(`[DEBUG] GET /api/invoices - found ${invoices.length} invoices for user ${user.id}`);

      // Disable all caching to prevent data leakage between users
      res.set({
        'Cache-Control': 'private, no-store, no-cache, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Cookie',
        'ETag': ''
      });
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Erro ao buscar notas fiscais" });
    }
  });

  // GET /api/admin/invoices - Lista todas as notas (somente admin)
  app.get("/api/admin/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }

      // Filtros opcionais
      const { userId, referenceMonth } = req.query;

      let invoices = await storage.getAllInvoicesWithUsers();

      // Aplicar filtros
      if (userId) {
        invoices = invoices.filter(inv => inv.userId === parseInt(userId as string));
      }
      if (referenceMonth) {
        invoices = invoices.filter(inv => inv.referenceMonth === referenceMonth);
      }

      res.json(invoices);
    } catch (error) {
      console.error("Error fetching admin invoices:", error);
      res.status(500).json({ message: "Erro ao buscar notas fiscais" });
    }
  });

  // GET /api/admin/invoices/status - Status de envio por mês (quem enviou/não enviou)
  app.get("/api/admin/invoices/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user as any;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }

      const { referenceMonth } = req.query;
      if (!referenceMonth) {
        return res.status(400).json({ message: "Mês de referência é obrigatório" });
      }

      // Buscar todos os usuários (exceto admin)
      const allUsers = await storage.getAllUsers();
      const nonAdminUsers = allUsers.filter(u => u.role !== "admin");

      // Buscar notas do mês
      const invoices = await storage.getInvoicesByReferenceMonth(referenceMonth as string);
      const userIdsWithInvoice = new Set(invoices.map(inv => inv.userId));

      const sent = nonAdminUsers.filter(u => userIdsWithInvoice.has(u.id)).map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role
      }));

      const pending = nonAdminUsers.filter(u => !userIdsWithInvoice.has(u.id)).map(u => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role
      }));

      res.json({
        referenceMonth,
        sent,
        pending,
        totalUsers: nonAdminUsers.length,
        totalSent: sent.length,
        totalPending: pending.length
      });
    } catch (error) {
      console.error("Error fetching invoice status:", error);
      res.status(500).json({ message: "Erro ao buscar status de notas fiscais" });
    }
  });

  // GET /api/invoices/:id/download - Download da nota (verifica permissão)
  app.get("/api/invoices/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Nota fiscal não encontrada" });
      }

      // Verificar permissão: usuário é o dono ou é admin
      if (invoice.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Construir caminho do arquivo
      const filePath = path.join(process.cwd(), invoice.filePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo não encontrado" });
      }

      // Enviar o arquivo com o nome original
      res.download(filePath, invoice.originalFilename);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      res.status(500).json({ message: "Erro ao baixar nota fiscal" });
    }
  });

  // DELETE /api/invoices/:id - Excluir nota (apenas própria)
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const user = req.user as any;
      const invoiceId = parseInt(req.params.id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Nota fiscal não encontrada" });
      }

      // Verificar permissão: apenas o dono pode excluir
      if (invoice.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado. Você só pode excluir suas próprias notas." });
      }

      // Remover arquivo do disco
      const filePath = path.join(process.cwd(), invoice.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remover do banco
      await storage.deleteInvoice(invoiceId);

      res.json({ message: "Nota fiscal excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Erro ao excluir nota fiscal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to calculate available time slots
function calculateAvailableSlots(
  startDate: Date,
  endDate: Date,
  appointments: any[],
  psychologist?: any
): { date: string, slots: string[] }[] {
  const availableTimes: { date: string, slots: string[] }[] = [];
  const workingHours = {
    start: "08:00",
    end: "18:00"
  };
  const slotDuration = 60; // minutes

  // Get all dates between start and end date
  const dates = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Skip weekends
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // For each date, calculate available slots
  dates.forEach(date => {
    const dateString = date.toISOString().split('T')[0];
    const dateAppointments = appointments.filter(app => {
      const appDate = new Date(app.date).toISOString().split('T')[0];
      return appDate === dateString;
    });

    // Calculate busy times
    const busyTimes = dateAppointments.map(app => ({
      start: app.startTime,
      end: app.endTime
    }));

    // Calculate available slots
    const slots = calculateTimeSlots(workingHours.start, workingHours.end, slotDuration, busyTimes);

    availableTimes.push({
      date: dateString,
      slots
    });
  });

  return availableTimes;
}

// Helper function to calculate time slots
function calculateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number,
  busySlots: { start: string, end: string }[]
): string[] {
  const availableSlots: string[] = [];

  let currentTime = new Date(`2000-01-01T${startTime}`);
  const endTimeDate = new Date(`2000-01-01T${endTime}`);

  while (currentTime < endTimeDate) {
    const currentTimeStr = currentTime.toTimeString().substring(0, 5);

    // Add duration to get the end time of this slot
    const slotEndTime = new Date(currentTime.getTime() + durationMinutes * 60000);
    const slotEndTimeStr = slotEndTime.toTimeString().substring(0, 5);

    // Check if this slot overlaps with any busy slots
    const isAvailable = !busySlots.some(busy => {
      return (currentTimeStr < busy.end && slotEndTimeStr > busy.start);
    });

    if (isAvailable) {
      availableSlots.push(`${currentTimeStr} - ${slotEndTimeStr}`);
    }

    // Move to next slot
    currentTime = slotEndTime;
  }

  return availableSlots;
}

// Helper function to format WhatsApp message with Google Calendar links
async function formatWhatsAppMessage(
  psychologistName: string,
  customMessage: string,
  availableTimes: { date: string, slots: string[] }[],
  startDate: Date,
  endDate: Date,
  psychologistId: number,
  psychologistUserId: number
): Promise<string> {
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let message = customMessage.trim() ? customMessage + "\n\n" : "";

  message += `*Horários disponíveis - ${psychologistName}*\n`;
  message += `Período: ${dateFormatter.format(startDate)} a ${dateFormatter.format(endDate)}\n\n`;

  // Processar cada dia disponível
  for (const item of availableTimes) {
    const date = new Date(item.date);
    const formattedDate = dateFormatter.format(date);
    message += `*${formattedDate} (${getDayOfWeek(date)})*\n`;

    if (item.slots.length === 0) {
      message += "Sem horários disponíveis neste dia.\n";
    } else {
      // Processar cada slot de horário
      for (const slot of item.slots) {
        // Extrair horas de início e fim
        const [startTime, endTime] = slot.split(" - ");

        // Criar evento no Google Calendar e obter o link
        const eventData = {
          summary: `Consulta com ${psychologistName}`,
          date: item.date,
          startTime,
          endTime,
          details: `Horário disponível para agendamento com ${psychologistName}. Clique para confirmar.`
        };

        try {
          // Usar o link fixo de agendamento do Google Calendar
          const googleCalendarLink = GoogleCalendarService.getAppointmentSchedulingLink(
            psychologistUserId,
            eventData
          );

          // Usar o link do Google Calendar para agendamento
          message += `- ${slot} 👉 [Agendar via Google Calendar](${googleCalendarLink})\n`;
        } catch (error) {
          console.error(`Erro ao criar evento no Google Calendar: ${error}`);
          // Fallback para o link interno
          const encodedDate = encodeURIComponent(item.date);
          const encodedTime = encodeURIComponent(slot);
          const encodedPsychologistId = encodeURIComponent(psychologistId.toString());

          const baseUrl = process.env.BASE_URL || "https://management-consultancy-psi.replit.app";
          const bookingLink = `${baseUrl}/quick-booking?date=${encodedDate}&time=${encodedTime}&psychologist=${encodedPsychologistId}`;

          message += `- ${slot} 👉 [Agendar](${bookingLink})\n`;
        }
      }
    }
    message += "\n";
  }

  message += "Clique nos links para agendar diretamente ou entre em contato para mais informações.";

  return message;
}

// Helper function to get day of week in Portuguese
function getDayOfWeek(date: Date): string {
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  return days[date.getDay()];
}
