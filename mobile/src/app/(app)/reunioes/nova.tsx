import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { meetingError, useGoogleStatus } from '@/api/meetings';
import { usePatients } from '@/api/queries';
import { toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';

const durations = [30, 45, 50, 60, 90].map((d) => ({ label: `${d} min`, value: d }));

export default function NewMeetingScreen() {
  const queryClient = useQueryClient();
  const patients = usePatients();
  const google = useGoogleStatus();
  const connected = !!google.data?.authenticated;

  const [patientId, setPatientId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(toDateKey());
  const [time, setTime] = useState(format(new Date(), 'HH:mm'));
  const [duration, setDuration] = useState(50);
  const [description, setDescription] = useState('');
  const [sendNow, setSendNow] = useState(false);

  const patient = patients.data?.find((p) => p.id === patientId);
  const hasEmail = !!patient?.email;

  const create = useMutation({
    mutationFn: () =>
      api<{ meetLink: string | null; emailSent: boolean; hasGoogleCalendar: boolean; warning?: string; warningMessage?: string }>(
        '/api/meetings',
        {
          method: 'POST',
          body: {
            patientId,
            title: title.trim() || `Sessão com ${patient?.fullName}`,
            description: description.trim() || undefined,
            scheduledAt: new Date(`${date}T${time}:00`).toISOString(),
            durationMinutes: duration,
            sendLinkNow: sendNow && hasEmail && connected,
          },
        },
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meetings'] });
      if (!res.hasGoogleCalendar) toast.info('Reunião criada', 'Conecte sua conta Google para gerar link do Meet automaticamente.');
      else if (!res.meetLink) toast.info('Reunião criada', 'Não foi possível gerar o link do Meet.');
      else toast.success('Reunião criada', res.emailSent ? 'E-mail enviado para a paciente.' : 'Link do Meet gerado.');
      if (res.warning) toast.error('Atenção', res.warningMessage);
      router.back();
    },
    onError: meetingError,
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Nova reunião' }} />
      <Screen footer={<Button title="Criar reunião" disabled={!patientId} loading={create.isPending} onPress={() => create.mutate()} />}>
        <Card style={{ gap: 14 }}>
          <SelectField
            label="Paciente *"
            placeholder="Buscar paciente..."
            searchable
            value={patientId}
            options={(patients.data ?? []).map((p) => ({ label: p.fullName, value: p.id, description: p.email ?? undefined }))}
            onChange={(id) => {
              setPatientId(id);
              const p = patients.data?.find((x) => x.id === id);
              if (p && !title.trim()) setTitle(`Sessão com ${p.fullName}`);
            }}
          />
          {patient && !hasEmail && (
            <AppText variant="caption" style={{ color: colors.warning }}>
              Esta paciente não possui e-mail cadastrado. Compartilhe o link manualmente.
            </AppText>
          )}
          <TextField label="Título da sessão" value={title} onChangeText={setTitle} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateTimeField label="Data *" mode="date" value={date} onChange={setDate} />
            <DateTimeField label="Horário *" mode="time" value={time} onChange={setTime} />
          </View>
          <SelectField label="Duração" value={duration} options={durations} onChange={setDuration} />
          <TextField label="Descrição / pauta (opcional)" multiline placeholder="Assuntos a abordar..." value={description} onChangeText={setDescription} />
        </Card>

        <Card style={{ gap: 10 }}>
          <View style={styles.switchRow}>
            <AppText variant="label" style={{ flex: 1 }}>
              Enviar link para a paciente agora
            </AppText>
            <Switch
              value={sendNow && hasEmail && connected}
              disabled={!hasEmail || !connected}
              onValueChange={setSendNow}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <AppText variant="caption" tone="muted">
            {!connected
              ? 'Conecte o Google Calendar para enviar o link por e-mail automaticamente.'
              : hasEmail
                ? `E-mail: ${patient?.email} (qualquer e-mail funciona, não precisa ser Gmail)`
                : 'Cadastre o e-mail no perfil da paciente para enviar o link.'}
          </AppText>
        </Card>

        <View style={[styles.info, { backgroundColor: connected ? colors.primarySoft : colors.warningSoft }]}>
          <AppText variant="caption">
            {connected
              ? 'Um evento será criado no seu Google Calendar e um link do Google Meet será gerado automaticamente.'
              : 'Google Calendar não conectado — a reunião será criada sem link do Meet. Conecte sua conta em Configurações.'}
          </AppText>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { borderRadius: radius.md, padding: 12 },
});
