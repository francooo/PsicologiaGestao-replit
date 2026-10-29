import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Mic, RotateCcw, SendHorizontal, Sparkles, Square, Volume2, VolumeX, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { errorMessage } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { ActionCard } from "./ActionCard";
import { canRecord, canSpeak, transcribe, useSpeech, useVoiceRecorder } from "./voice";
import { CONVERSATION_KEY, type AgentAction, type AgentConversation, type AgentMessage } from "./types";

const SUGGESTIONS = ["Reservar uma sala", "Quantas pessoas têm reserva de sala este mês?", "Minha agenda de hoje", "Quais salas estão livres amanhã à tarde?"];

const setConversation = (update: (c: AgentConversation) => AgentConversation) =>
  queryClient.setQueryData<AgentConversation>(CONVERSATION_KEY, (c) => update(c ?? { conversationId: null, messages: [] }));

/** The assistant's chat: text or voice in, text (and optionally voice) out, confirmation cards for actions. */
export function AgentPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<{ text: string; viaAudio: boolean } | null>(null);
  const [actionBusy, setActionBusy] = useState<{ id: number; verb: "confirm" | "cancel" } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const { speakingId, speak, stop: stopSpeaking } = useSpeech();

  const { data, isLoading } = useQuery<AgentConversation>({ queryKey: CONVERSATION_KEY });
  const messages = data?.messages ?? [];

  const fail = useCallback((title: string, error: unknown) => toast({ title, description: errorMessage(error), variant: "destructive" }), [toast]);

  const send = useMutation({
    mutationFn: async (msg: { text: string; viaAudio: boolean }) =>
      (await apiRequest("POST", "/api/agent/messages", msg)).json() as Promise<{ conversationId: number; userMessage: AgentMessage; reply: AgentMessage }>,
    onMutate: (msg) => setPending(msg),
    onSuccess: (res, msg) => {
      setConversation((c) => ({ conversationId: res.conversationId, messages: [...c.messages, res.userMessage, res.reply] }));
      if (msg.viaAudio) speak(res.reply.id, res.reply.content);
    },
    onError: (error, msg) => {
      if (!msg.viaAudio) setText(msg.text);
      fail("O assistente não respondeu", error);
    },
    onSettled: () => setPending(null),
  });

  const submit = (value: string, viaAudio = false) => {
    const clean = value.trim();
    if (!clean || send.isPending) return;
    setText("");
    send.mutate({ text: clean, viaAudio });
  };

  const voice = useMutation({
    mutationFn: transcribe,
    onSuccess: (spokenText) => submit(spokenText, true),
    onError: (error) => fail("Não consegui transcrever", error),
  });
  const recorder = useVoiceRecorder(
    useCallback((audio: Blob) => voice.mutate(audio), [voice]),
    useCallback((message: string) => toast({ title: "Microfone indisponível", description: message, variant: "destructive" }), [toast]),
  );

  const resolveAction = useMutation({
    mutationFn: async ({ id, verb }: { id: number; verb: "confirm" | "cancel" }) =>
      (await apiRequest("POST", `/api/agent/actions/${id}/${verb}`)).json() as Promise<{ action: AgentAction; message: AgentMessage }>,
    onMutate: (v) => setActionBusy(v),
    onSuccess: (res) => {
      setConversation((c) => ({
        ...c,
        messages: [...c.messages.map((m) => (m.action?.id === res.action.id ? { ...m, action: res.action } : m)), res.message],
      }));
      if (res.action.status === "confirmed") {
        // Salas, Agenda and the dashboard show bookings
        queryClient.invalidateQueries({ queryKey: ["/api/room-bookings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      }
    },
    onError: (error) => {
      // 409/410 bring the action's new state; reload to show it
      queryClient.invalidateQueries({ queryKey: CONVERSATION_KEY });
      fail("Não foi possível concluir", error);
    },
    onSettled: () => setActionBusy(null),
  });

  const restart = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/agent/conversation/new")).json() as Promise<AgentConversation>,
    onSuccess: (conv) => {
      stopSpeaking();
      queryClient.setQueryData(CONVERSATION_KEY, conv);
      input.current?.focus();
    },
    onError: (error) => fail("Não foi possível começar outra conversa", error),
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending, actionBusy]);

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const busy = send.isPending || voice.isPending;
  const firstName = user?.fullName.split(" ")[0] ?? "";

  return (
    <section
      role="dialog"
      aria-label="Assistente"
      className="fixed inset-0 z-50 flex flex-col bg-cp-bg md:inset-auto md:bottom-6 md:right-6 md:h-[min(640px,calc(100vh-48px))] md:w-[400px] md:overflow-hidden md:rounded-2xl md:border md:border-cp-divider md:shadow-[0_24px_60px_-20px_rgba(36,54,71,0.35)]"
    >
      <header className="flex items-center gap-3 border-b border-cp-divider bg-white px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cp-sage-soft text-cp-sage-ink">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-semibold leading-tight text-cp-ink">Assistente</h2>
          <p className="truncate text-xs text-cp-muted">{user?.activeCompany?.name}</p>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-hover hover:text-cp-ink disabled:opacity-50"
          onClick={() => restart.mutate()}
          disabled={restart.isPending || busy || messages.length === 0}
          aria-label="Nova conversa"
          title="Nova conversa"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-lg p-2 text-cp-muted transition-colors hover:bg-cp-hover hover:text-cp-ink"
          onClick={onClose}
          aria-label="Fechar assistente"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-cp-action" /></div>
        ) : messages.length === 0 && !pending ? (
          <div className="flex flex-col items-center px-2 pt-6 text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-cp-sage-soft text-cp-sage-ink">
              <Sparkles className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="text-[17px] font-semibold text-cp-ink">Olá{firstName ? `, ${firstName}` : ""}! Como posso ajudar?</p>
            <p className="mt-1 text-sm text-cp-muted">Pergunte sobre agenda e salas, ou peça uma reserva. Pode escrever ou mandar áudio.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-full border border-cp-divider bg-white px-3 py-1.5 text-[13px] text-cp-ink transition-colors hover:border-cp-action hover:text-cp-action"
                  onClick={() => (s === "Reservar uma sala" ? (setText("Quero reservar uma sala "), input.current?.focus()) : submit(s))}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <Bubble key={m.id} message={m}>
              {m.role === "assistant" && canSpeak() && (
                <button
                  type="button"
                  className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-cp-muted transition-colors hover:bg-cp-hover hover:text-cp-ink"
                  onClick={() => (speakingId === m.id ? stopSpeaking() : speak(m.id, m.content))}
                  aria-label={speakingId === m.id ? "Parar leitura" : "Ouvir resposta"}
                >
                  {speakingId === m.id ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {speakingId === m.id ? "Parar" : "Ouvir"}
                </button>
              )}
              {m.action && (
                <ActionCard
                  action={m.action}
                  busy={actionBusy?.id === m.action.id ? actionBusy.verb : null}
                  onConfirm={() => resolveAction.mutate({ id: m.action!.id, verb: "confirm" })}
                  onCancel={() => resolveAction.mutate({ id: m.action!.id, verb: "cancel" })}
                />
              )}
            </Bubble>
          ))
        )}
        {pending && <Bubble message={{ id: -1, role: "user", content: pending.text, viaAudio: pending.viaAudio, createdAt: "", action: null }} />}
        {(busy || pending) && (
          <div className="flex items-center gap-2 text-[13px] text-cp-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {voice.isPending ? "Transcrevendo o áudio…" : "Pensando…"}
          </div>
        )}
      </div>

      <footer className="border-t border-cp-divider bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {recorder.recording ? (
          <div className="flex items-center gap-3 rounded-xl bg-cp-danger-soft px-3 py-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-cp-danger" aria-hidden="true" />
            <span className="flex-1 text-sm font-medium text-cp-ink">
              Gravando… {`0:${String(recorder.elapsed).padStart(2, "0")}`} <span className="text-cp-muted">(até 1 min)</span>
            </span>
            <button type="button" className="rounded-lg p-2 text-cp-muted hover:bg-white hover:text-cp-ink" onClick={() => recorder.stop(false)} aria-label="Descartar áudio">
              <X className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-cp-danger text-white" onClick={() => recorder.stop(true)} aria-label="Parar e enviar">
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>
        ) : (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(text);
            }}
          >
            <textarea
              ref={input}
              rows={1}
              value={text}
              maxLength={2000}
              onChange={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(text);
                }
              }}
              placeholder="Escreva sua mensagem…"
              aria-label="Mensagem para o assistente"
              className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-xl border border-cp-border bg-white px-3.5 py-2.5 text-[15px] text-cp-ink placeholder:text-cp-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-cp-action"
            />
            {canRecord() && !text.trim() ? (
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cp-sage-soft text-cp-sage-ink transition-colors hover:bg-cp-sage hover:text-white disabled:opacity-50"
                onClick={() => {
                  stopSpeaking();
                  recorder.start();
                }}
                disabled={busy}
                aria-label="Gravar áudio"
                title="Gravar áudio"
              >
                <Mic className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="submit"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cp-action text-white transition-colors hover:bg-cp-action-hover disabled:opacity-50"
                disabled={busy || !text.trim()}
                aria-label="Enviar"
              >
                <SendHorizontal className="h-5 w-5" />
              </button>
            )}
          </form>
        )}
      </footer>
    </section>
  );
}

function Bubble({ message, children }: { message: AgentMessage; children?: ReactNode }) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed",
          mine ? "rounded-br-md bg-cp-sage-soft text-cp-ink" : "rounded-bl-md border border-cp-divider bg-white text-cp-ink",
          message.id < 0 && "opacity-70",
        )}
      >
        {mine && message.viaAudio && <Mic className="mr-1 inline h-3.5 w-3.5 -translate-y-px text-cp-sage-ink" aria-label="Mensagem de voz" />}
        <RichText text={message.content} />
      </div>
      {children && <div className="w-full max-w-[88%]">{children}</div>}
    </div>
  );
}

/** The assistant's light markdown: **bold** and "- " lists, rendered as elements (no HTML injection). */
function RichText({ text }: { text: string }) {
  const bold = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`l${blocks.length}`} className="my-1 list-disc space-y-0.5 pl-5">{list.map((li, i) => <li key={i}>{bold(li)}</li>)}</ul>);
    list = [];
  };
  for (const line of text.split("\n")) {
    const item = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (item) list.push(item[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={`p${blocks.length}`} className="[&:not(:first-child)]:mt-1.5">{bold(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}
