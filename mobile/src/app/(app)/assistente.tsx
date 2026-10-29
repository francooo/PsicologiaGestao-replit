import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mic, RotateCcw, SendHorizontal, Sparkles, Square, Volume2, VolumeX, X } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/IconButton';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ActionCard } from '@/components/agent/ActionCard';
import { useSpeech, useVoiceRecorder } from '@/components/agent/voice';
import {
  AGENT_CONVERSATION_KEY,
  newAgentConversation,
  resolveAgentAction,
  sendAgentMessage,
  transcribeAudio,
  useAgentConversation,
  type AgentConversation,
  type AgentMessage,
} from '@/api/agent';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from '@/utils/toast';
import { colors, fonts, radius } from '@/theme/tokens';

const SUGGESTIONS = ['Quantas pessoas têm reserva de sala este mês?', 'Minha agenda de hoje', 'Quais salas estão livres amanhã à tarde?'];

/** The assistant's chat (opened by the floating button): text or voice in, text and voice out. */
export default function AssistantScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const conversation = useAgentConversation();
  const list = useRef<FlatList<AgentMessage>>(null);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<{ text: string; viaAudio: boolean } | null>(null);
  const [actionBusy, setActionBusy] = useState<{ id: number; verb: 'confirm' | 'cancel' } | null>(null);
  const { speakingId, speak, stop: stopSpeaking } = useSpeech();
  const messages = conversation.data?.messages ?? [];

  const update = (fn: (c: AgentConversation) => AgentConversation) =>
    queryClient.setQueryData<AgentConversation>(AGENT_CONVERSATION_KEY, (c) => fn(c ?? { conversationId: null, messages: [] }));

  const send = useMutation({
    mutationFn: (msg: { text: string; viaAudio: boolean }) => sendAgentMessage(msg.text, msg.viaAudio),
    onMutate: (msg) => setPending(msg),
    onSuccess: (res, msg) => {
      update((c) => ({ conversationId: res.conversationId, messages: [...c.messages, res.userMessage, res.reply] }));
      if (msg.viaAudio) speak(res.reply.id, res.reply.content);
    },
    onError: (e: Error, msg) => {
      if (!msg.viaAudio) setText(msg.text);
      toast.error('O assistente não respondeu', e.message);
    },
    onSettled: () => setPending(null),
  });

  const submit = (value: string, viaAudio = false) => {
    const clean = value.trim();
    if (!clean || send.isPending) return;
    setText('');
    send.mutate({ text: clean, viaAudio });
  };

  const voice = useMutation({
    mutationFn: transcribeAudio,
    onSuccess: (spokenText) => submit(spokenText, true),
    onError: (e: Error) => toast.error('Não consegui transcrever', e.message),
  });
  const onAudio = useCallback((uri: string) => voice.mutate(uri), [voice]);
  const onMicError = useCallback((message: string) => toast.error('Microfone indisponível', message), []);
  const recorder = useVoiceRecorder(onAudio, onMicError);

  const resolve = useMutation({
    mutationFn: (v: { id: number; verb: 'confirm' | 'cancel' }) => resolveAgentAction(v.id, v.verb),
    onMutate: (v) => setActionBusy(v),
    onSuccess: (res) => {
      update((c) => ({
        ...c,
        messages: [...c.messages.map((m) => (m.action?.id === res.action.id ? { ...m, action: res.action } : m)), res.message],
      }));
      if (res.action.status === 'confirmed') {
        queryClient.invalidateQueries({ queryKey: ['/api/room-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      }
    },
    onError: (e: Error) => {
      queryClient.invalidateQueries({ queryKey: AGENT_CONVERSATION_KEY });
      toast.error('Não foi possível concluir', e.message);
    },
    onSettled: () => setActionBusy(null),
  });

  const restart = useMutation({
    mutationFn: newAgentConversation,
    onSuccess: (conv) => {
      stopSpeaking();
      queryClient.setQueryData(AGENT_CONVERSATION_KEY, conv);
    },
    onError: (e: Error) => toast.error('Não foi possível começar outra conversa', e.message),
  });

  const busy = send.isPending || voice.isPending;
  const firstName = user?.fullName.split(' ')[0] ?? '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Assistente',
          headerRight: () =>
            messages.length > 0 ? <IconButton icon={RotateCcw} label="Nova conversa" onPress={() => restart.mutate()} size={20} /> : null,
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {conversation.isLoading ? (
          <LoadingState />
        ) : conversation.error ? (
          <ErrorState message={conversation.error.message} onRetry={conversation.refetch} />
        ) : (
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              pending ? null : (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Sparkles size={28} color={colors.sageInk} />
                  </View>
                  <AppText variant="heading" center>
                    Olá{firstName ? `, ${firstName}` : ''}! Como posso ajudar?
                  </AppText>
                  <AppText tone="muted" center>
                    Pergunte sobre agenda e salas, ou peça uma reserva. Pode escrever ou mandar áudio.
                  </AppText>
                  <View style={styles.chips}>
                    {SUGGESTIONS.map((s) => (
                      <Pressable key={s} style={styles.chip} onPress={() => submit(s)} accessibilityRole="button">
                        <AppText variant="caption" style={{ color: colors.ink }}>
                          {s}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )
            }
            renderItem={({ item: m }) => (
              <Bubble message={m}>
                {m.role === 'assistant' && (
                  <Pressable
                    onPress={() => (speakingId === m.id ? stopSpeaking() : speak(m.id, m.content))}
                    accessibilityRole="button"
                    accessibilityLabel={speakingId === m.id ? 'Parar leitura' : 'Ouvir resposta'}
                    style={styles.listen}>
                    {speakingId === m.id ? <VolumeX size={14} color={colors.textMuted} /> : <Volume2 size={14} color={colors.textMuted} />}
                    <AppText variant="caption" tone="muted">
                      {speakingId === m.id ? 'Parar' : 'Ouvir'}
                    </AppText>
                  </Pressable>
                )}
                {m.action && (
                  <ActionCard
                    action={m.action}
                    busy={actionBusy?.id === m.action.id ? actionBusy.verb : null}
                    onConfirm={() => resolve.mutate({ id: m.action!.id, verb: 'confirm' })}
                    onCancel={() => resolve.mutate({ id: m.action!.id, verb: 'cancel' })}
                  />
                )}
              </Bubble>
            )}
            ListFooterComponent={
              <>
                {pending && (
                  <Bubble
                    message={{ id: -1, role: 'user', content: pending.text, viaAudio: pending.viaAudio, createdAt: '', action: null }}
                  />
                )}
                {busy && (
                  <View style={styles.thinking}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <AppText variant="caption" tone="muted">
                      {voice.isPending ? 'Transcrevendo o áudio…' : 'Pensando…'}
                    </AppText>
                  </View>
                )}
              </>
            }
          />
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {recorder.recording ? (
            <View style={styles.recording}>
              <View style={styles.dot} />
              <AppText style={{ flex: 1 }}>
                Gravando… 0:{String(recorder.elapsed).padStart(2, '0')}{' '}
                <AppText variant="caption" tone="muted">
                  (até 1 min)
                </AppText>
              </AppText>
              <IconButton icon={X} label="Descartar áudio" onPress={() => recorder.stop(false)} />
              <Pressable
                onPress={() => recorder.stop(true)}
                accessibilityRole="button"
                accessibilityLabel="Parar e enviar"
                style={styles.stop}>
                <Square size={14} color={colors.onPrimary} fill={colors.onPrimary} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Escreva sua mensagem…"
                placeholderTextColor={colors.textSubtle}
                multiline
                maxLength={2000}
                style={styles.input}
                accessibilityLabel="Mensagem para o assistente"
              />
              {text.trim() ? (
                <Pressable
                  onPress={() => submit(text)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar"
                  style={[styles.round, { backgroundColor: colors.primary }, busy && { opacity: 0.5 }]}>
                  <SendHorizontal size={20} color={colors.onPrimary} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    stopSpeaking();
                    recorder.start();
                  }}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Gravar áudio"
                  style={[styles.round, { backgroundColor: colors.sageSoft }, busy && { opacity: 0.5 }]}>
                  <Mic size={20} color={colors.sageInk} />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function Bubble({ message, children }: { message: AgentMessage; children?: ReactNode }) {
  const mine = message.role === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs, message.id < 0 && { opacity: 0.7 }]}>
        {mine && message.viaAudio ? (
          <View style={styles.voiceTag}>
            <Mic size={12} color={colors.sageInk} />
            <AppText variant="caption" style={{ color: colors.sageInk }}>
              Mensagem de voz
            </AppText>
          </View>
        ) : null}
        <AppText style={{ color: colors.ink }}>{message.content.replace(/\*\*/g, '')}</AppText>
      </View>
      {children ? <View style={{ width: '88%' }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 32 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageSoft,
    marginBottom: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { backgroundColor: colors.sageSoft, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.divider, borderBottomLeftRadius: 6 },
  voiceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  listen: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, alignSelf: 'flex-start' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  footer: { borderTopWidth: 1, borderTopColor: colors.divider, backgroundColor: colors.surface, paddingHorizontal: 12, paddingTop: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  round: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  recording: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  stop: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger },
});
