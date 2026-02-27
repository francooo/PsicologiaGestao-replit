import { Router } from 'express';
import * as googleCalendarService from '../services/google-calendar';
// import { db } from '../db'; // Commented out for local development
import { appointments, calendarEvents, users } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const router = Router();

// Rota para iniciar o processo de autorização
router.get('/auth', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const authUrl = googleCalendarService.getAuthUrl(req.user.id);
  res.json({ authUrl });
});

// Callback para processar o código de autorização do Google
router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (!code || !state) {
    return res.status(400).json({ error: 'Parâmetros ausentes' });
  }
  
  const userId = parseInt(state as string, 10);
  
  // Validar se o ID de usuário no estado corresponde ao usuário autenticado
  if (req.isAuthenticated() && req.user.id !== userId) {
    return res.status(403).json({ error: 'ID de usuário inválido' });
  }
  
  try {
    const success = await googleCalendarService.handleAuthCode(code as string, userId);
    
    if (success) {
      // Redirecionar para a página de perfil ou configurações
      res.redirect('/profile?googleCalendarConnected=true');
    } else {
      res.redirect('/profile?googleCalendarError=true');
    }
  } catch (error) {
    console.error('Erro durante autenticação do Google Calendar:', error);
    res.redirect('/profile?googleCalendarError=true');
  }
});

// Verificar status de autenticação com o Google Calendar
router.get('/status', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  const isAuthenticated = await googleCalendarService.isUserAuthenticated(req.user.id);
  res.json({ authenticated: isAuthenticated });
});

// Sincronizar um agendamento com o Google Calendar
router.post('/sync/:appointmentId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  const appointmentId = parseInt(req.params.appointmentId, 10);
  
  try {
    // Buscar detalhes do agendamento
    const appointmentResults = await db.select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));
    
    if (appointmentResults.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    const appointment = appointmentResults[0];
    
    // Verificar se o agendamento já está sincronizado
    const existingSync = await db.select()
      .from(calendarEvents)
      .where(eq(calendarEvents.appointmentId, appointmentId));
    
    if (existingSync.length > 0) {
      return res.status(409).json({ 
        error: 'Agendamento já sincronizado', 
        calendarEventId: existingSync[0].googleEventId 
      });
    }
    
    // Buscar detalhes do psicólogo
    const psychologistResults = await db
      .select({
        fullName: users.fullName,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, appointment.psychologistId));
    
    const psychologist = psychologistResults[0];
    
    // Formatando data e hora para o Google Calendar
    const appointmentDate = appointment.date;
    const startTime = appointment.startTime;
    const endTime = appointment.endTime;
    
    // Combinar data e hora para obter timestamps ISO
    const startDateTime = new Date(`${appointmentDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${appointmentDate}T${endTime}`).toISOString();
    
    // Criar evento no Google Calendar
    const eventId = await googleCalendarService.addEventToCalendar(
      req.user.id,
      {
        summary: `Consulta com ${appointment.patientName}`,
        description: appointment.notes || 'Sem observações adicionais',
        location: `Sala ${appointment.roomId}`,
        startDateTime,
        endDateTime,
        attendees: [
          { email: req.user.email }, // Usuário atual
          ...(psychologist ? [{ email: psychologist.email }] : []) // Psicólogo, se disponível
        ]
      }
    );
    
    if (!eventId) {
      return res.status(500).json({ error: 'Erro ao criar evento no Google Calendar' });
    }
    
    // Salvar o mapeamento entre agendamento e evento do Google Calendar
    await db.insert(calendarEvents).values({
      appointmentId,
      googleEventId: eventId,
      userId: req.user.id
    });
    
    res.status(201).json({ googleEventId: eventId });
  } catch (error) {
    console.error('Erro ao sincronizar agendamento com Google Calendar:', error);
    res.status(500).json({ error: 'Erro ao sincronizar agendamento' });
  }
});

// Atualizar um evento do Google Calendar a partir de um agendamento
router.put('/sync/:appointmentId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  const appointmentId = parseInt(req.params.appointmentId, 10);
  
  try {
    // Buscar detalhes do agendamento
    const appointmentResults = await db.select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId));
    
    if (appointmentResults.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    const appointment = appointmentResults[0];
    
    // Buscar o evento correspondente no Google Calendar
    const eventResults = await db.select()
      .from(calendarEvents)
      .where(eq(calendarEvents.appointmentId, appointmentId));
    
    if (eventResults.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado no Google Calendar' });
    }
    
    const calendarEvent = eventResults[0];
    
    // Formatando data e hora para o Google Calendar
    const appointmentDate = appointment.date;
    const startTime = appointment.startTime;
    const endTime = appointment.endTime;
    
    // Combinar data e hora para obter timestamps ISO
    const startDateTime = new Date(`${appointmentDate}T${startTime}`).toISOString();
    const endDateTime = new Date(`${appointmentDate}T${endTime}`).toISOString();
    
    // Atualizar evento no Google Calendar
    const success = await googleCalendarService.updateCalendarEvent(
      req.user.id,
      calendarEvent.googleEventId,
      {
        summary: `Consulta com ${appointment.patientName}`,
        description: appointment.notes || 'Sem observações adicionais',
        location: `Sala ${appointment.roomId}`,
        startDateTime,
        endDateTime
      }
    );
    
    if (!success) {
      return res.status(500).json({ error: 'Erro ao atualizar evento no Google Calendar' });
    }
    
    // Atualizar a data de última sincronização
    await db.update(calendarEvents)
      .set({ lastSynced: new Date() })
      .where(eq(calendarEvents.id, calendarEvent.id));
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar evento no Google Calendar:', error);
    res.status(500).json({ error: 'Erro ao atualizar evento' });
  }
});

// Remover um evento do Google Calendar
router.delete('/sync/:appointmentId', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  const appointmentId = parseInt(req.params.appointmentId, 10);
  
  try {
    // Buscar o evento correspondente no Google Calendar
    const eventResults = await db.select()
      .from(calendarEvents)
      .where(eq(calendarEvents.appointmentId, appointmentId));
    
    if (eventResults.length === 0) {
      return res.status(404).json({ error: 'Evento não encontrado no Google Calendar' });
    }
    
    const calendarEvent = eventResults[0];
    
    // Remover evento do Google Calendar
    const success = await googleCalendarService.deleteCalendarEvent(
      req.user.id,
      calendarEvent.googleEventId
    );
    
    if (!success) {
      return res.status(500).json({ error: 'Erro ao remover evento do Google Calendar' });
    }
    
    // Remover o mapeamento do banco de dados
    await db.delete(calendarEvents)
      .where(eq(calendarEvents.id, calendarEvent.id));
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao remover evento do Google Calendar:', error);
    res.status(500).json({ error: 'Erro ao remover evento' });
  }
});

// Listar próximos eventos do Google Calendar
router.get('/events', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  try {
    const events = await googleCalendarService.listUpcomingEvents(req.user.id);
    
    if (events === null) {
      return res.status(500).json({ error: 'Erro ao recuperar eventos do Google Calendar' });
    }
    
    res.json(events);
  } catch (error) {
    console.error('Erro ao listar eventos do Google Calendar:', error);
    res.status(500).json({ error: 'Erro ao listar eventos' });
  }
});

export default router;