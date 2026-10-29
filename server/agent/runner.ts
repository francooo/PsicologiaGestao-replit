import { and, asc, desc, eq, gt, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { agentConversations, agentMessages, type AgentMessage } from "@shared/schema";
import { groq, GROQ_TEXT_MODEL, reasoningOptions, logGroqError, AIQuotaError, AIServiceError } from "../services/ai";
import type { AgentContext } from "./context";
import { systemPrompt } from "./prompt";
import { runTool, toolDefinitions } from "./tools";

const MAX_ROUNDS = 6;
const HISTORY = 30;
const TOOL_RESULT_CHARS = 12000;
// Vercel kills the function at 60s: never wait on the model past this, answer "busy" instead
const TURN_DEADLINE_MS = 45_000;

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type Completion = (
  req: { messages: ChatMessage[]; tools: ReturnType<typeof toolDefinitions> },
  timeoutMs: number,
) => Promise<{ content: string | null; tool_calls?: ToolCall[] }>;

/** The model call; tests swap it for a scripted one. */
let complete: Completion = async ({ messages, tools }, timeoutMs: number) => {
  try {
    const res = await groq.chat.completions.create(
      {
        model: GROQ_TEXT_MODEL,
        messages: messages as any,
        tools: tools as any,
        tool_choice: "auto",
        temperature: 0.2,
        max_completion_tokens: 1500,
        ...reasoningOptions(GROQ_TEXT_MODEL),
      } as any,
      // The SDK retries 429s after Groq's retry-after; keep that inside the turn's time budget
      { timeout: Math.max(timeoutMs, 1000), maxRetries: 1 },
    );
    const msg = (res as any).choices[0].message;
    return { content: msg.content ?? null, tool_calls: msg.tool_calls?.length ? msg.tool_calls : undefined };
  } catch (error) {
    logGroqError("agent", GROQ_TEXT_MODEL, error);
    // Groq's per-minute token limit, or the turn's time budget ran out while waiting on it
    if ((error as { status?: number }).status === 429 || (error as Error).name === "APIConnectionTimeoutError") {
      throw new AIQuotaError("O assistente está ocupado agora. Tente de novo em instantes.");
    }
    throw new AIServiceError("Não consegui falar com a IA agora. Tente de novo.");
  }
};

export function setAgentCompletion(fn: Completion) {
  complete = fn;
}

/** The user's current conversation in the active company (created on first use). */
export async function currentConversation(ctx: AgentContext, create: boolean) {
  const [conv] = await db
    .select()
    .from(agentConversations)
    .where(and(eq(agentConversations.userId, ctx.userId), eq(agentConversations.companyId, ctx.companyId)))
    .orderBy(desc(agentConversations.updatedAt), desc(agentConversations.id))
    .limit(1);
  if (conv || !create) return conv;
  return newConversation(ctx);
}

export async function newConversation(ctx: AgentContext) {
  const [conv] = await db.insert(agentConversations).values({ companyId: ctx.companyId, userId: ctx.userId }).returning();
  return conv;
}

/** Messages the user typed in the last hour, across conversations (cost guard). */
export async function messagesLastHour(ctx: AgentContext) {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(agentMessages)
    .innerJoin(agentConversations, eq(agentConversations.id, agentMessages.conversationId))
    .where(
      and(
        eq(agentConversations.userId, ctx.userId),
        eq(agentMessages.role, "user"),
        gt(agentMessages.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
      ),
    );
  return Number(row?.n ?? 0);
}

async function save(conversationId: number, values: Omit<typeof agentMessages.$inferInsert, "conversationId">) {
  const [row] = await db
    .insert(agentMessages)
    .values({ ...values, conversationId })
    .returning();
  return row;
}

/** Last messages as the model expects them; never starts mid tool-exchange. */
async function history(conversationId: number): Promise<ChatMessage[]> {
  const rows = (
    await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.conversationId, conversationId))
      .orderBy(desc(agentMessages.id))
      .limit(HISTORY)
  ).reverse();
  const first = rows.findIndex((m) => m.role === "user");
  return (first < 0 ? [] : rows.slice(first)).map(toChat);
}

function toChat(m: AgentMessage): ChatMessage {
  if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId ?? "", content: m.content };
  if (m.role === "assistant") {
    const calls = m.toolCalls as ToolCall[] | null;
    return calls?.length ? { role: "assistant", content: m.content || null, tool_calls: calls } : { role: "assistant", content: m.content };
  }
  return { role: "user", content: m.content };
}

/**
 * One user turn: store the message, let the model call tools until it answers in text,
 * store everything (so the next turn has the context) and return the reply.
 */
export async function runAgent(ctx: AgentContext, conversationId: number, text: string, viaAudio: boolean) {
  const userMessage = await save(conversationId, { role: "user", content: text, viaAudio });
  const tools = toolDefinitions(ctx);
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt(ctx) }, ...(await history(conversationId))];
  let actionId: number | undefined;
  let reply: AgentMessage | undefined;

  const deadline = Date.now() + TURN_DEADLINE_MS;
  try {
    for (let round = 0; round < MAX_ROUNDS && !reply; round++) {
      const left = deadline - Date.now();
      if (left < 3000) throw new AIQuotaError("O assistente está demorando mais que o normal. Tente de novo em instantes.");
      const out = await complete({ messages, tools }, left);
      if (!out.tool_calls?.length) {
        reply = await save(conversationId, {
          role: "assistant",
          content: out.content?.trim() || "Não entendi. Pode repetir de outro jeito?",
          actionId,
        });
        break;
      }
      await save(conversationId, { role: "assistant", content: out.content ?? "", toolCalls: out.tool_calls });
      messages.push({ role: "assistant", content: out.content, tool_calls: out.tool_calls });
      for (const call of out.tool_calls) {
        const result = await runTool(ctx, call.function.name, call.function.arguments, conversationId);
        if (result.actionId) actionId = result.actionId;
        const content = JSON.stringify(result.data).slice(0, TOOL_RESULT_CHARS);
        await save(conversationId, { role: "tool", content, toolCallId: call.id, actionId: result.actionId });
        messages.push({ role: "tool", tool_call_id: call.id, content });
      }
    }
  } catch (error) {
    // A half-finished turn (tool calls without results) would break the next request to the model
    await db.delete(agentMessages).where(and(eq(agentMessages.conversationId, conversationId), gte(agentMessages.id, userMessage.id)));
    throw error;
  }
  reply ??= await save(conversationId, {
    role: "assistant",
    content: "Não consegui concluir esse pedido. Pode tentar de um jeito mais simples?",
    actionId,
  });
  await db.update(agentConversations).set({ updatedAt: new Date() }).where(eq(agentConversations.id, conversationId));
  return { userMessage, reply };
}

/** What the chat shows: what the user said and the assistant's text answers. */
export async function visibleMessages(conversationId: number) {
  const rows = await db.select().from(agentMessages).where(eq(agentMessages.conversationId, conversationId)).orderBy(asc(agentMessages.id));
  return rows.filter(
    (m) => m.role === "user" || (m.role === "assistant" && m.content.trim() && !(m.toolCalls as unknown[] | null)?.length),
  );
}
