import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PatientForm } from '@/components/patient/PatientForm';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { toast } from '@/utils/toast';
import type { PatientDetail } from '@/types/patient';

export default function NewPatientScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<PatientDetail>('/api/patients', { method: 'POST', body: { ...body, status: 'active' } }),
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      toast.success('Paciente cadastrado com sucesso!');
      router.replace({ pathname: '/pacientes/[id]', params: { id: String(patient.id) } });
    },
    onError: (e: Error) => toast.error('Erro ao cadastrar', e.message),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Novo paciente' }} />
      <PatientForm
        mode="create"
        isAdmin={user?.role === 'admin'}
        submitLabel="Cadastrar"
        loading={create.isPending}
        onSubmit={(body) => create.mutate(body)}
      />
    </>
  );
}
