// Shapes returned by /api/agent (server/routes/agent.ts)

export type AgentActionStatus = "pending" | "processing" | "confirmed" | "cancelled" | "expired" | "failed";

export type AgentAction = {
  id: number;
  type: "room_booking.create" | "room_booking.cancel";
  status: AgentActionStatus;
  payload: {
    roomName: string;
    psychologistName: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose?: string | null;
  };
  result: { error?: string; bookingId?: number } | null;
  expiresAt: string;
};

export type AgentMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  viaAudio: boolean;
  createdAt: string;
  action: AgentAction | null;
};

export type AgentConversation = { conversationId: number | null; messages: AgentMessage[] };

export const CONVERSATION_KEY = ["/api/agent/conversation"];
