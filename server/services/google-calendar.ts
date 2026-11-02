import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from '../db';
import { googleTokens, calendarEvents, appointments } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Único escopo pedido: criar, editar e excluir eventos (é o que a Política de Privacidade
// declara para a verificação do Google). Convites saem pelo próprio Calendar (sendUpdates).
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// Marca os eventos criados pelo sistema; a listagem só mostra esses (não lemos o resto da agenda)
const APP_EVENT_TAG = 'consultapsi';
const appEventProperties = { private: { [APP_EVENT_TAG]: '1' } };

// Redirect URI para o callback do Google Calendar OAuth
// Usa GOOGLE_REDIRECT_URI se definido, caso contrário constrói a partir do domínio do Replit
function buildCalendarRedirectUri(): string | undefined {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  // GOOGLE_CALLBACK_URL aponta para o callback do Passport (/auth/google/callback),
  // NÃO deve ser usado aqui. Construímos o URI correto a partir do domínio de produção.
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) {
    return `https://${replitDomain}/api/google-calendar/auth/callback`;
  }
  return undefined;
}

const REDIRECT_URI = buildCalendarRedirectUri();

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
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
        extendedProperties: appEventProperties,
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
  },
  // 'all' avisa os convidados (ex.: a paciente de uma reunião remarcada)
  sendUpdates: 'all' | 'none' = 'none'
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
      sendUpdates,
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
export async function deleteCalendarEvent(
  userId: number,
  eventId: string,
  sendUpdates: 'all' | 'none' = 'none'
): Promise<boolean> {
  const calendar = await setupClientForUser(userId);

  if (!calendar) {
    return false;
  }

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates,
    });

    return true;
  } catch (error) {
    console.error('Erro ao remover evento do calendário:', error);
    return false;
  }
}

/**
 * Lista os próximos eventos criados pelo sistema na agenda do usuário
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
      privateExtendedProperty: [`${APP_EVENT_TAG}=1`],
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
 * Desconecta o Google Calendar do usuário: tenta revogar o token no Google e
 * apaga os tokens salvos (a remoção local acontece mesmo se a revogação falhar).
 */
export async function disconnectUser(userId: number): Promise<void> {
  const [row] = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));
  const token = row?.refreshToken || row?.accessToken;
  if (token) {
    try {
      await oauth2Client.revokeToken(token);
    } catch (error) {
      console.warn('Não foi possível revogar o token do Google (seguindo com a remoção local):', error);
    }
  }
  await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
  delete tokenCache[userId];
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
 * Cria um evento de reunião no Google Calendar com link do Google Meet
 */
export async function createMeetingEvent(
  userId: number,
  event: {
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    /** Convidada que recebe o convite do Google Calendar (com o link do Meet) */
    inviteEmail?: string;
    requestId: string;
  }
): Promise<{ googleEventId: string; meetLink: string | null } | null> {
  const calendar = await setupClientForUser(userId);
  if (!calendar) return null;

  try {
    const attendees: Array<{ email: string }> = [];
    if (event.inviteEmail) attendees.push({ email: event.inviteEmail });

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: attendees.length > 0 ? 'all' : 'none',
      requestBody: {
        summary: event.summary,
        description: event.description || 'Sessão de psicologia — ConsultaPsi',
        start: {
          dateTime: event.startDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        conferenceData: {
          createRequest: {
            requestId: event.requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        attendees: attendees.length > 0 ? attendees : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
        extendedProperties: appEventProperties,
      },
    });

    const meetLink =
      response.data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video'
      )?.uri ?? null;

    return { googleEventId: response.data.id!, meetLink };
  } catch (error) {
    // Re-throw token-expiry errors so the route layer can map them to 401
    if (isGoogleTokenExpired(error)) throw error;
    console.error('Erro ao criar evento de reunião:', error);
    return null;
  }
}

/**
 * Detecta se um erro da Google API é causado por token expirado/revogado.
 */
export function isGoogleTokenExpired(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  if (e.code === 401) return true;
  const message = String(e.message || '');
  return (
    message.includes('invalid_grant') ||
    message.includes('Token has been expired') ||
    message.includes('token expired') ||
    message.includes('Invalid Credentials')
  );
}

/**
 * Convida a paciente para o evento da reunião: o próprio Google Calendar envia o convite
 * por e-mail com o link do Meet (sem Gmail). Lança o erro de token expirado para a rota.
 */
export async function inviteToMeetingEvent(userId: number, eventId: string, email: string): Promise<boolean> {
  const calendar = await setupClientForUser(userId);
  if (!calendar) return false;

  try {
    const current = await calendar.events.get({ calendarId: 'primary', eventId });
    const others = (current.data.attendees ?? []).filter((a) => a.email?.toLowerCase() !== email.toLowerCase());
    await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
      requestBody: { attendees: [...others, { email }] },
    });
    return true;
  } catch (error) {
    if (isGoogleTokenExpired(error)) throw error;
    console.error('Erro ao convidar a paciente para a reunião:', error);
    return false;
  }
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