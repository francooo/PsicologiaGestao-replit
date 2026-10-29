import { useCallback, useEffect, useRef, useState } from "react";

// Voice in (MediaRecorder -> /api/agent/transcribe) and voice out (the browser's speechSynthesis).

const MAX_MS = 60_000;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

export const canRecord = () =>
  typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/** Records up to a minute; `stop(true)` hands the audio to onDone, `stop(false)` throws it away. */
export function useVoiceRecorder(onDone: (audio: Blob) => void, onError: (message: string) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const keep = useRef(false);
  const timer = useRef<number>();

  const stop = useCallback((send: boolean) => {
    keep.current = send;
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Não consegui acessar o microfone. Libere a permissão no navegador e tente de novo.");
      return;
    }
    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      window.clearInterval(timer.current);
      setRecording(false);
      recorder.current = null;
      if (keep.current && chunks.length) onDone(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
    };
    recorder.current = rec;
    keep.current = false;
    rec.start();
    setRecording(true);
    setElapsed(0);
    const startedAt = Date.now();
    timer.current = window.setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(Math.floor(ms / 1000));
      if (ms >= MAX_MS) stop(true);
    }, 250);
  }, [onDone, onError, stop]);

  // Closing the panel mid-recording releases the microphone
  useEffect(() => () => stop(false), [stop]);

  return { recording, elapsed, start, stop };
}

export async function transcribe(audio: Blob): Promise<string> {
  const form = new FormData();
  const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  form.append("audio", audio, `mensagem.${ext}`);
  const res = await fetch("/api/agent/transcribe", { method: "POST", body: form, credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()).text;
}

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Plain text for the voice: no markdown marks. */
const spoken = (text: string) => text.replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "").replace(/\s+/g, " ").trim();

/** Reads one message at a time; `speakingId` is the message being read (null when quiet). */
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const stop = useCallback(() => {
    if (canSpeak()) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: number, text: string) => {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken(text));
    utterance.lang = "pt-BR";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt-br"));
    if (voice) utterance.voice = voice;
    utterance.onend = utterance.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur));
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => stop, [stop]);

  return { speakingId, speak, stop };
}
