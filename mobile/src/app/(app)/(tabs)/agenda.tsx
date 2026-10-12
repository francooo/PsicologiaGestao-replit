import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, endOfMonth, startOfMonth } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, DoorOpen, Plus, Send, Trash2 } from 'lucide-react-native';

import { MonthCalendar } from '@/components/agenda/MonthCalendar';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { api } from '@/api/client';
import { useAppointments, useRoomBookings, useRooms } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { confirm } from '@/utils/confirm';
import { formatDateLong, formatTime, toDateKey } from '@/utils/format';
import { appointmentStatusInfo } from '@/utils/status';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type Tab = 'consultas' | 'salas';

const statusFilters = [
  { label: 'Todos', value: 'all' },
  { label: 'Aguardando', value: 'scheduled' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'canceled' },
] as const;

export default function AgendaScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'salas' ? 'salas' : 'consultas');

  return tab === 'consultas' ? <AppointmentsView tab={tab} setTab={setTab} /> : <RoomsView tab={tab} setTab={setTab} />;
}

function TabSwitch({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <Segmented<Tab>
      segments={[
        { label: 'Consultas', value: 'consultas' },
        { label: 'Reservas de salas', value: 'salas' },
      ]}
      value={tab}
      onChange={setTab}
    />
  );
}

// ─── Consultas ────────────────────────────────────────────────────────────────

function AppointmentsView({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [status, setStatus] = useState<(typeof statusFilters)[number]['value']>('all');

  const range = { startDate: toDateKey(startOfMonth(month)), endDate: toDateKey(endOfMonth(month)) };
  const { data = [], isLoading, error, refetch, isRefetching } = useAppointments(range);

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    data.forEach((a) => (acc[a.date] = (acc[a.date] ?? 0) + 1));
    return acc;
  }, [data]);

  const selectedKey = toDateKey(selected);
  const dayList = data
    .filter((a) => a.date === selectedKey && (status === 'all' || a.status === status))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <TabSwitch tab={tab} setTab={setTab} />

      <Card>
        <MonthCalendar
          month={month}
          selected={selected}
          onMonthChange={setMonth}
          onSelect={(d) => {
            setSelected(d);
            if (d.getMonth() !== month.getMonth()) setMonth(d);
          }}
          counts={counts}
        />
      </Card>

      <View style={styles.actions}>
        <Button
          title="Nova consulta"
          icon={<Plus size={18} color={colors.onPrimary} />}
          onPress={() => router.push({ pathname: '/consultas/nova', params: { date: selectedKey } })}
          style={{ flex: 1 }}
        />
        <Button
          title="Compartilhar"
          variant="secondary"
          icon={<Send size={18} color={colors.primary} />}
          onPress={() => router.push('/consultas/compartilhar')}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ gap: 10 }}>
        <AppText variant="subtitle" style={{ textTransform: 'capitalize' }}>
          {formatDateLong(selected)}
        </AppText>
        <Segmented scrollable segments={[...statusFilters]} value={status} onChange={setStatus} />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : dayList.length === 0 ? (
        <EmptyState title="Nenhuma consulta neste dia" icon={CalendarDays} />
      ) : (
        <View style={{ gap: 10 }}>
          {dayList.map((a) => {
            const s = appointmentStatusInfo(a.status);
            return (
              <Card
                key={a.id}
                onPress={() => router.push({ pathname: '/consultas/[id]', params: { id: String(a.id) } })}
                accessibilityLabel={`Consulta de ${a.patientName} às ${formatTime(a.startTime)}`}
                style={styles.apptCard}>
                <View style={styles.timeCol}>
                  <AppText weight="semibold" tone="primary">
                    {formatTime(a.startTime)}
                  </AppText>
                  <AppText variant="caption" tone="subtle">
                    {formatTime(a.endTime)}
                  </AppText>
                </View>
                <View style={styles.apptBody}>
                  <AppText weight="medium" numberOfLines={1}>
                    {a.patientName}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {[a.psychologist?.user?.fullName, a.room?.name ?? (a.roomId === 0 ? 'Online' : null)]
                      .filter(Boolean)
                      .join(' · ')}
                  </AppText>
                </View>
                <Badge label={s.label} tone={s.tone} />
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

// ─── Reservas de salas ────────────────────────────────────────────────────────

function RoomsView({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => new Date());
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const dateKey = toDateKey(date);

  const rooms = useRooms();
  const bookings = useRoomBookings({ date: dateKey });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/room-bookings/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-bookings'] });
      toast.success('Reserva removida');
    },
    onError: (e: Error) => toast.error('Erro ao remover', e.message),
  });

  const list = (bookings.data ?? [])
    .filter((b) => roomFilter === 'all' || String(b.roomId) === roomFilter)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const onDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Remover reserva?',
      message: 'A sala ficará livre neste horário.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (ok) remove.mutate(id);
  };

  const refresh = () => {
    rooms.refetch();
    bookings.refetch();
  };

  return (
    <Screen refreshing={bookings.isRefetching} onRefresh={refresh}>
      <TabSwitch tab={tab} setTab={setTab} />

      <Card style={styles.dateBar}>
        <IconButton icon={ChevronLeft} label="Dia anterior" onPress={() => setDate((d) => addDays(d, -1))} />
        <Pressable onPress={() => setDate(new Date())} accessibilityRole="button" accessibilityLabel="Ir para hoje">
          <AppText variant="subtitle" center style={{ textTransform: 'capitalize' }}>
            {formatDateLong(date)}
          </AppText>
          <AppText variant="caption" tone="primary" center>
            Toque para voltar a hoje
          </AppText>
        </Pressable>
        <IconButton icon={ChevronRight} label="Próximo dia" onPress={() => setDate((d) => addDays(d, 1))} />
      </Card>

      {(rooms.data?.length ?? 0) > 1 && (
        <Segmented
          scrollable
          segments={[{ label: 'Todas', value: 'all' }, ...(rooms.data ?? []).map((r) => ({ label: r.name, value: String(r.id) }))]}
          value={roomFilter}
          onChange={setRoomFilter}
        />
      )}

      <Button
        title="Reservar sala"
        icon={<Plus size={18} color={colors.onPrimary} />}
        onPress={() => router.push({ pathname: '/salas/reservar', params: { date: dateKey } })}
      />

      {bookings.isLoading ? (
        <LoadingState />
      ) : bookings.error ? (
        <ErrorState message={bookings.error.message} onRetry={refresh} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhuma reserva neste dia" icon={DoorOpen} />
      ) : (
        <View style={{ gap: 10 }}>
          {list.map((b) => {
            // Same as web: staff can remove any booking, psychologists only their own
            const isOwner =
              user?.role === 'admin' || user?.role === 'receptionist' || b.psychologist?.userId === user?.id;
            return (
              <Card key={b.id} style={styles.apptCard}>
                <View style={styles.timeCol}>
                  <AppText weight="semibold" tone="primary">
                    {formatTime(b.startTime)}
                  </AppText>
                  <AppText variant="caption" tone="subtle">
                    {formatTime(b.endTime)}
                  </AppText>
                </View>
                <View style={styles.apptBody}>
                  <AppText weight="medium">{b.room?.name ?? 'Sala'}</AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {b.psychologist?.user?.fullName ?? '—'}
                  </AppText>
                  <Badge label={b.purpose || 'Consulta'} tone="sage" />
                </View>
                {isOwner && <IconButton icon={Trash2} tone="danger" label="Remover reserva" onPress={() => onDelete(b.id)} />}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  apptCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeCol: { width: 52, alignItems: 'center' },
  apptBody: { flex: 1, gap: 4 },
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
});
