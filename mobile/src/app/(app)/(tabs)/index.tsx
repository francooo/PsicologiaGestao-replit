import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { startOfMonth, endOfMonth } from 'date-fns';
import { CalendarDays, CheckCircle2, Clock, DoorOpen, Users } from 'lucide-react-native';

import { BrandLogo } from '@/components/brand/BrandLogo';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/auth/AuthProvider';
import { useAppointments, usePatients, useRoomBookings, useRooms } from '@/api/queries';
import { firstName, formatDateLong, formatTime, toDateKey } from '@/utils/format';
import { appointmentStatusInfo } from '@/utils/status';
import { colors, radius } from '@/theme/tokens';

export default function DashboardScreen() {
  const { user } = useAuth();
  const today = toDateKey();
  const now = new Date();
  const monthRange = { startDate: toDateKey(startOfMonth(now)), endDate: toDateKey(endOfMonth(now)) };

  const todayAppts = useAppointments({ date: today });
  const monthAppts = useAppointments(monthRange);
  const patients = usePatients();
  const rooms = useRooms();
  const bookings = useRoomBookings({ date: today });

  const queries = [todayAppts, monthAppts, patients, rooms, bookings];
  const isLoading = queries.some((q) => q.isLoading);
  const failed = queries.find((q) => q.error);
  const refreshing = queries.some((q) => q.isRefetching);
  const refresh = () => queries.forEach((q) => q.refetch());

  const todayList = todayAppts.data ?? [];
  const monthList = monthAppts.data ?? [];
  const patientList = patients.data ?? [];
  const bookingList = bookings.data ?? [];

  // Same metrics as client/src/pages/dashboard.tsx
  const confirmedToday = todayList.filter((a) => a.status === 'confirmed').length;
  const waitingToday = todayList.filter((a) => a.status === 'scheduled').length;
  const completedMonth = monthList.filter((a) => a.status === 'completed').length;
  const waitingAll = monthList.filter((a) => a.status === 'scheduled').length;
  const activePatients = patientList.filter((p) => p.status === 'active' || !p.status).length;
  const monthStart = startOfMonth(now);
  const newPatients = patientList.filter((p) => p.createdAt && new Date(p.createdAt) >= monthStart).length;
  const bookedRoomIds = new Set(bookingList.map((b) => b.roomId));
  const freeRooms = (rooms.data ?? []).filter((r) => !bookedRoomIds.has(r.id));

  return (
    <Screen edgeTop background="organic" refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <BrandLogo size="sm" />
          <AppText variant="heading" style={{ marginTop: 12 }}>
            Olá, {firstName(user?.fullName) || 'bem-vinda'}
          </AppText>
          <AppText tone="muted" style={styles.capitalize}>
            {formatDateLong(now)}
          </AppText>
        </View>
        <Avatar name={user?.fullName} uri={user?.profileImage ?? user?.avatarUrl} size={48} />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : failed ? (
        <ErrorState message={failed.error?.message} onRetry={refresh} />
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard
              icon={CalendarDays}
              tint={colors.primarySoft}
              iconColor={colors.primary}
              label="Consultas hoje"
              value={todayList.length}
              sub={`${confirmedToday} confirmada${confirmedToday !== 1 ? 's' : ''} · ${waitingToday} aguardando`}
            />
            <StatCard
              icon={CheckCircle2}
              tint={colors.sageSoft}
              iconColor={colors.sageInk}
              label="Concluídas no mês"
              value={completedMonth}
              sub="Neste mês"
            />
            <StatCard
              icon={Clock}
              tint={colors.sandSoft}
              iconColor={colors.sandInk}
              label="Aguardando"
              value={waitingAll}
              sub="Confirmação via WhatsApp"
            />
            <StatCard
              icon={Users}
              tint={colors.lilacSoft}
              iconColor={colors.lilacInk}
              label="Pacientes ativos"
              value={activePatients}
              sub={newPatients > 0 ? `${newPatients} novo${newPatients !== 1 ? 's' : ''} este mês` : 'Sem novos este mês'}
            />
          </View>

          <View>
            <SectionHeader title="Consultas de hoje" icon={CalendarDays} onAction={() => router.push('/agenda')} />
            <Card padded={false}>
              {todayList.length === 0 ? (
                <EmptyState title="Nenhuma consulta hoje" icon={CalendarDays} />
              ) : (
                todayList.slice(0, 6).map((a, i) => {
                  const status = appointmentStatusInfo(a.status);
                  return (
                    <View key={a.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                      <View style={styles.timeBox}>
                        <AppText weight="semibold" tone="primary">
                          {formatTime(a.startTime)}
                        </AppText>
                        <AppText variant="caption" tone="subtle">
                          {formatTime(a.endTime)}
                        </AppText>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <AppText weight="medium" numberOfLines={1}>
                          {a.patientName}
                        </AppText>
                        {a.room?.name && (
                          <AppText variant="caption" tone="muted">
                            {a.room.name}
                          </AppText>
                        )}
                      </View>
                      <Badge label={status.label} tone={status.tone} />
                    </View>
                  );
                })
              )}
            </Card>
          </View>

          <View>
            <SectionHeader
              title="Reservas de salas hoje"
              icon={DoorOpen}
              onAction={() => router.push({ pathname: '/agenda', params: { tab: 'salas' } })}
            />
            <Card padded={false}>
              {bookingList.length === 0 ? (
                <EmptyState title="Nenhuma reserva hoje" icon={DoorOpen} />
              ) : (
                bookingList.slice(0, 6).map((b, i) => (
                  <View key={b.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                    <View style={styles.timeBox}>
                      <AppText weight="semibold" tone="primary">
                        {formatTime(b.startTime)}
                      </AppText>
                      <AppText variant="caption" tone="subtle">
                        {formatTime(b.endTime)}
                      </AppText>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText weight="medium">{b.room?.name ?? 'Sala'}</AppText>
                      {b.psychologist?.user?.fullName && (
                        <AppText variant="caption" tone="muted">
                          {b.psychologist.user.fullName}
                        </AppText>
                      )}
                    </View>
                    <Badge label={b.purpose || 'Consulta'} tone="sage" />
                  </View>
                ))
              )}
              {freeRooms.length > 0 && (
                <AppText variant="caption" tone="subtle" style={styles.freeRooms}>
                  {freeRooms.map((r) => r.name).join(' e ')} — livre{freeRooms.length !== 1 ? 's' : ''} o dia todo
                </AppText>
              )}
            </Card>
          </View>
        </>
      )}
    </Screen>
  );
}

function StatCard({
  icon: Icon,
  tint,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  tint: string;
  iconColor: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Card style={styles.stat} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <AppText variant="overline" tone="subtle" numberOfLines={1}>
        {label}
      </AppText>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {sub}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4 },
  capitalize: { textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexBasis: '47%', flexGrow: 1, gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontFamily: 'DMSans_700Bold', fontSize: 30, lineHeight: 36, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  timeBox: { width: 52, alignItems: 'center' },
  freeRooms: { paddingHorizontal: 16, paddingBottom: 14, fontStyle: 'italic' },
});
