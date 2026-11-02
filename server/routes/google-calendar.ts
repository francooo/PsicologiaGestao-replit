import { Router } from 'express';
import * as googleCalendarService from '../services/google-calendar';

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

// Desconectar o Google Calendar do usuário logado
router.delete('/auth', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  try {
    await googleCalendarService.disconnectUser(req.user.id);
    res.json({ authenticated: false });
  } catch (error) {
    console.error('Erro ao desconectar Google Calendar:', error);
    res.status(500).json({ error: 'Não foi possível desconectar o Google Calendar' });
  }
});

// Consultas vão para a agenda sozinhas ao salvar: ver server/lib/appointment-calendar.ts

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