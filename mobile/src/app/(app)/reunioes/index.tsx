import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, ExternalLink, Play, Plus, Search, Send, Square, StickyNote, Video, XCircle } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { formatDuration, meetingError, useGoogleStatus, useMeetings } from '@/api/meetings';
import { confirm } from '@/utils/confirm';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';
import type { Meeting } from '@/types/meeting';

type Filter = 'all' | 'today' | 'scheduled' | 'ended' | 'cancelled';

const statusInfo: Record<string, { label: string; tone: BadgeTone }> = {
  scheduled: { label: 'Agendada', tone: 'primary' },
  active: { label: 'Em andamento', tone: 'success' },
  ended: { label: 'Realizada', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
};

const nameOf = (m: Meeting) => m.patientFullName || m.patientName || 'Paciente';

function Elapsed({ since }: { since: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const start = since ? new Date(since).getTime() : now;
  const s = Math.max(0, Math.floor((now - start) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <AppText weight="semibold" style={{ color: colors.onPrimary, fontVariant: ['tabular-nums'] }}>
      ⏱ {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </AppText>
  );
}

export default function MeetingsScreen() {
  const queryClient = useQueryClient();
  const meetings = useMeetings();
  const google = useGoogleStatus();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [ending, setEnding] = useState<Meeting | null>(null);
  const [endNotes, setEndNotes] = useState('');
  const [notesOf, setNotesOf] = useState<Meeting | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const list = useMemo(() => meetings.data ?? [], [meetings.data]);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const stats = {
    today: list.filter((m) => m.isToday && m.status !== 'cancelled').length,
    week: list.filter((m) => {
      const d = new Date(m.scheduledAt);
      return d >= weekStart && d <= weekEnd && m.status !== 'cancelled';
    }).length,
    done: list.filter((m) => m.status === 'ended').length,
  };
  const active = list.find((m) => m.status === 'active');

  const filtered = useMemo(
    () =>
      list.filter((m) => {
        if (filter === 'today' && !m.isToday) return false;
        if (filter !== 'all' && filter !== 'today' && m.status !== filter) return false;
        return !search.trim() || nameOf(m).toLowerCase().includes(search.trim().toLowerCase());
      }),
    [list, filter, search],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });

  const start = useMutation({
    mutationFn: (m: Meeting) => api<Meeting>(`/api/meetings/${m.id}/start`, { method: 'POST' }),
    onSuccess: async (data, m) => {
      invalidate();
      const link = data.meetLink || m.meetLink;
      if (link) {
        toast.success('Sessão iniciada');
        await Linking.openURL(link);
      } else toast.info('Sessão iniciada', 'Conecte o Google Calendar nas Configurações para gerar o link do Meet.');
    },
    onError: meetingError,
  });

  const end = useMutation({
    mutationFn: ({ m, notes }: { m: Meeting; notes: string }) =>
      api(`/api/meetings/${m.id}/end`, { method: 'POST', body: { notes } }),
    onSuccess: () => {
      invalidate();
      toast.success('Sessão encerrada', 'Anotações salvas.');
      setEnding(null);
      setEndNotes('');
    },
    onError: meetingError,
  });

  const saveNotes = useMutation({
    mutationFn: ({ m, notes }: { m: Meeting; notes: string }) =>
      api(`/api/meetings/${m.id}/notes`, { method: 'PATCH', body: { notes } }),
    onSuccess: () => {
      invalidate();
      toast.success('Anotações salvas');
      setNotesOf(null);
      setNotesDraft(null);
    },
    onError: meetingError,
  });

  const sendLink = useMutation({
    mutationFn: (m: Meeting) => api<{ sent: boolean }>(`/api/meetings/${m.id}/send-link`, { method: 'POST' }),
    onSuccess: (res) => {
      invalidate();
      if (res.sent) toast.success('Link enviado', 'E-mail enviado com sucesso.');
      else toast.error('Não foi possível enviar', 'Verifique a conexão com o Google.');
    },
    onError: meetingError,
  });

  const cancel = useMutation({
    mutationFn: (m: Meeting) => api(`/api/meetings/${m.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      toast.success('Reunião cancelada');
    },
    onError: meetingError,
  });

  const onCancel = async (m: Meeting) => {
    const ok = await confirm({
      title: 'Cancelar reunião?',
      message: 'A reunião será cancelada e o evento será removido do Google Calendar. Esta ação não pode ser desfeita.',
      confirmLabel: 'Cancelar reunião',
      destructive: true,
    });
    if (ok) cancel.mutate(m);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Reuniões' }} />
      <Screen refreshing={meetings.isRefetching} onRefresh={meetings.refetch}>
        {active && (
          <View style={styles.activeBanner}>
            <AppText weight="semibold" style={{ color: colors.onPrimary }}>
              Sessão em andamento com {nameOf(active)}
            </AppText>
            <Elapsed since={active.startedAt} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {active.meetLink && (
                <Button title="Entrar no Meet" size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => Linking.openURL(active.meetLink!)} />
              )}
              <Button title="Encerrar" size="sm" variant="outline" style={{ flex: 1 }} onPress={() => setEnding(active)} />
            </View>
          </View>
        )}

        <AppText tone="muted">Gerencie suas sessões online via Google Meet</AppText>
        <Button title="Nova reunião" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => router.push('/reunioes/nova')} />

        <View style={styles.stats}>
          {[
            ['Hoje', stats.today, 'sessões'],
            ['Esta semana', stats.week, 'sessões'],
            ['Total', stats.done, 'realizadas'],
          ].map(([label, value, sub]) => (
            <Card key={label as string} style={styles.stat}>
              <AppText variant="overline" tone="subtle">
                {label}
              </AppText>
              <AppText variant="heading">{value}</AppText>
              <AppText variant="caption" tone="muted">
                {sub}
              </AppText>
            </Card>
          ))}
        </View>

        {google.data && !google.data.authenticated && (
          <Pressable style={styles.warn} onPress={() => router.push('/configuracoes')}>
            <AppText weight="semibold">Google Calendar não conectado</AppText>
            <AppText variant="caption">
              Sem a integração não é possível gerar links do Meet nem enviar convites por e-mail. Toque para conectar em
              Configurações →
            </AppText>
          </Pressable>
        )}

        <Segmented<Filter>
          scrollable
          segments={[
            { label: 'Todas', value: 'all' },
            { label: 'Hoje', value: 'today' },
            { label: 'Agendadas', value: 'scheduled' },
            { label: 'Realizadas', value: 'ended' },
            { label: 'Canceladas', value: 'cancelled' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <TextField icon={Search} placeholder="Buscar paciente..." value={search} onChangeText={setSearch} />

        {meetings.isLoading ? (
          <LoadingState />
        ) : meetings.error ? (
          <ErrorState message={meetings.error.message} onRetry={meetings.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma reunião encontrada" description="Crie uma nova reunião para começar" icon={Video} />
        ) : (
          filtered.map((m) => {
            const s = statusInfo[m.status] ?? { label: m.status, tone: 'neutral' as BadgeTone };
            return (
              <Card key={m.id} style={[{ gap: 10 }, m.isToday ? styles.today : {}, m.status === 'active' ? styles.activeCard : {}]}>
                <View style={styles.head}>
                  <Avatar name={nameOf(m)} uri={m.patientPhotoUrl} size={40} />
                  <View style={{ flex: 1 }}>
                    <AppText weight="medium">{nameOf(m)}</AppText>
                    {!!m.patientEmail && (
                      <AppText variant="caption" tone="muted">
                        {m.patientEmail}
                      </AppText>
                    )}
                  </View>
                  <Badge label={s.label} tone={s.tone} />
                </View>
                <AppText weight="semibold">{m.title}</AppText>
                <AppText variant="caption" tone="muted" style={{ textTransform: 'capitalize' }}>
                  {format(new Date(m.scheduledAt), "EEEE, dd MMM • HH:mm", { locale: ptBR })} — {formatDuration(m.durationMinutes)}
                </AppText>
                {m.meetLink && (
                  <Pressable
                    style={styles.link}
                    onPress={async () => {
                      await Clipboard.setStringAsync(m.meetLink!);
                      toast.success('Link copiado!');
                    }}
                    accessibilityLabel="Copiar link do Meet">
                    <AppText variant="caption" tone="primary" numberOfLines={1} style={{ flex: 1 }}>
                      {m.meetLink}
                    </AppText>
                    <Copy size={16} color={colors.primary} />
                  </Pressable>
                )}
                {m.linkSentAt && (
                  <AppText variant="caption" tone="subtle">
                    Link enviado em {format(new Date(m.linkSentAt), 'dd/MM HH:mm')}
                  </AppText>
                )}

                <View style={styles.actions}>
                  {m.status === 'scheduled' && (
                    <>
                      <Button title="Iniciar" size="sm" fullWidth={false} icon={<Play size={16} color={colors.onPrimary} />} loading={start.isPending && start.variables?.id === m.id} onPress={() => start.mutate(m)} />
                      {m.meetLink && (
                        <Button title="Enviar link" size="sm" variant="secondary" fullWidth={false} disabled={!m.patientEmail} icon={<Send size={16} color={colors.primary} />} onPress={() => sendLink.mutate(m)} />
                      )}
                      <Button title="Cancelar" size="sm" variant="ghost" fullWidth={false} icon={<XCircle size={16} color={colors.danger} />} onPress={() => onCancel(m)} />
                    </>
                  )}
                  {m.status === 'active' && (
                    <>
                      {m.meetLink && (
                        <Button title="Entrar no Meet" size="sm" fullWidth={false} icon={<ExternalLink size={16} color={colors.onPrimary} />} onPress={() => Linking.openURL(m.meetLink!)} />
                      )}
                      <Button title="Encerrar sessão" size="sm" variant="danger" fullWidth={false} icon={<Square size={16} color={colors.onPrimary} />} onPress={() => setEnding(m)} />
                    </>
                  )}
                  {m.status === 'ended' && (
                    <>
                      <Button title={m.notes ? 'Ver anotações' : 'Anotações'} size="sm" variant="secondary" fullWidth={false} icon={<StickyNote size={16} color={colors.primary} />} onPress={() => setNotesOf(m)} />
                      {m.meetLink && m.patientEmail && (
                        <Button title="Reenviar link" size="sm" variant="ghost" fullWidth={false} onPress={() => sendLink.mutate(m)} />
                      )}
                    </>
                  )}
                  {m.status === 'cancelled' && (
                    <AppText variant="caption" tone="subtle">
                      Sessão cancelada
                    </AppText>
                  )}
                </View>
                {m.status === 'ended' && !!m.actualDuration && (
                  <AppText variant="caption" tone="muted">
                    Duração real: {formatDuration(m.actualDuration)}
                  </AppText>
                )}
              </Card>
            );
          })
        )}
      </Screen>

      <Sheet
        visible={!!ending}
        onClose={() => setEnding(null)}
        title="Encerrar sessão"
        footer={
          <Button title="Encerrar e salvar" loading={end.isPending} onPress={() => ending && end.mutate({ m: ending, notes: endNotes })} />
        }>
        {ending && (
          <AppText tone="muted">
            Sessão com {nameOf(ending)}
            {ending.startedAt ? ` · iniciada às ${format(new Date(ending.startedAt), 'HH:mm')}` : ''}
          </AppText>
        )}
        <TextField
          label="Anotações da sessão"
          multiline
          placeholder="Registre observações, progressos ou próximos passos..."
          hint="As anotações ficam visíveis apenas para você."
          value={endNotes}
          onChangeText={setEndNotes}
        />
      </Sheet>

      <Sheet
        visible={!!notesOf}
        onClose={() => {
          setNotesOf(null);
          setNotesDraft(null);
        }}
        title={notesOf ? `Anotações — ${notesOf.title}` : undefined}
        footer={
          notesDraft === null ? (
            <Button title="Editar anotações" variant="secondary" onPress={() => setNotesDraft(notesOf?.notes ?? '')} />
          ) : (
            <Button title="Salvar" loading={saveNotes.isPending} onPress={() => notesOf && saveNotes.mutate({ m: notesOf, notes: notesDraft })} />
          )
        }>
        {notesOf && (
          <AppText variant="caption" tone="muted" style={{ textTransform: 'capitalize' }}>
            {format(new Date(notesOf.scheduledAt), "EEEE, dd MMM yyyy • HH:mm", { locale: ptBR })}
            {notesOf.actualDuration ? ` · ${formatDuration(notesOf.actualDuration)}` : ''}
          </AppText>
        )}
        {notesDraft === null ? (
          <AppText tone={notesOf?.notes ? 'default' : 'subtle'}>{notesOf?.notes || 'Sem anotações registradas.'}</AppText>
        ) : (
          <TextField multiline value={notesDraft} onChangeText={setNotesDraft} />
        )}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  activeBanner: { backgroundColor: colors.success, borderRadius: radius.lg, padding: 14, gap: 8 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 2, paddingVertical: 12, paddingHorizontal: 12 },
  warn: { backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: 12, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderRadius: radius.sm, padding: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  today: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  activeCard: { borderWidth: 2, borderColor: colors.success },
});
