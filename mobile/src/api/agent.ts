import { useQuery } from '@tanstack/react-query';

import { api } from './client';
import { appendFile } from '@/utils/files';

// The assistant (chat with tools). Same API as the web panel: server/routes/agent.ts

export type AgentActionStatus = 'pending' | 'processing' | 'confirmed' | 'cancelled' | 'expired' | 'failed';

export interface AgentAction {
  id: number;
  type: 'room_booking.create' | 'room_booking.cancel';
  status: AgentActionStatus;
  payload: { roomName: string; psychologistName: string; date: string; startTime: string; endTime: string; purpose?: string | null };
  result: { error?: string; bookingId?: number } | null;
  expiresAt: string;
}

export interface AgentMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  viaAudio: boolean;
  createdAt: string;
  action: AgentAction | null;
}

export interface AgentConversation {
  conversationId: number | null;
  messages: AgentMessage[];
}

export const AGENT_CONVERSATION_KEY = ['/api/agent/conversation'];

export const useAgentStatus = (enabled: boolean) =>
  useQuery({
    queryKey: ['/api/agent/status'],
    queryFn: () => api<{ enabled: boolean }>('/api/agent/status'),
    enabled,
    staleTime: 5 * 60_000,
  });

export const useAgentConversation = () =>
  useQuery({ queryKey: AGENT_CONVERSATION_KEY, queryFn: () => api<AgentConversation>('/api/agent/conversation') });

export const sendAgentMessage = (text: string, viaAudio: boolean) =>
  api<{ conversationId: number; userMessage: AgentMessage; reply: AgentMessage }>('/api/agent/messages', {
    method: 'POST',
    body: { text, viaAudio },
  });

export const resolveAgentAction = (id: number, verb: 'confirm' | 'cancel') =>
  api<{ action: AgentAction; message: AgentMessage }>(`/api/agent/actions/${id}/${verb}`, { method: 'POST' });

export const newAgentConversation = () => api<AgentConversation>('/api/agent/conversation/new', { method: 'POST' });

/** Speech to text for a recorded voice message (m4a from expo-audio). */
export async function transcribeAudio(uri: string) {
  const form = new FormData();
  appendFile(form, 'audio', { uri, name: 'mensagem.m4a', type: 'audio/m4a' });
  return (await api<{ text: string }>('/api/agent/transcribe', { method: 'POST', body: form })).text;
}
