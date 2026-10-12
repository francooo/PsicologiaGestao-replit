import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { api } from '@/api/client';
import { usePsychologists, useRooms } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { useMyPsychologist } from '@/hooks/useMyPsychologist';
import { toDateKey } from '@/utils/format';
import { addMinutes } from '@/utils/time';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

const purposes = ['Consulta', 'Supervisão', 'Formação', 'Uso pessoal', 'Outro'].map((p) => ({ label: p, value: p }));

export default function BookRoomScreen() {
  const params = useLocalSearchParams<{ date?: string; roomId?: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const rooms = useRooms();
  const psychologists = usePsychologists();
  const { psychologist: me } = useMyPsychologist();
  const isAdmin = user?.role === 'admin';

  const [pickedId, setPickedId] = useState<number | null>(null);
  // Non-admins always book for themselves
  const psychologistId = isAdmin ? pickedId : me?.id ?? null;
  const [roomId, setRoomId] = useState<number | null>(params.roomId ? Number(params.roomId) : null);
  const [purpose, setPurpose] = useState('Consulta');
  const [date, setDate] = useState(params.date ?? toDateKey());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const create = useMutation({
    mutationFn: () =>
      api('/api/room-bookings', {
        method: 'POST',
        body: { psychologistId, roomId, purpose, date, startTime, endTime },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/room-bookings'] });
      toast.success('Reserva criada', 'Sala reservada com sucesso.');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao reservar', e.message),
  });

  const timeError = endTime <= startTime ? 'O término deve ser depois do início' : undefined;
  const invalid = !psychologistId || !roomId || !date || !!timeError;

  return (
    <>
      <Stack.Screen options={{ title: 'Reservar sala' }} />
      <Screen footer={<Button title="Reservar" disabled={invalid} loading={create.isPending} onPress={() => create.mutate()} />}>
        <Card style={{ gap: 14 }}>
          {isAdmin ? (
            <SelectField
              label="Psicóloga"
              value={psychologistId}
              options={(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `#${p.id}`, value: p.id }))}
              onChange={setPickedId}
            />
          ) : me ? (
            <View style={{ gap: 6 }}>
              <AppText variant="label">Psicóloga</AppText>
              <View style={styles.readonly}>
                <AppText>{me.user?.fullName ?? user?.fullName}</AppText>
              </View>
            </View>
          ) : (
            <View style={styles.warning}>
              <AppText variant="caption" style={{ color: colors.warning }}>
                Seu registro de psicóloga não foi encontrado. Entre em contato com o administrador.
              </AppText>
            </View>
          )}

          <SelectField
            label="Sala"
            value={roomId}
            options={(rooms.data ?? []).map((r) => ({ label: r.name, value: r.id }))}
            onChange={setRoomId}
          />
          <SelectField label="Tipo" value={purpose} options={purposes} onChange={setPurpose} />
        </Card>

        <Card style={{ gap: 14 }}>
          <DateTimeField label="Data" mode="date" value={date} onChange={setDate} />
          <View style={styles.row}>
            <DateTimeField
              label="Início"
              mode="time"
              value={startTime}
              onChange={(v) => {
                setStartTime(v);
                if (endTime <= v) setEndTime(addMinutes(v, 60));
              }}
            />
            <DateTimeField label="Término" mode="time" value={endTime} onChange={setEndTime} error={timeError} />
          </View>
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  readonly: { minHeight: 50, borderRadius: 12, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, justifyContent: 'center' },
  warning: { backgroundColor: colors.warningSoft, borderRadius: 12, padding: 12 },
});
