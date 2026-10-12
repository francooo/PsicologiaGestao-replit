import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { usePatient } from '@/api/patients';
import { usePsychologists } from '@/api/queries';
import { confirm } from '@/utils/confirm';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

/** Admin only: transfer the patient and the whole record to another psychologist. */
export default function TransferPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = Number(id);
  const queryClient = useQueryClient();
  const patient = usePatient(patientId);
  const psychologists = usePsychologists();
  const [target, setTarget] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  const transfer = useMutation({
    mutationFn: () =>
      api(`/api/patients/${patientId}/transfer`, {
        method: 'PATCH',
        body: { toPsychologistId: target, reason: reason.trim() || null },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast.success('Paciente transferido com sucesso', `${patient.data?.fullName} foi transferido para o novo psicólogo.`);
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao transferir', e.message),
  });

  if (patient.isLoading || psychologists.isLoading) return <LoadingState />;
  if (!patient.data) return <ErrorState message={patient.error?.message} />;

  const p = patient.data;
  const current = psychologists.data?.find((x) => x.id === p.psychologistId);
  const options = (psychologists.data ?? [])
    .filter((x) => x.id !== p.psychologistId && x.user?.status === 'active')
    .map((x) => ({ label: x.user?.fullName || `Psicólogo #${x.userId}`, value: x.id }));

  const onSubmit = async () => {
    const ok = await confirm({
      title: 'Confirmar transferência',
      message: `${current?.user?.fullName ?? 'O psicólogo atual'} perderá o acesso imediatamente. Esta ação será registrada no histórico de auditoria.`,
      confirmLabel: 'Sim, transferir',
    });
    if (ok) transfer.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Transferir paciente' }} />
      <Screen footer={<Button title="Transferir paciente" disabled={!target} loading={transfer.isPending} onPress={onSubmit} />}>
        <AppText tone="muted">
          Transfere <AppText weight="semibold">{p.fullName}</AppText> e todo o seu prontuário para outro psicólogo. O
          psicólogo anterior perderá o acesso imediatamente.
        </AppText>
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="label">Psicólogo atual</AppText>
            <View style={{ minHeight: 50, borderRadius: 12, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, justifyContent: 'center' }}>
              <AppText>{current?.user?.fullName ?? 'Não vinculado'}</AppText>
            </View>
          </View>
          <SelectField
            label="Transferir para *"
            placeholder={options.length ? 'Selecione o psicólogo de destino' : 'Nenhum outro psicólogo disponível'}
            disabled={!options.length}
            value={target}
            options={options}
            onChange={setTarget}
          />
          <TextField
            label="Motivo da transferência (opcional)"
            multiline
            placeholder="Ex.: Mudança de especialidade, encerramento de contrato..."
            value={reason}
            onChangeText={setReason}
          />
        </Card>
      </Screen>
    </>
  );
}
