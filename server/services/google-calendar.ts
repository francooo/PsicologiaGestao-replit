import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { googleTokens, calendarEvents, appointments } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Escopo necessário para ler e escrever eventos no calendário
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Credenciais OAuth2
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Cache temporário para tokens (opcional, para reduzir consultas ao banco)
const tokenCache: Record<number, any> = {};

/**
 * Gera uma URL de autorização para o usuário conectar sua conta Google
 */
export function getAuthUrl(userId: number): string {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId.toString(), // Usado para identificar o usuário após a autorização
    prompt: 'consent' // Sempre solicita permissão (necessário para obter refresh_token)
  });

  return authUrl;
}

/**
 * Processa o código de autorização e salva os tokens do usuário
 */
export async function handleAuthCode(code: string, userId: number): Promise<boolean> {
  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      console.error('Erro: Token de acesso não recebido');
      return false;
    }

    // Salvar os tokens no cache temporário
    tokenCache[userId] = tokens;

    // Verificar se já existe um registro para este usuário
    const existingTokens = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));

    // Definir a data de expiração
    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hora a partir de agora, padrão

    if (existingTokens.length > 0) {
      // Atualizar o registro existente
      await db.update(googleTokens)
        .set({
          accessToken: tokens.access_token!,
          refreshToken: tokens.refresh_token ?? existingTokens[0].refreshToken,
          expiryDate: expiryDate,
          updatedAt: new Date()
        })
        .where(eq(googleTokens.userId, userId));
    } else {
      // Criar um novo registro
      await db.insert(googleTokens).values({
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? null,
        expiryDate: expiryDate,
        calendarId: 'primary' // Calendário padrão
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao processar o código de autorização:', error);
    return false;
  }
}

/**
 * Obtém os tokens de um usuário do banco de dados
 */
async function getUserTokens(userId: number): Promise<any | null> {
  // Verificar primeiro o cache
  if (tokenCache[userId]) {
    // Verificar se o token está próximo de expirar e precisa ser atualizado
    const expiryDate = tokenCache[userId].expiry_date;
    if (expiryDate && new Date(expiryDate).getTime() - Date.now() > 60000) {
      return tokenCache[userId];
    }
  }

  // Buscar do banco de dados
  const tokens = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));

  if (tokens.length === 0) {
    return null;
  }

  const userToken = tokens[0];

  // Verificar se o token expirou e precisa ser atualizado usando o refresh token
  if (userToken.expiryDate && new Date(userToken.expiryDate).getTime() <= Date.now()) {
    if (!userToken.refreshToken) {
      return null; // Não pode renovar sem refresh token
    }

    try {
      oauth2Client.setCredentials({
        refresh_token: userToken.refreshToken
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Atualizar o token no banco de dados
      const expiryDate = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await db.update(googleTokens)
        .set({
          accessToken: credentials.access_token!,
          expiryDate: expiryDate,
          updatedAt: new Date()
        })
        .where(eq(googleTokens.userId, userId));

      // Atualizar o cache
      tokenCache[userId] = credentials;

      return credentials;
    } catch (error) {
      console.error('Erro ao renovar o token de acesso:', error);
      return null;
    }
  }

  // Converter para o formato que o oauth2Client espera
  const credentials = {
    access_token: userToken.accessToken,
    refresh_token: userToken.refreshToken,
    expiry_date: userToken.expiryDate?.getTime()
  };

  // Atualizar o cache
  tokenCache[userId] = credentials;

  return credentials;
}

/**
 * Configura o cliente OAuth2 com os tokens do usuário
 */
async function setupClientForUser(userId: number): Promise<calendar_v3.Calendar | null> {
  const tokens = await getUserTokens(userId);

  if (!tokens) {
    return null;
  }

  oauth2Client.setCredentials(tokens);

  // Criar um cliente da API do Calendar
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Adiciona um evento ao Google Calendar do usuário
 */
export async function addEventToCalendar(
  userId: number,
  event: {
    summary: string;
    description: string;
    location?: string;
    startDateTime: string; // formato ISO
    endDateTime: string;   // formato ISO
    attendees?: Array<{ email: string }>;
  }
): Promise<string | null> {
  const calendar = await setupClientForUser(userId);

  if (!calendar) {
    return null;
  }

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startDateTime,
          timeZone: 'America/Sao_Paulo', // Ajuste para seu fuso horário
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: 'America/Sao_Paulo', // Ajuste para seu fuso horário
        },
        attendees: event.attendees,
        reminders: {
          useDefault: true,
        },
      },
    });

    return response.data.id || null;
  } catch (error) {
    console.error('Erro ao adicionar evento ao calendário:', error);
    return null;
  }
}

/**
 * Atualiza um evento no Google Calendar do usuário
 */
export async function updateCalendarEvent(
  userId: number,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    attendees?: Array<{ email: string }>;
  }
): Promise<boolean> {
  const calendar = await setupClientForUser(userId);

  if (!calendar) {
    return false;
  }

  try {
    // Primeiro, obter o evento atual
    const currentEvent = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
    });

    // Preparar o corpo da solicitação
    const requestBody: any = {
      ...currentEvent.data,
      summary: event.summary ?? currentEvent.data.summary,
      description: event.description ?? currentEvent.data.description,
      location: event.location ?? currentEvent.data.location,
    };

    // Atualizar horários, se fornecidos
    if (event.startDateTime) {
      requestBody.start = {
        dateTime: event.startDateTime,
        timeZone: 'America/Sao_Paulo',
      };
    }

    if (event.endDateTime) {
      requestBody.end = {
        dateTime: event.endDateTime,
        timeZone: 'America/Sao_Paulo',
      };
    }

    // Atualizar attendees, se fornecidos
    if (event.attendees) {
      requestBody.attendees = event.attendees;
    }

    await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: requestBody,
    });

    return true;
  } catch (error) {
    console.error('Erro ao atualizar evento no calendário:', error);
    return false;
  }
}

/**
 * Remove um evento do Google Calendar do usuário
 */
export async function deleteCalendarEvent(userId: number, eventId: string): Promise<boolean> {
  const calendar = await setupClientForUser(userId);

  if (!calendar) {
    return false;
  }

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });

    return true;
  } catch (error) {
    console.error('Erro ao remover evento do calendário:', error);
    return false;
  }
}

/**
 * Lista os próximos eventos do calendário do usuário
 */
export async function listUpcomingEvents(userId: number, maxResults = 10): Promise<any[] | null> {
  const calendar = await setupClientForUser(userId);

  if (!calendar) {
    return null;
  }

  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Erro ao listar eventos do calendário:', error);
    return null;
  }
}

/**
 * Verifica se o usuário está autenticado com o Google Calendar
 */
export async function isUserAuthenticated(userId: number): Promise<boolean> {
  try {
    const tokens = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));
    return tokens.length > 0;
  } catch (error) {
    console.error('Erro ao verificar autenticação do usuário:', error);
    return false;
  }
}

/**
 * Retorna um link para agendamento do Google Calendar
 */
export function getAppointmentSchedulingLink(
  psychologistUserId: number,
  eventData: {
    summary: string;
    date: string;
    startTime: string;
    endTime: string;
    details?: string;
  }
): string {
  // URL de agendamento estática semelhante ao exemplo fornecido
  // Este é um exemplo de URL fixa de scheduling page do Google Calendar
  return "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3aKuNW3rK7lCY0OqdA6kDDjma9niQdzEMxU7GkWhEfBGHjPHUcrX27OIVwwR9WMc2HZ04Uaj-C";
}

/**
 * Cria um evento de agendamento no Google Calendar e retorna o link para compartilhar
 * @deprecated Use getAppointmentSchedulingLink em vez disso
 */
export async function createBookingEvent(
  psychologistUserId: number,
  eventData: {
    summary: string;
    date: string;
    startTime: string;
    endTime: string;
    details?: string;
  }
): Promise<string> {
  try {
    // Verificar se o psicólogo está autenticado no Google Calendar
    const isAuthenticated = await isUserAuthenticated(psychologistUserId);
    if (!isAuthenticated) {
      console.error('Psicólogo não está autenticado no Google Calendar');
      // Retorna o link fixo de agendamento em vez de null
      return getAppointmentSchedulingLink(psychologistUserId, eventData);
    }

    // Formatar datas para o Google Calendar
    const startDateTime = new Date(`${eventData.date}T${eventData.startTime}:00`);
    const endDateTime = new Date(`${eventData.date}T${eventData.endTime}:00`);

    // Criar um evento com status tentative (provisório)
    const event = {
      summary: `${eventData.summary} (Disponível)`,
      description: eventData.details || 'Clique no link para agendar este horário.',
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      location: 'Consultório',
    };

    try {
      // Adicionar o evento ao calendário
      const eventId = await addEventToCalendar(psychologistUserId, event);

      if (!eventId) {
        console.error('Não foi possível criar o evento no Google Calendar');
        return getAppointmentSchedulingLink(psychologistUserId, eventData);
      }

      // Obter o token do usuário para acessar o evento
      const userTokens = await db.select().from(googleTokens).where(eq(googleTokens.userId, psychologistUserId));
      if (!userTokens || userTokens.length === 0) {
        return getAppointmentSchedulingLink(psychologistUserId, eventData);
      }

      // Obter o calendarId (normalmente "primary")
      const calendarId = userTokens[0].calendarId || 'primary';

      // Criar link de agendamento direto
      const eventLink = `https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=${encodeURIComponent(eventId)}&tmsrc=${encodeURIComponent(calendarId)}`;

      return eventLink;
    } catch (error) {
      console.error('Erro ao interagir com o Google Calendar:', error);
      return getAppointmentSchedulingLink(psychologistUserId, eventData);
    }
  } catch (error) {
    console.error('Erro ao criar evento de agendamento:', error);
    return getAppointmentSchedulingLink(psychologistUserId, eventData);
  }
}