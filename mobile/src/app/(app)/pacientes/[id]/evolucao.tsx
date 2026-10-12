import { useState } from 'react';
import { View } from 'react-native';
import { format } from 'date-fns';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { patientKeys, usePatient } from '@/api/patients';
import { useMyPsychologist } from '@/hooks/useMyPsychologist';
import { toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';

const statusOptions = [
  { label: 'Realizada', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
  { label: 'Falta', value: 'no-show' },
];

/**
 * New clinical session (evolution). The web shows a "Nova Evolução" button with no form;
 * the API (POST /api/patients/:id/sessions) already exists, so the app implements it.
 */
export default function NewEvolutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = Number(id);
  const queryClient = useQueryClient();
  const patient = usePatient(patientId);
  const { psychologist: me } = useMyPsychologist();
  const psychologistId = me?.id ?? patient.data?.psychologistId ?? null;

  const [sessionDate, setSessionDate] = useState(toDateKey());
  const [sessionTime, setSessionTime] = useState(format(new Date(), 'HH:mm'));
  const [duration, setDuration] = useState('50');
  const [sessionType, setSessionType] = useState<'in-person' | 'online'>('in-person');
  const [status, setStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [observations, setObservations] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const create = useMutation({
    mutationFn: () =>
      api(`/api/patients/${patientId}/sessions`, {
        method: 'POST',
        body: {
          psychologistId,
          sessionDate,
          sessionTime,
          durationMinutes: Number(duration) || 50,
          sessionType,
          status,
          evolutionNotes: notes.trim(),
          clinicalObservations: observations.trim() || null,
          nextSteps: nextSteps.trim() || null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.sessions(patientId) });
      queryClient.invalidateQueries({ queryKey: patientKeys.counts(patientId) });
      toast.success('Evolução registrada');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao salvar', e.message),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Nova evolução' }} />
      <Screen
        footer={
          <Button
            title="Salvar evolução"
            disabled={!notes.trim() || !psychologistId}
            loading={create.isPending}
            onPress={() => create.mutate()}
          />
        }>
        {!psychologistId && !patient.isLoading && (
          <AppText tone="danger">Vincule uma psicóloga ao paciente antes de registrar evoluções.</AppText>
        )}
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateTimeField label="Data" mode="date" value={sessionDate} onChange={setSessionDate} />
            <DateTimeField label="Horário" mode="time" value={sessionTime} onChange={setSessionTime} />
          </View>
          <TextField label="Duração (min)" keyboardType="number-pad" value={duration} onChangeText={setDuration} />
          <Segmented
            segments={[
              { label: 'Presencial', value: 'in-person' },
              { label: 'Online', value: 'online' },
            ]}
            value={sessionType}
            onChange={setSessionType}
          />
          <SelectField label="Situação" value={status} options={statusOptions} onChange={setStatus} />
        </Card>
        <Card style={{ gap: 14 }}>
          <TextField label="Evolução *" multiline placeholder="Registro da sessão..." value={notes} onChangeText={setNotes} />
          <TextField label="Observações clínicas" multiline value={observations} onChangeText={setObservations} />
          <TextField label="Próximos passos" multiline value={nextSteps} onChangeText={setNextSteps} />
        </Card>
      </Screen>
    </>
  );
}
