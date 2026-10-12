import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock, DoorOpen, UserRound } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { usePsychologists, useRooms } from '@/api/queries';
import { formatDateLong, formatTime } from '@/utils/format';
import { appointmentStatusInfo } from '@/utils/status';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { Appointment } from '@/types/api';

const statusOptions = [
  { label: 'Aguardando', value: 'scheduled' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'canceled' },
  { label: 'Primeira sessão', value: 'first-session' },
];

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/appointments', Number(id)],
    queryFn: () => api<Appointment>(`/api/appointments/${id}`),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={refetch} />;
  return <AppointmentDetail data={data} />;
}

function AppointmentDetail({ data }: { data: Appointment }) {
  const id = data.id;
  const queryClient = useQueryClient();
  const psychologists = usePsychologists();
  const rooms = useRooms();
  const [status, setStatus] = useState(data.status);
  const [notes, setNotes] = useState(data.notes ?? '');

  const update = useMutation({
    mutationFn: (body: Partial<Appointment>) => api(`/api/appointments/${id}`, { method: 'PUT', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast.success('Consulta atualizada');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao salvar', e.message),
  });

  const s = appointmentStatusInfo(data.status);
  const psychName = psychologists.data?.find((p) => p.id === data.psychologistId)?.user?.fullName;
  const roomName = data.roomId === 0 ? 'Online' : rooms.data?.find((r) => r.id === data.roomId)?.name;
  const dirty = status !== data.status || notes !== (data.notes ?? '');

  return (
    <>
      <Stack.Screen options={{ title: 'Consulta' }} />
      <Screen
        footer={
          <Button title="Salvar alterações" disabled={!dirty} loading={update.isPending} onPress={() => update.mutate({ status, notes })} />
        }>
        <Card style={{ gap: 12 }}>
          <View style={styles.titleRow}>
            <AppText variant="heading" style={{ flex: 1 }}>
              {data.patientName}
            </AppText>
            <Badge label={s.label} tone={s.tone} />
          </View>
          <Info icon={CalendarDays} text={formatDateLong(data.date)} capitalize />
          <Info icon={Clock} text={`${formatTime(data.startTime)} – ${formatTime(data.endTime)}`} />
          {psychName && <Info icon={UserRound} text={psychName} />}
          {roomName && <Info icon={DoorOpen} text={roomName} />}
        </Card>

        <Card style={{ gap: 14 }}>
          <SelectField label="Status" value={status} options={statusOptions} onChange={setStatus} />
          <TextField label="Observações" multiline value={notes} onChangeText={setNotes} placeholder="Opcional" />
        </Card>
      </Screen>
    </>
  );
}

function Info({ icon: Icon, text, capitalize }: { icon: typeof Clock; text: string; capitalize?: boolean }) {
  return (
    <View style={styles.info}>
      <Icon size={18} color={colors.textMuted} />
      <AppText style={capitalize ? { textTransform: 'capitalize' } : undefined}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
