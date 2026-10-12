import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Monitor, MapPin, User } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { usePatients, usePsychologists, useRooms } from '@/api/queries';
import { useMyPsychologist } from '@/hooks/useMyPsychologist';
import { toDateKey } from '@/utils/format';
import { addMinutes } from '@/utils/time';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

const schema = z
  .object({
    patientName: z.string().trim().min(1, 'Informe o paciente'),
    psychologistId: z.number({ message: 'Selecione a psicóloga' }).int().positive('Selecione a psicóloga'),
    modality: z.enum(['presential', 'online']),
    roomId: z.number().int(),
    status: z.string(),
    date: z.string().min(1, 'Data é obrigatória'),
    startTime: z.string().min(1, 'Horário de início é obrigatório'),
    endTime: z.string().min(1, 'Horário de término é obrigatório'),
    duration: z.enum(['50', '60', '90']),
    notes: z.string().optional(),
  })
  .refine((d) => d.modality === 'online' || d.roomId > 0, { message: 'Selecione a sala', path: ['roomId'] })
  .refine((d) => d.endTime > d.startTime, { message: 'O término deve ser depois do início', path: ['endTime'] });
type FormData = z.infer<typeof schema>;

const statusOptions = [
  { label: 'Aguardando', value: 'scheduled' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'canceled' },
  { label: 'Primeira sessão', value: 'first-session' },
];

const durationOptions = [
  { label: '50 minutos', value: '50' as const },
  { label: '60 minutos', value: '60' as const },
  { label: '90 minutos', value: '90' as const },
];

const serverErrors: Record<string, string> = {
  'Room is not available for the specified time': 'A sala já está ocupada neste horário.',
};

export default function NewAppointmentScreen() {
  const params = useLocalSearchParams<{ date?: string; time?: string }>();
  const queryClient = useQueryClient();
  const { psychologist: me, isPsychologist } = useMyPsychologist();
  const psychologists = usePsychologists();
  const rooms = useRooms();
  const patients = usePatients();
  const [patientPicker, setPatientPicker] = useState<number | null>(null);

  const start = params.time ?? '09:00';
  const { control, handleSubmit, setValue, getValues, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientName: '',
      psychologistId: 0,
      modality: 'presential',
      roomId: 0,
      status: 'scheduled',
      date: params.date ?? toDateKey(),
      startTime: start,
      endTime: addMinutes(start, 50),
      duration: '50',
      notes: '',
    },
  });
  const modality = useWatch({ control, name: 'modality' });

  const create = useMutation({
    mutationFn: ({ modality: _m, duration: _d, ...data }: FormData) =>
      api('/api/appointments', {
        method: 'POST',
        // Psychologists: the server enforces their own id
        body: { ...data, psychologistId: isPsychologist ? me?.id ?? data.psychologistId : data.psychologistId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/room-bookings'] });
      toast.success('Agendamento criado', 'O agendamento foi criado com sucesso.');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao agendar', serverErrors[e.message] ?? e.message),
  });

  const onSubmit = handleSubmit((data) => create.mutate(data));

  // Psychologists don't pick: fill in their own profile id for validation
  useEffect(() => {
    if (isPsychologist && me) setValue('psychologistId', me.id);
  }, [isPsychologist, me, setValue]);

  const patientOptions = (patients.data ?? []).map((p) => ({
    label: p.fullName,
    value: p.id,
    description: p.email ?? undefined,
  }));

  return (
    <>
      <Stack.Screen options={{ title: 'Nova consulta' }} />
      <Screen
        footer={<Button title="Criar agendamento" onPress={onSubmit} loading={create.isPending || formState.isSubmitting} />}>
        <Card style={styles.section}>
          <Controller
            control={control}
            name="patientName"
            render={({ field, fieldState }) => (
              <TextField
                label="Paciente"
                placeholder="Nome do paciente"
                icon={User}
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
          {patientOptions.length > 0 && (
            <SelectField
              placeholder="Buscar paciente cadastrado"
              value={patientPicker}
              options={patientOptions}
              searchable
              onChange={(id) => {
                setPatientPicker(id);
                const p = patients.data?.find((x) => x.id === id);
                if (p) setValue('patientName', p.fullName, { shouldValidate: true });
              }}
            />
          )}

          {isPsychologist ? (
            <View style={{ gap: 6 }}>
              <AppText variant="label">Psicóloga</AppText>
              <View style={styles.readonly}>
                <AppText>{me?.user?.fullName ?? '—'}</AppText>
              </View>
              {!me && !psychologists.isLoading && (
                <AppText variant="caption" tone="danger">
                  Seu perfil de psicóloga não foi encontrado. Fale com o administrador.
                </AppText>
              )}
            </View>
          ) : (
            <Controller
              control={control}
              name="psychologistId"
              render={({ field, fieldState }) => (
                <SelectField
                  label="Psicóloga"
                  value={field.value || null}
                  options={(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `#${p.id}`, value: p.id }))}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
        </Card>

        <Card style={styles.section}>
          <AppText variant="label">Modalidade</AppText>
          <Controller
            control={control}
            name="modality"
            render={({ field }) => (
              <Segmented
                segments={[
                  { label: 'Presencial', value: 'presential' },
                  { label: 'Online', value: 'online' },
                ]}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  if (v === 'online') setValue('roomId', 0);
                }}
              />
            )}
          />
          <View style={styles.modalityHint}>
            {modality === 'online' ? (
              <Monitor size={16} color={colors.textMuted} />
            ) : (
              <MapPin size={16} color={colors.textMuted} />
            )}
            <AppText variant="caption" tone="muted">
              {modality === 'online' ? 'Consulta online — sala não se aplica.' : 'Escolha a sala do atendimento.'}
            </AppText>
          </View>

          {modality === 'presential' && (
            <Controller
              control={control}
              name="roomId"
              render={({ field, fieldState }) => (
                <SelectField
                  label="Sala"
                  value={field.value || null}
                  options={(rooms.data ?? []).map((r) => ({ label: r.name, value: r.id }))}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}

          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <SelectField label="Status" value={field.value} options={statusOptions} onChange={field.onChange} />
            )}
          />
        </Card>

        <Card style={styles.section}>
          <Controller
            control={control}
            name="date"
            render={({ field, fieldState }) => (
              <DateTimeField label="Data" mode="date" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
            )}
          />
          <View style={styles.row}>
            <Controller
              control={control}
              name="startTime"
              render={({ field, fieldState }) => (
                <DateTimeField
                  label="Início"
                  mode="time"
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    setValue('endTime', addMinutes(v, Number(getValues('duration'))), { shouldValidate: true });
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="endTime"
              render={({ field, fieldState }) => (
                <DateTimeField label="Término" mode="time" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
          </View>
          <Controller
            control={control}
            name="duration"
            render={({ field }) => (
              <SelectField
                label="Duração"
                value={field.value}
                options={durationOptions}
                onChange={(v) => {
                  field.onChange(v);
                  setValue('endTime', addMinutes(getValues('startTime'), Number(v)), { shouldValidate: true });
                }}
              />
            )}
          />
        </Card>

        <Card style={styles.section}>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextField label="Observações" multiline value={field.value} onChangeText={field.onChange} placeholder="Opcional" />
            )}
          />
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  readonly: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  modalityHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
