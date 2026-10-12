import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { DoorOpen, Pencil, Plus, Ruler, Snowflake, Users, Wifi } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useRoomBookings, useRooms } from '@/api/queries';
import { formatMoney, formatTime, toDateKey } from '@/utils/format';
import { colors, radius } from '@/theme/tokens';

const SLOTS_PER_DAY = 17; // 07:00–23:00, same as the web occupancy bar

export default function AdminRoomsScreen() {
  const rooms = useRooms();
  const bookings = useRoomBookings({ date: toDateKey() });
  const nowHm = new Date().toTimeString().slice(0, 5);

  const refresh = () => {
    rooms.refetch();
    bookings.refetch();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Gestão de salas' }} />
      <Screen refreshing={rooms.isRefetching} onRefresh={refresh}>
        <AppText tone="muted">Controle e agendamento de salas</AppText>
        <Button title="Adicionar sala" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => router.push('/admin/salas/form')} />

        {rooms.isLoading ? (
          <LoadingState />
        ) : rooms.error ? (
          <ErrorState message={rooms.error.message} onRetry={refresh} />
        ) : !(rooms.data ?? []).length ? (
          <EmptyState
            title="Nenhuma sala cadastrada"
            description="Adicione salas para começar a gerenciar os espaços no consultório."
            icon={DoorOpen}
          />
        ) : (
          rooms.data!.map((r) => {
            const today = (bookings.data ?? []).filter((b) => b.roomId === r.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
            const busy = today.some((b) => b.startTime.slice(0, 5) <= nowHm && b.endTime.slice(0, 5) > nowHm);
            const next = today.find((b) => b.endTime.slice(0, 5) > nowHm);
            const occupancy = Math.min(1, today.length / SLOTS_PER_DAY);
            return (
              <Card key={r.id} padded={false} style={{ overflow: 'hidden' }}>
                {r.imageUrl ? (
                  <Image source={{ uri: r.imageUrl }} style={styles.image} contentFit="cover" />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
                    <DoorOpen size={36} color={colors.sageInk} />
                  </View>
                )}
                <View style={{ padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText variant="subtitle" style={{ flex: 1 }}>
                      {r.name}
                    </AppText>
                    <Badge label={busy ? 'Ocupada' : 'Disponível'} tone={busy ? 'warning' : 'success'} />
                  </View>
                  <View style={styles.features}>
                    <Feature icon={Users} text={`${r.capacity} pessoas`} />
                    {r.squareMeters ? <Feature icon={Ruler} text={`${r.squareMeters}m²`} /> : null}
                    {r.hasWifi && <Feature icon={Wifi} text="Wi-Fi" />}
                    {r.hasAirConditioning && <Feature icon={Snowflake} text="Ar-condicionado" />}
                  </View>
                  {r.hourlyRate && (
                    <AppText variant="caption" tone="muted">
                      Valor/hora: {formatMoney(r.hourlyRate)}
                    </AppText>
                  )}
                  <AppText variant="caption" tone="muted">
                    {next ? `Próxima reserva: ${formatTime(next.startTime)} – ${formatTime(next.endTime)}` : 'Sem reservas para hoje'}
                  </AppText>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${occupancy * 100}%` }]} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button
                      title="Reservar"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => router.push({ pathname: '/salas/reservar', params: { roomId: String(r.id) } })}
                    />
                    <Button
                      title="Editar"
                      size="sm"
                      variant="outline"
                      style={{ flex: 1 }}
                      icon={<Pencil size={16} color={colors.ink} />}
                      onPress={() => router.push({ pathname: '/admin/salas/form', params: { id: String(r.id) } })}
                    />
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </Screen>
    </>
  );
}

function Feature({ icon: Icon, text }: { icon: typeof Wifi; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={14} color={colors.textMuted} />
      <AppText variant="caption" tone="muted">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 140 },
  placeholder: { backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
  features: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bar: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary },
});
