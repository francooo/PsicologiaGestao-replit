import { useCallback, useEffect, useRef, useState } from 'react';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as Speech from 'expo-speech';

// Voice in (expo-audio -> /api/agent/transcribe) and voice out (expo-speech, the phone's own voice).

const MAX_MS = 60_000;

/** Records up to a minute; `stop(true)` hands the file to onDone, `stop(false)` throws it away. */
export function useVoiceRecorder(onDone: (uri: string) => void, onError: (message: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const active = useRef(false);

  const stop = useCallback(
    async (send: boolean) => {
      if (!active.current) return;
      active.current = false;
      if (timer.current) clearInterval(timer.current);
      setRecording(false);
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
      } catch {
        // already stopped
      }
      if (send && recorder.uri) onDone(recorder.uri);
    },
    [recorder, onDone],
  );

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      onError('Libere o microfone para o ConsultaPsi nas configurações do celular.');
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      onError('Não consegui começar a gravação.');
      return;
    }
    active.current = true;
    setRecording(true);
    setElapsed(0);
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const ms = Date.now() - startedAt;
      setElapsed(Math.floor(ms / 1000));
      if (ms >= MAX_MS) stop(true);
    }, 250);
  }, [recorder, onError, stop]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return { recording, elapsed, start, stop };
}

/** Plain text for the voice: no markdown marks. */
const spoken = (text: string) =>
  text
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Reads one message at a time; `speakingId` is the message being read (null when quiet). */
export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const stop = useCallback(() => {
    Speech.stop();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: number, text: string) => {
    Speech.stop();
    setSpeakingId(id);
    const done = () => setSpeakingId((cur) => (cur === id ? null : cur));
    Speech.speak(spoken(text), { language: 'pt-BR', onDone: done, onStopped: done, onError: done });
  }, []);

  useEffect(() => () => void Speech.stop(), []);

  return { speakingId, speak, stop };
}
