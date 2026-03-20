import { Router } from 'express';
import { db } from '../db';
import { meetings, googleTokens, users } from '@shared/schema';
import { patients } from '@shared/patient-schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  createMeetingEvent,
  sendMeetLinkEmail,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../services/google-calendar';
import { z } from 'zod';

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Não autenticado' });
  next();
}

// ─── List meetings ────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const { status, dateFrom, dateTo, patientId } = req.query;

    let query = db
      .select({
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
        // Join patient info
        patientFullName: patients.fullName,
        patientPhone: patients.phone,
        patientPhotoUrl: patients.photoUrl,
      })
      .from(meetings)
      .leftJoin(patients, eq(meetings.patientId, patients.id))
      .orderBy(desc(meetings.scheduledAt));

    const conditions: any[] = [];

    // Role-based filter
    if (user.role === 'psychologist') {
      conditions.push(eq(meetings.psychologistId, user.id));
    }

    if (status && status !== 'all') {
      conditions.push(eq(meetings.status, status as string));
    }
    if (dateFrom) {
      conditions.push(gte(meetings.scheduledAt, new Date(dateFrom as string)));
    }
    if (dateTo) {
      conditions.push(lte(meetings.scheduledAt, new Date(dateTo as string)));
    }
    if (patientId) {
      conditions.push(eq(meetings.patientId, parseInt(patientId as string)));
    }

    const rows = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = rows.map((m) => ({
      ...m,
      isToday:
        m.scheduledAt >= today && m.scheduledAt < tomorrow,
    }));

    res.json(result);
  } catch (error) {
    console.error('Erro ao listar reuniões:', error);
    res.status(500).json({ error: 'Erro ao listar reuniões' });
  }
});

// ─── Get single meeting ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const id = parseInt(req.params.id);

    const rows = await db
      .select({
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
        patientPhotoUrl: patients.photoUrl,
      })
      .from(meetings)
      .leftJoin(patients, eq(meetings.patientId, patients.id))
      .where(eq(meetings.id, id));

    if (!rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });

    const meeting = rows[0];
    if (user.role === 'psychologist' && meeting.psychologistId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar reunião' });
  }
});

// ─── Create meeting ────────────────────────────────────────────────────────────
const createSchema = z.object({
  patientId: z.number().int().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  scheduledAt: z.string(),
  durationMinutes: z.number().int().positive().default(50),
  sendLinkNow: z.boolean().optional().default(false),
  appointmentId: z.number().int().positive().optional(),
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string; email: string; fullName: string };
    const body = createSchema.parse(req.body);

    // Fetch patient
    const patientRows = await db
      .select()
      .from(patients)
      .where(eq(patients.id, body.patientId));
    if (!patientRows.length) return res.status(404).json({ error: 'Paciente não encontrado' });
    const patient = patientRows[0];

    const psychologistId = user.id;
    const scheduledAt = new Date(body.scheduledAt);
    const endDateTime = new Date(scheduledAt.getTime() + body.durationMinutes * 60000);
    const title = body.title || `Sessão com ${patient.fullName}`;

    // Check if user has Google Calendar connected
    const tokenRows = await db
      .select()
      .from(googleTokens)
      .where(eq(googleTokens.userId, psychologistId));
    const hasGoogleCalendar = tokenRows.length > 0;

    let googleEventId: string | null = null;
    let meetLink: string | null = null;

    if (hasGoogleCalendar) {
      const calResult = await createMeetingEvent(psychologistId, {
        summary: title,
        description: body.description,
        startDateTime: scheduledAt.toISOString(),
        endDateTime: endDateTime.toISOString(),
        attendeeEmail: patient.email || undefined,
        requestId: `consultapsi-${Date.now()}-${body.patientId}`,
      });
      if (calResult) {
        googleEventId = calResult.googleEventId;
        meetLink = calResult.meetLink;
      }
    }

    // Save meeting
    const [meeting] = await db
      .insert(meetings)
      .values({
        psychologistId,
        patientId: body.patientId,
        appointmentId: body.appointmentId ?? null,
        title,
        description: body.description ?? null,
        googleEventId,
        meetLink,
        status: 'scheduled',
        scheduledAt,
        durationMinutes: body.durationMinutes,
        patientEmail: patient.email ?? null,
        patientName: patient.fullName,
      })
      .returning();

    // Send email if requested
    let emailSent = false;
    if (body.sendLinkNow && patient.email && meetLink) {
      const psychUser = await db
        .select({ fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.id, psychologistId));
      const psych = psychUser[0];
      emailSent = await sendMeetLinkEmail({
        userId: psychologistId,
        patientName: patient.fullName,
        patientEmail: patient.email,
        psychologistName: psych?.fullName || user.fullName,
        psychologistEmail: psych?.email || user.email,
        meetLink,
        scheduledAt,
        durationMinutes: body.durationMinutes,
      });
      if (emailSent) {
        await db
          .update(meetings)
          .set({ linkSentAt: new Date(), updatedAt: new Date() })
          .where(eq(meetings.id, meeting.id));
      }
    }

    res.status(201).json({ ...meeting, emailSent, hasGoogleCalendar });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Erro ao criar reunião:', error);
    res.status(500).json({ error: 'Erro ao criar reunião' });
  }
});

// ─── Update meeting ────────────────────────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const id = parseInt(req.params.id);

    const rows = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });
    const meeting = rows[0];
    if (user.role === 'psychologist' && meeting.psychologistId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { title, description, scheduledAt, durationMinutes } = req.body;
    const updates: Partial<typeof meetings.$inferInsert> = { updatedAt: new Date() };

    let newScheduledAt = meeting.scheduledAt;
    let newDuration = meeting.durationMinutes;
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (scheduledAt) { updates.scheduledAt = new Date(scheduledAt); newScheduledAt = new Date(scheduledAt); }
    if (durationMinutes) { updates.durationMinutes = durationMinutes; newDuration = durationMinutes; }

    // Sync with Google Calendar if event exists
    if (meeting.googleEventId && (scheduledAt || durationMinutes || title)) {
      const endDt = new Date(newScheduledAt.getTime() + newDuration * 60000);
      await updateCalendarEvent(meeting.psychologistId, meeting.googleEventId, {
        summary: title || meeting.title,
        description,
        startDateTime: newScheduledAt.toISOString(),
        endDateTime: endDt.toISOString(),
      });
    }

    const [updated] = await db.update(meetings).set(updates).where(eq(meetings.id, id)).returning();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar reunião' });
  }
});

// ─── Start meeting ────────────────────────────────────────────────────────────
router.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const id = parseInt(req.params.id);

    const rows = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });
    const meeting = rows[0];
    if (user.role === 'psychologist' && meeting.psychologistId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const [updated] = await db
      .update(meetings)
      .set({ status: 'active', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar reunião' });
  }
});

// ─── End meeting ───────────────────────────────────────────────────────────────
router.post('/:id/end', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const id = parseInt(req.params.id);

    const rows = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });
    const meeting = rows[0];
    if (user.role === 'psychologist' && meeting.psychologistId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const endedAt = new Date();
    const startedAt = meeting.startedAt || meeting.scheduledAt;
    const actualDuration = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

    const { notes } = req.body;
    const [updated] = await db
      .update(meetings)
      .set({
        status: 'ended',
        endedAt,
        actualDuration,
        notes: notes || meeting.notes,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao encerrar reunião' });
  }
});

// ─── Update notes ─────────────────────────────────────────────────────────────
router.patch('/:id/notes', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const id = parseInt(req.params.id);

    const rows = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });
    const meeting = rows[0];
    if (user.role === 'psychologist' && meeting.psychologistId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const [updated] = await db
      .update(meetings)
      .set({ notes: req.body.notes, updatedAt: new Date() })
      .where(eq(meetings.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar anotações' });
  }
});

// ─── Send link email ──────────────────────────────────────────────────────────
router.post('/:id/send-link', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string; email: string; fullName: string };
    const id = parseInt(req.params.id);

    const rows = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });
    const meeting = rows[0];
    if (user.role === 'psychologist' && meeting.psychologistId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (!meeting.meetLink) return res.status(400).json({ error: 'Sem link do Meet' });
    if (!meeting.patientEmail) return res.status(400).json({ error: 'Paciente sem e-mail' });

    const psychUser = await db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, meeting.psychologistId));
    const psych = psychUser[0];

    const sent = await sendMeetLinkEmail({
      userId: meeting.psychologistId,
      patientName: meeting.patientName || 'Paciente',
      patientEmail: meeting.patientEmail,
      psychologistName: psych?.fullName || user.fullName,
      psychologistEmail: psych?.email || user.email,
      meetLink: meeting.meetLink,
      scheduledAt: meeting.scheduledAt,
      durationMinutes: meeting.durationMinutes,
    });

    if (sent) {
      await db
        .update(meetings)
        .set({ linkSentAt: new Date(), updatedAt: new Date() })
        .where(eq(meetings.id, id));
    }

    res.json({ sent });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar link' });
  }
});

// ─── Cancel / delete meeting ──────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const user = req.user as { id: number; role: string };
    const id = parseInt(req.params.id);

    const rows = await db.select().from(meetings).where(eq(meetings.id, id));
    if (!rows.length) return res.status(404).json({ error: 'Reunião não encontrada' });
    const meeting = rows[0];
    if (user.role === 'psychologist' && meeting.psychologistId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Remove from Google Calendar
    if (meeting.googleEventId) {
      await deleteCalendarEvent(meeting.psychologistId, meeting.googleEventId).catch(() => {});
    }

    await db
      .update(meetings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(meetings.id, id));

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cancelar reunião' });
  }
});

export default router;
