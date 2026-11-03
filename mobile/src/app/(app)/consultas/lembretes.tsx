import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { addDays } from 'date-fns';
import { CheckCircle2, ChevronLeft, ChevronRight, MessageCircle, PhoneOff } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useReminders, type ReminderItem } from '@/api/whatsapp';
import { useAuth } from '@/auth/AuthProvider';
import { formatDate, fromDateKey, toDateKey } from '@/utils/format';
import { colors } from '@/theme/tokens';

const shift = (date: string, days: number) => toDateKey(addDays(fromDateKey(date), days));

/** Lembretes de amanhã: the day's appointments, each opening its WhatsApp reminder. */
export default function RemindersScreen() {
  const { user } = useAuth();
  const showPsychologist = user?.role === 'admin' || user?.role === 'receptionist';
  const [date, setDate] = useState<string | null>(null);
  const { data, isLoading, error, refetch, isRefetching } = useReminders(date);

  const items = data?.items ?? [];
  const sentCount = items.filter((i) => i.reminderSentAt).length;
  const title = !data || data.date === data.tomorrow ? 'Lembretes de amanhã' : `Lembretes de ${formatDate(data.date, 'dd/MM')}`;

  return (
    <>
      <Stack.Screen options={{ title: 'Lembretes' }} />
      <Screen refreshing={isRefetching} onRefresh={refetch}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Dia anterior" onPress={() => data && setDate(shift(data.date, -1))} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="subtitle">{title}</AppText>
            {data && (
              <AppText variant="caption" tone="muted" style={{ textTransform: 'capitalize' }}>
                {formatDate(data.date, 'EEEE, dd/MM')}
              </AppText>
            )}
          </View>
          <IconButton icon={ChevronRight} label="Próximo dia" onPress={() => data && setDate(shift(data.date, 1))} />
        </View>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState icon={MessageCircle} title="Nenhuma consulta neste dia" />
        ) : (
          <>
            <AppText tone="muted" center>
              {sentCount} de {items.length} lembretes enviados
            </AppText>
            <Card padded={false}>
              {items.map((item, i) => (
                <Row key={item.appointmentId} item={item} first={i === 0} showPsychologist={showPsychologist} />
              ))}
            </Card>
          </>
        )}
      </Screen>
    </>
  );
}

function Row({ item, first, showPsychologist }: { item: ReminderItem; first: boolean; showPsychologist: boolean }) {
  const detail = [showPsychologist ? item.psychologistName : null, item.phoneDisplay ?? 'Sem telefone']
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/consultas/lembrete', params: { id: item.appointmentId } })}
      accessibilityRole="button"
      accessibilityLabel={`Lembrar ${item.patientName} pelo WhatsApp`}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <AppText weight="semibold" style={styles.time}>
        {item.startTime}
      </AppText>
      <View style={{ flex: 1 }}>
        <AppText weight="medium" numberOfLines={1}>
          {item.patientName}
        </AppText>
        <View style={styles.detail}>
          {!item.phone && <PhoneOff size={13} color={colors.warning} />}
          <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {detail}
          </AppText>
        </View>
      </View>
      {item.reminderSentAt ? (
        <View style={styles.sent}>
          <CheckCircle2 size={16} color={colors.success} />
          <AppText variant="caption" tone="success">
            Enviado
          </AppText>
        </View>
      ) : (
        <Badge label="Lembrar" tone="primary" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  time: { width: 48 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
