import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PatientForm } from '@/components/patient/PatientForm';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { api } from '@/api/client';
import { usePatient } from '@/api/patients';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from '@/utils/toast';

export default function EditPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const patient = usePatient(patientId);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => api(`/api/patients/${patientId}`, { method: 'PUT', body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast.success('Dados atualizados', 'As informações do paciente foram salvas com sucesso.');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao salvar', e.message),
  });

  if (patient.isLoading) return <LoadingState />;
  if (!patient.data) return <ErrorState message={patient.error?.message} onRetry={patient.refetch} />;

  return (
    <>
      <Stack.Screen options={{ title: 'Editar paciente' }} />
      <PatientForm
        mode="edit"
        initial={patient.data}
        isAdmin={user?.role === 'admin'}
        submitLabel="Salvar alterações"
        loading={save.isPending}
        onSubmit={(body) => save.mutate(body)}
      />
    </>
  );
}
