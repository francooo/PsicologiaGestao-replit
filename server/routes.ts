import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { requireAuth, requireAdmin, requireRole, requireCompanyExcept } from "./middleware/auth-guards";
import { storage } from "./storage";
import { insertAppointmentSchema, insertRoomSchema, insertPsychologistSchema, insertTransactionSchema, insertRoomBookingSchema, insertPermissionSchema, insertRolePermissionSchema, insertInvoiceSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { sendPasswordResetEmail } from "./services/email";
import * as WhatsAppService from "./services/whatsapp";
import googleCalendarRoutes from "./routes/google-calendar";
import * as GoogleCalendarService from "./services/google-calendar";
import patientRecordsRouter from "./routes/patient-records";
import meetingsRouter from "./routes/meetings";
import profileRouter from "./routes/profile";
import specializationAreasRouter from "./routes/specialization-areas";
import adminPsychologistsRouter from "./routes/admin-psychologists";
import adminAccessRouter from "./routes/admin-access";
import companiesRouter from "./routes/companies";
import platformRouter from "./routes/platform";
import careTemplatesRouter from "./routes/care-templates";
import careDispatchRouter from "./routes/care-dispatch";
import carePublicRouter from "./routes/care-public";
import commissionsRouter, { commissionConfigsRouter } from "./routes/commissions";
import { analyzeInvoiceImage, analyzeInvoicePdf, type PsychologistProfileForInvoice, AIServiceError, AIQuotaError, UnsupportedFormatError } from "./services/ai";

const upload = multer({
  storage: multer.memoryStorage(),
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

const requireStaff = requireRole("admin", "receptionist");

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Multi-empresa: every /api route below needs an active company, except these
  app.use(requireCompanyExcept([
    { method: "GET", path: /^\/api\/psychologists\/\d+$/ }, // quick-booking page
    { method: "POST", path: /^\/api\/appointments\/quick-book$/ },
    { method: "GET", path: /^\/api\/users\/\d+\/photo$/ }, // <img> tags
    { method: "POST", path: /^\/api\/recover-password$/ },
    { method: "GET", path: /^\/api\/reset-password\/[^/]+$/ },
    { method: "POST", path: /^\/api\/reset-password$/ },
    { path: /^\/api\/companies\// }, // choosing the company itself
    { path: /^\/api\/platform\// }, // platform admin, guarded by requirePlatformAdmin (may have no company)
    { path: /^\/api\/care\/respond\// }, // patient form link (scoped by its token)
    { method: "GET", path: /^\/api\/google-calendar\/auth\/callback$/ }, // OAuth redirect
  ]));

  // Error handler for Zod validation errors
  const handleZodError = (error: unknown) => {
    if (error instanceof ZodError) {
      const validationError = fromZodError(error);
      return { message: validationError.message };
    }
    return { message: 'An unexpected error occurred' };
  };

  /**
   * Room/psychologist ids that come from the request body must be rows of the active
   * company; returns the error message when one is not.
   */
  async function foreignReference(companyId: number, refs: { roomId?: unknown; psychologistId?: unknown }) {
    if (refs.roomId !== undefined && !(await storage.getRoom(companyId, Number(refs.roomId)))) {
      return "Sala não encontrada.";
    }
    if (refs.psychologistId !== undefined && !(await storage.getPsychologist(companyId, Number(refs.psychologistId)))) {
      return "Psicóloga não encontrada.";
    }
    return null;
  }

  // Psychologists routes
  app.get("/api/psychologists", requireAuth, async (req, res) => {
    try {
      const psychologists = await storage.getAllPsychologists(req.companyId!);
      // Members carry their role in this company
      const members = new Map((await storage.getAllUsers(req.companyId!)).map((u) => [u.id, u]));

      // Get associated user details for each psychologist
      const result = await Promise.all(
        psychologists.map(async (psych) => {
          const user = members.get(psych.userId) ?? (await storage.getUser(psych.userId));
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

  // Also used by the public quick-booking page (no login, so no company to scope by)
  app.get("/api/psychologists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const psychologist = req.companyId
        ? await storage.getPsychologist(req.companyId, id)
        : await storage.getPsychologistForPublicPage(id);
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

  app.post("/api/psychologists", requireStaff, async (req, res) => {
    try {
      const data = insertPsychologistSchema.parse(req.body);
      const psychologist = await storage.createPsychologist(req.companyId!, data);
      res.status(201).json(psychologist);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating psychologist" });
    }
  });

  // Upload de foto para psicóloga específica
  app.post("/api/psychologists/:id/photo", requireAuth, (req, res, next) => {
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
      const psychologist = await storage.getPsychologist(req.companyId!, psychologistId);
      if (!psychologist) {
        console.error('Psychologist not found:', psychologistId);
        return res.status(404).json({ message: "Psicóloga não encontrada" });
      }

      // Verificar se há arquivo
      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      // Obter usuário associado
      const user = await storage.getUser(psychologist.userId);
      if (!user) {
        console.error('User not found:', psychologist.userId);
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Atualizar foto do usuário associado (armazenada como bytea no Postgres)
      const imageUrl = `/api/users/${psychologist.userId}/photo`;
      await storage.updateUser(psychologist.userId, {
        profileImage: imageUrl,
        profileImageData: req.file.buffer,
        profileImageMimeType: req.file.mimetype,
      });

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

  // GET /api/users/:id/photo - Servir a foto de perfil de um usuário (armazenada como bytea)
  app.get("/api/users/:id/photo", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      const photo = await storage.getUserProfilePhoto(userId);
      if (!photo) {
        return res.status(404).json({ message: "Foto não encontrada" });
      }
      res.setHeader("Content-Type", photo.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(photo.data);
    } catch (error) {
      console.error("Error serving user photo:", error);
      res.status(500).json({ message: "Erro ao exibir foto" });
    }
  });

  app.put("/api/psychologists/:id", requireStaff, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { profileImage, userId: _userId, ...psychologistData } = req.body;

      // Atualizar dados da psicóloga
      const updatedPsychologist = await storage.updatePsychologist(req.companyId!, id, psychologistData);
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

  app.delete("/api/psychologists/:id", requireStaff, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deletePsychologist(req.companyId!, id);
      if (!result) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting psychologist" });
    }
  });

  // Rooms routes
  app.get("/api/rooms", requireAuth, async (req, res) => {
    try {
      const rooms = await storage.getAllRooms(req.companyId!);
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Error fetching rooms" });
    }
  });

  app.get("/api/rooms/:id", requireAuth, async (req, res) => {
    try {
      const room = await storage.getRoom(req.companyId!, parseInt(req.params.id));
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Error fetching room" });
    }
  });

  app.post("/api/rooms", requireAdmin, async (req, res) => {
    try {
      const data = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(req.companyId!, data);
      res.status(201).json(room);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating room" });
    }
  });

  app.put("/api/rooms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedRoom = await storage.updateRoom(req.companyId!, id, req.body);
      if (!updatedRoom) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(updatedRoom);
    } catch (error) {
      res.status(500).json({ message: "Error updating room" });
    }
  });

  app.delete("/api/rooms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteRoom(req.companyId!, id);
      if (!result) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting room" });
    }
  });

  // Room availability check
  app.get("/api/rooms/availability/:id", requireAuth, async (req, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const date = new Date(req.query.date as string);
      const startTime = req.query.startTime as string;
      const endTime = req.query.endTime as string;

      const isAvailable = await storage.checkRoomAvailability(req.companyId!, roomId, date, startTime, endTime);
      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ message: "Error checking room availability" });
    }
  });

  // Appointments routes
  app.get("/api/appointments", requireAuth, async (req, res) => {
    try {
      let appointments;

      const user = req.user as { id: number; role: string } | undefined;
      let psychologistFilter: number | null = null;

      if (user?.role === 'psychologist') {
        const psychProfile = await storage.getPsychologistByUserId(req.companyId!, user.id);
        if (!psychProfile) {
          return res.json([]);
        }
        psychologistFilter = psychProfile.id;
      } else if (req.query.psychologistId) {
        psychologistFilter = parseInt(req.query.psychologistId as string);
      }

      if (psychologistFilter && req.query.startDate && req.query.endDate) {
        appointments = await storage.getAppointmentsByPsychologistIdAndDateRange(req.companyId!,
          psychologistFilter,
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
      } else if (psychologistFilter && req.query.date) {
        const dateAppts = await storage.getAppointmentsByDate(req.companyId!,
          new Date(req.query.date as string)
        );
        appointments = dateAppts.filter(a => a.psychologistId === psychologistFilter);
      } else if (psychologistFilter) {
        appointments = await storage.getAppointmentsByPsychologistId(req.companyId!, psychologistFilter);
      } else if (req.query.date) {
        appointments = await storage.getAppointmentsByDate(req.companyId!,
          new Date(req.query.date as string)
        );
      } else if (req.query.startDate && req.query.endDate) {
        appointments = await storage.getAppointmentsByDateRange(req.companyId!,
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
      } else {
        appointments = await storage.getAllAppointments(req.companyId!);
      }

      // Auto-complete confirmed appointments whose endTime has already passed
      const now = new Date();
      await Promise.all(
        appointments
          .filter(a => a.status === 'confirmed')
          .map(async (a) => {
            // Parse date safely as local (avoid UTC midnight shifting the day)
            const dateStr = typeof a.date === 'string'
              ? a.date.split('T')[0]
              : (a.date as Date).toISOString().split('T')[0];
            const [year, month, day] = dateStr.split('-').map(Number);
            const [endHour, endMin] = (a.endTime as string).split(':').map(Number);
            const endDatetime = new Date(year, month - 1, day, endHour, endMin, 0);
            if (endDatetime < now) {
              await storage.updateAppointment(req.companyId!, a.id, { status: 'completed' });
              a.status = 'completed';
            }
          })
      );

      // Get associated psychologist and room details
      const result = await Promise.all(
        appointments.map(async (appointment) => {
          const psychologist = await storage.getPsychologist(req.companyId!, appointment.psychologistId);
          const psychologistUser = psychologist
            ? await storage.getUser(psychologist.userId)
            : null;

          const room = await storage.getRoom(req.companyId!, appointment.roomId);

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

  app.get("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.companyId!, parseInt(req.params.id));
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const psychologist = await storage.getPsychologist(req.companyId!, appointment.psychologistId);
      const psychologistUser = psychologist
        ? await storage.getUser(psychologist.userId)
        : null;

      const room = await storage.getRoom(req.companyId!, appointment.roomId);

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

  app.post("/api/appointments", requireAuth, async (req, res) => {
    try {
      const user = req.user as { id: number; role: string } | undefined;

      // For psychologist role, always enforce their own psychologistId server-side
      let body = { ...req.body };
      if (user?.role === 'psychologist') {
        const psychProfile = await storage.getPsychologistByUserId(req.companyId!, user.id);
        if (!psychProfile) {
          return res.status(400).json({ message: "Perfil de psicóloga não encontrado. Peça ao administrador para criar seu perfil." });
        }
        body.psychologistId = psychProfile.id;
      }

      const data = insertAppointmentSchema.parse(body);
      const foreign = await foreignReference(req.companyId!, data);
      if (foreign) return res.status(400).json({ message: foreign });

      // Check if room is available for the specified time
      const isRoomAvailable = await storage.checkRoomAvailability(req.companyId!,
        data.roomId,
        new Date(data.date),
        data.startTime,
        data.endTime
      );

      if (!isRoomAvailable) {
        return res.status(409).json({ message: "Room is not available for the specified time" });
      }

      const appointment = await storage.createAppointment(req.companyId!, data);

      // Also create a room booking
      await storage.createRoomBooking(req.companyId!, {
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

      // Public link: the psychologist's company scopes everything below
      const psychologist = await storage.getPsychologistForPublicPage(parseInt(psychologistId));
      if (!psychologist?.companyId) {
        return res.status(404).json({ message: "Psychologist not found" });
      }
      const companyId = psychologist.companyId;

      // The room must be one of this company's (default: its first room)
      const room = roomId
        ? await storage.getRoom(companyId, parseInt(roomId))
        : (await storage.getAllRooms(companyId)).sort((a, b) => a.id - b.id)[0];
      if (!room) {
        return res.status(404).json({ message: "Sala não encontrada." });
      }

      // Check if room is available
      const isRoomAvailable = await storage.checkRoomAvailability(companyId,
        room.id,
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
      const existingAppointments = await storage.getAppointmentsByDate(companyId, new Date(date));
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
        psychologistId: psychologist.id,
        roomId: room.id,
        status: "pending-confirmation", // Special status for quick bookings
        notes: notes || ""
      };

      const appointment = await storage.createAppointment(companyId, appointmentData);

      // Also create a room booking
      await storage.createRoomBooking(companyId, {
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

  app.put("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const foreign = await foreignReference(req.companyId!, req.body);
      if (foreign) return res.status(400).json({ message: foreign });
      const updatedAppointment = await storage.updateAppointment(req.companyId!, id, req.body);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(updatedAppointment);
    } catch (error) {
      res.status(500).json({ message: "Error updating appointment" });
    }
  });

  app.delete("/api/appointments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteAppointment(req.companyId!, id);
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
        transactions = await storage.getTransactionsByType(req.companyId!, req.query.type as string);
      } else if (req.query.startDate && req.query.endDate) {
        transactions = await storage.getTransactionsByDateRange(req.companyId!,
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
      } else {
        transactions = await storage.getAllTransactions(req.companyId!);
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
            relatedAppointment = await storage.getAppointment(req.companyId!, transaction.relatedAppointmentId);
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
      const transaction = await storage.getTransaction(req.companyId!, parseInt(req.params.id));

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
        relatedAppointment = await storage.getAppointment(req.companyId!, transaction.relatedAppointmentId);
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

      const transaction = await storage.createTransaction(req.companyId!, data);
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
      const existingTransaction = await storage.getTransaction(req.companyId!, id);

      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verificar se o usuário é responsável pela transação ou é admin
      if (existingTransaction.responsibleId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only update your own transactions" });
      }

      const updatedTransaction = await storage.updateTransaction(req.companyId!, id, req.body);
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
      const existingTransaction = await storage.getTransaction(req.companyId!, id);

      if (!existingTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      // Verificar se o usuário é responsável pela transação ou é admin
      if (existingTransaction.responsibleId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: "Forbidden: You can only delete your own transactions" });
      }

      const result = await storage.deleteTransaction(req.companyId!, id);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting transaction" });
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
      await storage.createTransaction(req.companyId!, {
        description: "Consulta - Pedro Santos",
        amount: 150,
        date: new Date().toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Consulta - Maria Oliveira",
        amount: 150,
        date: new Date().toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Avaliação - João Pereira",
        amount: 200,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5).toISOString().split('T')[0],
        type: "income",
        category: "Avaliação",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Workshop de Mindfulness",
        amount: 500,
        date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10).toISOString().split('T')[0],
        type: "income",
        category: "Workshop",
        responsibleId: user.id
      });

      // Mês atual - Despesas
      await storage.createTransaction(req.companyId!, {
        description: "Aluguel do Consultório",
        amount: 2500,
        date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString().split('T')[0],
        type: "expense",
        category: "Aluguel",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Conta de Luz",
        amount: 320,
        date: new Date(today.getFullYear(), today.getMonth(), 7).toISOString().split('T')[0],
        type: "expense",
        category: "Luz",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Internet",
        amount: 150,
        date: new Date(today.getFullYear(), today.getMonth(), 8).toISOString().split('T')[0],
        type: "expense",
        category: "Internet",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Material de Escritório",
        amount: 230,
        date: new Date(today.getFullYear(), today.getMonth(), 12).toISOString().split('T')[0],
        type: "expense",
        category: "Material de Escritório",
        responsibleId: user.id
      });

      // Mês passado - Receitas
      await storage.createTransaction(req.companyId!, {
        description: "Consulta - Carlos Silva",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 15).toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Consulta - Ana Rodrigues",
        amount: 150,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 18).toISOString().split('T')[0],
        type: "income",
        category: "Consulta",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Sessão em Grupo - Ansiedade",
        amount: 400,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 22).toISOString().split('T')[0],
        type: "income",
        category: "Sessão em Grupo",
        responsibleId: user.id
      });

      // Mês passado - Despesas
      await storage.createTransaction(req.companyId!, {
        description: "Aluguel do Consultório",
        amount: 2500,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 5).toISOString().split('T')[0],
        type: "expense",
        category: "Aluguel",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
        description: "Conta de Luz",
        amount: 290,
        date: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 7).toISOString().split('T')[0],
        type: "expense",
        category: "Luz",
        responsibleId: user.id
      });

      await storage.createTransaction(req.companyId!, {
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
  app.get("/api/room-bookings", requireAuth, async (req, res) => {
    try {
      let bookings;

      if (req.query.roomId) {
        bookings = await storage.getRoomBookingsByRoomId(req.companyId!, parseInt(req.query.roomId as string));
      } else if (req.query.date) {
        bookings = await storage.getRoomBookingsByDate(req.companyId!, new Date(req.query.date as string));
      } else if (req.query.startDate && req.query.endDate) {
        bookings = await storage.getRoomBookingsByDateRange(req.companyId!,
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
      } else {
        bookings = await storage.getAllRoomBookings(req.companyId!);
      }

      // Enrich with room and psychologist data
      const result = await Promise.all(
        bookings.map(async (booking) => {
          const room = await storage.getRoom(req.companyId!, booking.roomId);
          const psychologist = await storage.getPsychologist(req.companyId!, booking.psychologistId);
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

  app.get("/api/room-bookings/:id", requireAuth, async (req, res) => {
    try {
      const booking = await storage.getRoomBooking(req.companyId!, parseInt(req.params.id));
      if (!booking) {
        return res.status(404).json({ message: "Room booking not found" });
      }

      const room = await storage.getRoom(req.companyId!, booking.roomId);
      const psychologist = await storage.getPsychologist(req.companyId!, booking.psychologistId);
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

  app.post("/api/room-bookings", requireAuth, async (req, res) => {
    try {
      const data = insertRoomBookingSchema.parse(req.body);
      const foreign = await foreignReference(req.companyId!, data);
      if (foreign) return res.status(400).json({ message: foreign });

      // Check if room is available
      const isRoomAvailable = await storage.checkRoomAvailability(req.companyId!,
        data.roomId,
        new Date(data.date),
        data.startTime,
        data.endTime
      );

      if (!isRoomAvailable) {
        return res.status(409).json({ message: "Room is not available for the specified time" });
      }

      const booking = await storage.createRoomBooking(req.companyId!, data);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json(handleZodError(error));
      }
      res.status(500).json({ message: "Error creating room booking" });
    }
  });

  app.put("/api/room-bookings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const foreign = await foreignReference(req.companyId!, req.body);
      if (foreign) return res.status(400).json({ message: foreign });
      const updatedBooking = await storage.updateRoomBooking(req.companyId!, id, req.body);
      if (!updatedBooking) {
        return res.status(404).json({ message: "Room booking not found" });
      }
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Error updating room booking" });
    }
  });

  app.delete("/api/room-bookings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteRoomBooking(req.companyId!, id);
      if (!result) {
        return res.status(404).json({ message: "Room booking not found" });
      }
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Error deleting room booking" });
    }
  });

  // Permission routes
  app.get("/api/permissions", requireAdmin, async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching permissions" });
    }
  });

  app.post("/api/permissions", requireAdmin, async (req, res) => {
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
  app.get("/api/role-permissions", requireAdmin, async (req, res) => {
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

  app.post("/api/role-permissions", requireAdmin, async (req, res) => {
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

  app.delete("/api/role-permissions/:id", requireAdmin, async (req, res) => {
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
  app.post("/api/share/whatsapp", requireAuth, async (req, res) => {
    try {
      const { psychologistId, startDate, endDate, message } = req.body;

      if (!psychologistId || !startDate || !endDate) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get psychologist info
      const psychologist = await storage.getPsychologist(req.companyId!, parseInt(psychologistId));
      if (!psychologist) {
        return res.status(404).json({ message: "Psychologist not found" });
      }

      const psychologistUser = await storage.getUser(psychologist.userId);
      if (!psychologistUser) {
        return res.status(404).json({ message: "Psychologist user not found" });
      }

      // Get all appointments in date range
      const appointments = await storage.getAppointmentsByDateRange(req.companyId!,
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
        const psychologist = await storage.getPsychologist(req.companyId!, psychologistId);
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
      const { fullName, email, birthDate } = req.body;
      const updateData: any = {};

      // Only update fields provided
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (birthDate !== undefined) updateData.birthDate = birthDate || null;

      // Process profile image if uploaded (armazenada como bytea no Postgres)
      if (req.file) {
        const imageUrl = `/api/users/${userId}/photo`;
        updateData.profileImage = imageUrl;
        updateData.profileImageData = req.file.buffer;
        updateData.profileImageMimeType = req.file.mimetype;
        console.log('New image URL:', imageUrl);
      }

      console.log('Update data:', { ...updateData, profileImageData: updateData.profileImageData ? '<buffer>' : undefined });

      // Update user in database
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        console.error('Failed to update user in storage');
        return res.status(500).json({ message: "Falha ao atualizar perfil do usuário" });
      }

      console.log('User updated successfully');

      // Return updated user data without sensitive info / heavy binary data
      const { password, profileImageData, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({
        message: "Error updating profile",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

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
      const psychologist = await storage.getPsychologist(req.companyId!, parseInt(psychologistId));
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
      const appointments = await storage.getAppointmentsByDateRange(req.companyId!, start, end);
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
  // Google Calendar routes
  app.use("/api/google-calendar", googleCalendarRoutes);

  // Meetings routes (Google Meet)
  app.use("/api/meetings", meetingsRouter);

  // Patient Record System Routes
  console.log("Registering /api/patients routes...");
  app.use("/api/patients", patientRecordsRouter);

  // Profile routes (psicóloga logada)
  app.use("/api/profile", profileRouter);

  // Specialization areas
  app.use("/api/specialization-areas", specializationAreasRouter);

  // Admin psychologists management
  app.use("/api/admin/psychologists", adminPsychologistsRouter);

  // System administrators + e-mails pre-authorized as admin (Configurações)
  app.use("/api/admin", adminAccessRouter);

  // Companies (multi-empresa): the user's companies and switching the active one
  app.use("/api/companies", companiesRouter);

  // Platform (super) admin: manages the companies themselves
  app.use("/api/platform", platformRouter);

  // Care module — public response routes (no auth required) — MUST be mounted FIRST
  // so that /api/care/respond/:token is reachable before the authenticated dispatch
  // router's global checkAuth middleware intercepts unauthenticated requests.
  app.use("/api/care", carePublicRouter);

  // Care module — templates (authenticated)
  app.use("/api/care/templates", careTemplatesRouter);

  // Care module — dispatch + history + responses (authenticated)
  app.use("/api/care", careDispatchRouter);

  // ========== COMMISSION ROUTES ==========
  app.use("/api/admin/commissions", commissionsRouter);
  app.use("/api/admin/commission-configs", commissionConfigsRouter);

  // ========== INVOICE ROUTES (NFS-e com IA) ==========

  // POST /api/invoices/analyze-image - Análise de imagem ou PDF da nota fiscal com Groq
  app.post("/api/invoices/analyze-image", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const { image, image_type, psychologist_profile } = req.body as {
        image?: string;
        image_type?: string;
        psychologist_profile?: PsychologistProfileForInvoice;
      };
      if (!image || typeof image !== "string") {
        return res.status(400).json({ message: "Campo 'image' (base64) é obrigatório." });
      }
      const mime = (image_type ?? "image/jpeg").toLowerCase();
      let result: { data: Record<string, { valor: unknown; confianca: number }>; ai_confidence_score: number };
      if (mime === "application/pdf") {
        result = await analyzeInvoicePdf(image, psychologist_profile);
      } else {
        result = await analyzeInvoiceImage(image, mime, psychologist_profile);
      }
      res.json({
        success: true,
        data: result.data,
        ai_confidence_score: result.ai_confidence_score,
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

  // POST /api/invoices - Salvar nova nota fiscal (payload JSON com campos NFS-e)
  app.post("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number; role: string };
      const body = req.body as Record<string, unknown>;
      const psychologistId = user.id;
      let imagePath = body.image_path as string | undefined;
      let imageUrl = body.image_url as string | undefined;
      const imageBase64 = body.image as string | undefined;
      const imageType = (body.image_type as string) || "image/jpeg";
      let imageData: Buffer | null = null;
      let imageMimeType: string | null = null;
      if (!imagePath && !imageUrl && !imageBase64) {
        return res.status(400).json({ message: "Imagem da nota é obrigatória (image_path, image_url ou image em base64)." });
      }
      if (imageBase64 && typeof imageBase64 === "string") {
        try {
          const buf = Buffer.from(imageBase64, "base64");
          if (buf.length > 4 * 1024 * 1024) return res.status(400).json({ message: "Arquivo muito grande (máx. 4MB)." });
          imageData = buf;
          imageMimeType = imageType;
        } catch (err) {
          console.error("Error saving invoice image:", err);
          return res.status(400).json({ message: "Erro ao salvar imagem da nota." });
        }
      }
      // Duplicidade de chave NF-e é garantida por constraint UNIQUE no banco
      const valorLiquido = body.valor_liquido != null ? Number(body.valor_liquido) : null;
      const valorServicos = body.valor_servicos != null ? Number(body.valor_servicos) : null;
      const invoice = await storage.createInvoice(req.companyId!, {
        psychologistId,
        clinicId: (body.clinic_id as number) ?? null,
        chaveNfe: (body.chave_nfe as string) ?? null,
        numeroNota: (body.numero_nota as string) ?? null,
        serie: (body.serie as string) ?? null,
        dataEmissao: (body.data_emissao as string) ?? null,
        emitenteNome: (body.emitente_nome as string) ?? null,
        emitenteCnpjCpf: (body.emitente_cnpj_cpf as string) ?? null,
        emitenteCrp: (body.emitente_crp as string) ?? null,
        emitenteIe: (body.emitente_ie as string) ?? null,
        emitenteIm: (body.emitente_im as string) ?? null,
        emitenteEndereco: (body.emitente_endereco as string) ?? null,
        emitenteBairro: (body.emitente_bairro as string) ?? null,
        emitenteMunicipio: (body.emitente_municipio as string) ?? null,
        emitenteUf: (body.emitente_uf as string) ?? null,
        emitenteCep: (body.emitente_cep as string) ?? null,
        emitenteTelefone: (body.emitente_telefone as string) ?? null,
        emitenteEmail: (body.emitente_email as string) ?? null,
        tomadorNome: (body.tomador_nome as string) ?? null,
        tomadorCpfCnpj: (body.tomador_cpf_cnpj as string) ?? null,
        tomadorEndereco: (body.tomador_endereco as string) ?? null,
        tomadorBairro: (body.tomador_bairro as string) ?? null,
        tomadorMunicipio: (body.tomador_municipio as string) ?? null,
        tomadorUf: (body.tomador_uf as string) ?? null,
        tomadorCep: (body.tomador_cep as string) ?? null,
        tomadorEmail: (body.tomador_email as string) ?? null,
        patientId: (body.patient_id as number) ?? null,
        descricaoServico: (body.descricao_servico as string) ?? null,
        codigoServico: (body.codigo_servico as string) ?? null,
        codigoCnae: (body.codigo_cnae as string) ?? null,
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
        valorLiquido: valorLiquido != null ? String(valorLiquido) : (valorServicos != null ? String(valorServicos) : null),
        imageUrl: imageUrl ?? null,
        imagePath: imagePath ?? null,
        imageData: imageData,
        imageMimeType: imageMimeType,
        aiRawResponse: (body.ai_raw_response as object) ?? null,
        aiConfidenceScore: body.ai_confidence_score != null ? String(Number(body.ai_confidence_score)) : null,
        aiExtractedAt: body.ai_extracted_at ? new Date(body.ai_extracted_at as string) : null,
        revisadoPelaPsicologa: Boolean(body.revisado_pela_psicologa),
        observacoes: (body.observacoes as string) ?? null,
        status: (body.status as string) ?? "ativa",
      });
      const { imageData: _invoiceImageData, ...invoiceResponse } = invoice;
      res.status(201).json({ ...invoiceResponse, message: "Nota fiscal registrada com sucesso" });
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Erro ao salvar nota fiscal" });
    }
  });

  // GET /api/invoices - Lista notas do usuário logado (paginação e filtros)
  app.get("/api/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number };
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const dataEmissaoFrom = req.query.data_emissao_from as string | undefined;
      const dataEmissaoTo = req.query.data_emissao_to as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const result = await storage.getInvoicesByUserId(req.companyId!, user.id, { limit, offset, dataEmissaoFrom, dataEmissaoTo, status, search });
      res.set("Cache-Control", "private, no-store, no-cache, max-age=0, must-revalidate");
      res.json(result);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Erro ao buscar notas fiscais" });
    }
  });

  // GET /api/invoices/summary - Totais para cards (psicóloga)
  app.get("/api/invoices/summary", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number };
      const dataEmissaoFrom = req.query.data_emissao_from as string | undefined;
      const dataEmissaoTo = req.query.data_emissao_to as string | undefined;
      const status = req.query.status as string | undefined;
      const summary = await storage.getInvoicesSummary(req.companyId!, user.id, { dataEmissaoFrom, dataEmissaoTo, status });
      res.json(summary);
    } catch (error) {
      console.error("Error fetching invoice summary:", error);
      res.status(500).json({ message: "Erro ao buscar resumo" });
    }
  });

  // GET /api/invoices/:id - Detalhes de uma nota (própria ou admin)
  app.get("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number; role: string };
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const invoice = await storage.getInvoice(req.companyId!, id);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal não encontrada" });
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

  // PUT /api/invoices/:id - Editar nota (apenas dona)
  app.put("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number };
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const invoice = await storage.getInvoice(req.companyId!, id);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal não encontrada" });
      if (invoice.psychologistId !== user.id) {
        return res.status(403).json({ message: "Apenas a psicóloga que registrou pode editar." });
      }
      const body = req.body as Record<string, unknown>;
      const updated = await storage.updateInvoice(req.companyId!, id, {
        numeroNota: body.numero_nota as string | undefined,
        serie: body.serie as string | undefined,
        dataEmissao: body.data_emissao as string | undefined,
        tomadorNome: body.tomador_nome as string | undefined,
        tomadorCpfCnpj: body.tomador_cpf_cnpj as string | undefined,
        tomadorEndereco: body.tomador_endereco as string | undefined,
        tomadorMunicipio: body.tomador_municipio as string | undefined,
        tomadorUf: body.tomador_uf as string | undefined,
        tomadorCep: body.tomador_cep as string | undefined,
        tomadorEmail: body.tomador_email as string | undefined,
        patientId: body.patient_id != null ? (body.patient_id as number) : undefined,
        descricaoServico: body.descricao_servico as string | undefined,
        valorServicos: body.valor_servicos != null ? String(Number(body.valor_servicos)) : undefined,
        valorLiquido: body.valor_liquido != null ? String(Number(body.valor_liquido)) : undefined,
        observacoes: body.observacoes as string | undefined,
        status: body.status as string | undefined,
      });
      const { imageData: _invoiceImageData, ...updatedResponse } = updated ?? {};
      res.json(updatedResponse);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Erro ao atualizar nota fiscal" });
    }
  });

  // PATCH /api/invoices/:id/status - Alterar status (dona ou admin)
  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number; role: string };
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });
      const invoice = await storage.getInvoice(req.companyId!, id);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal não encontrada" });
      if (invoice.psychologistId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      const { status } = req.body as { status?: string };
      if (!status || !["ativa", "cancelada", "pendente"].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Use: ativa, cancelada ou pendente." });
      }
      const updated = await storage.updateInvoice(req.companyId!, id, { status });
      const { imageData: _invoiceImageData, ...updatedResponse } = updated ?? {};
      res.json(updatedResponse);
    } catch (error) {
      console.error("Error patching invoice status:", error);
      res.status(500).json({ message: "Erro ao alterar status" });
    }
  });

  // GET /api/admin/invoices - Lista todas as notas com filtros e paginação (admin)
  app.get("/api/admin/invoices", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { role: string };
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Number(req.query.offset) || 0;
      const psychologistId = req.query.psychologist_id != null ? parseInt(req.query.psychologist_id as string, 10) : undefined;
      const dataEmissaoFrom = req.query.data_emissao_from as string | undefined;
      const dataEmissaoTo = req.query.data_emissao_to as string | undefined;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const result = await storage.getInvoicesAdmin(req.companyId!, { limit, offset, psychologistId, dataEmissaoFrom, dataEmissaoTo, status, search });
      res.json(result);
    } catch (error) {
      console.error("Error fetching admin invoices:", error);
      res.status(500).json({ message: "Erro ao buscar notas fiscais" });
    }
  });

  // GET /api/admin/invoices/summary - Totais consolidados (admin)
  app.get("/api/admin/invoices/summary", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { role: string };
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const psychologistId = req.query.psychologist_id != null ? parseInt(req.query.psychologist_id as string, 10) : undefined;
      const dataEmissaoFrom = req.query.data_emissao_from as string | undefined;
      const dataEmissaoTo = req.query.data_emissao_to as string | undefined;
      const status = req.query.status as string | undefined;
      const summary = await storage.getInvoicesSummaryAdmin(req.companyId!, { psychologistId, dataEmissaoFrom, dataEmissaoTo, status });
      res.json(summary);
    } catch (error) {
      console.error("Error fetching admin invoice summary:", error);
      res.status(500).json({ message: "Erro ao buscar resumo" });
    }
  });

  // GET /api/admin/invoices/export - Exportar CSV (admin)
  app.get("/api/admin/invoices/export", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { role: string };
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const psychologistId = req.query.psychologist_id != null ? parseInt(req.query.psychologist_id as string, 10) : undefined;
      const dataEmissaoFrom = req.query.data_emissao_from as string | undefined;
      const dataEmissaoTo = req.query.data_emissao_to as string | undefined;
      const status = req.query.status as string | undefined;
      const { invoices } = await storage.getInvoicesAdmin(req.companyId!, { limit: 10000, offset: 0, psychologistId, dataEmissaoFrom, dataEmissaoTo, status });
      const headers = ["Chave NF-e", "Número", "Série", "Data Emissão", "Psicóloga", "Tomador", "Valor Líquido", "Status", "Registrada em"];
      const rows = invoices.map((inv) => [
        inv.chaveNfe ?? "",
        inv.numeroNota ?? "",
        inv.serie ?? "",
        inv.dataEmissao ?? "",
        inv.user?.fullName ?? "",
        inv.tomadorNome ?? "",
        inv.valorLiquido ?? "",
        inv.status ?? "",
        inv.dataUpload ? new Date(inv.dataUpload).toLocaleString("pt-BR") : "",
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

  // GET /api/admin/invoices/status - Status por mês (quem tem nota no mês)
  app.get("/api/admin/invoices/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { role: string };
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      const referenceMonth = req.query.referenceMonth as string;
      if (!referenceMonth || !/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) {
        return res.status(400).json({ message: "Mês de referência é obrigatório (YYYY-MM)" });
      }
      const [year, month] = referenceMonth.split("-").map(Number);
      const dataEmissaoFrom = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const dataEmissaoTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const { invoices } = await storage.getInvoicesAdmin(req.companyId!, { limit: 10000, offset: 0, dataEmissaoFrom, dataEmissaoTo });
      const psychologistIdsWithInvoice = new Set(invoices.map((inv) => inv.psychologistId));
      const allUsers = await storage.getAllUsers(req.companyId!);
      const nonAdminUsers = allUsers.filter((u) => u.role !== "admin");
      const sent = nonAdminUsers.filter((u) => psychologistIdsWithInvoice.has(u.id)).map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role }));
      const pending = nonAdminUsers.filter((u) => !psychologistIdsWithInvoice.has(u.id)).map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: u.role }));
      res.json({ referenceMonth, sent, pending, totalUsers: nonAdminUsers.length, totalSent: sent.length, totalPending: pending.length });
    } catch (error) {
      console.error("Error fetching invoice status:", error);
      res.status(500).json({ message: "Erro ao buscar status de notas fiscais" });
    }
  });

  // GET /api/invoices/:id/image - Exibir imagem da nota (inline, para visualização no modal)
  app.get("/api/invoices/:id/image", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number; role: string };
      const invoiceId = parseInt(req.params.id, 10);
      if (isNaN(invoiceId)) return res.status(400).json({ message: "ID inválido" });
      const invoice = await storage.getInvoice(req.companyId!, invoiceId);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal não encontrada" });
      if (invoice.psychologistId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      if (!invoice.imageData) {
        return res.status(404).json({ message: "Arquivo da imagem não encontrado" });
      }
      res.setHeader("Content-Type", invoice.imageMimeType || "image/jpeg");
      res.setHeader("Content-Disposition", "inline");
      res.send(invoice.imageData);
    } catch (error) {
      console.error("Error serving invoice image:", error);
      res.status(500).json({ message: "Erro ao exibir imagem" });
    }
  });

  // GET /api/invoices/:id/download - Download da imagem da nota (verifica permissão)
  app.get("/api/invoices/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number; role: string };
      const invoiceId = parseInt(req.params.id, 10);
      if (isNaN(invoiceId)) return res.status(400).json({ message: "ID inválido" });
      const invoice = await storage.getInvoice(req.companyId!, invoiceId);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal não encontrada" });
      if (invoice.psychologistId !== user.id && user.role !== "admin") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      if (!invoice.imageData) {
        return res.status(404).json({ message: "Arquivo da imagem não encontrado" });
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

  // DELETE /api/invoices/:id - Excluir nota (apenas própria)
  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const user = req.user as { id: number };
      const invoiceId = parseInt(req.params.id, 10);
      if (isNaN(invoiceId)) return res.status(400).json({ message: "ID inválido" });
      const invoice = await storage.getInvoice(req.companyId!, invoiceId);
      if (!invoice) return res.status(404).json({ message: "Nota fiscal não encontrada" });
      if (invoice.psychologistId !== user.id) {
        return res.status(403).json({ message: "Acesso negado. Você só pode excluir suas próprias notas." });
      }
      await storage.deleteInvoice(req.companyId!, invoiceId);
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
