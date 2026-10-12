import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { SpecializationSelector } from '@/components/profile/SpecializationSelector';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useAdminPsychologists } from '@/api/admin';
import { api } from '@/api/client';
import { confirm } from '@/utils/confirm';
import { monthsAtClinicText } from '@/utils/people';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { AdminPsychologist } from '@/types/admin';

/** Admin edit of a psychologist (web "Editar: {nome}" modal). */
export default function AdminPsychologistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useAdminPsychologists();
  const p = data?.find((x) => x.id === Number(id));
  if (isLoading) return <LoadingState />;
  if (error || !p) return <ErrorState message={error?.message ?? 'Psicóloga não encontrada'} onRetry={refetch} />;
  return <PsychologistEditor p={p} />;
}

function PsychologistEditor({ p }: { p: AdminPsychologist }) {
  const id = p.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    fullName: p.user.fullName,
    email: p.user.email,
    phone: p.phone ?? '',
    birthDate: p.user.birthDate?.slice(0, 10) ?? '',
    crpNumber: p.crpNumber ?? '',
    startedAtClinic: p.startedAtClinic?.slice(0, 10) ?? '',
    bio: p.bio ?? '',
  });
  const [areas, setAreas] = useState<number[]>(() => p.specializations.map((s) => s.id));
  const [status, setStatus] = useState(p.user.status);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/psychologists'] });
    queryClient.invalidateQueries({ queryKey: ['/api/psychologists'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const empty = (v: string) => (v.trim() ? v.trim() : null);
      // `status` is omitted on purpose: the web re-sent the old status and reverted the toggle
      await api(`/api/admin/psychologists/${id}`, {
        method: 'PATCH',
        body: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: empty(form.phone),
          birthDate: empty(form.birthDate),
          crpNumber: empty(form.crpNumber),
          startedAtClinic: empty(form.startedAtClinic),
          bio: empty(form.bio),
        },
      });
      await api(`/api/admin/psychologists/${id}/specializations`, { method: 'PUT', body: { specializationIds: areas } });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Perfil atualizado com sucesso!');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao salvar', e.message),
  });

  const toggle = useMutation({
    mutationFn: () => api<{ status: string }>(`/api/admin/psychologists/${id}/toggle-active`, { method: 'POST' }),
    onSuccess: (res) => {
      setStatus(res.status);
      invalidate();
      toast.success(res.status === 'active' ? 'Psicóloga ativada.' : 'Psicóloga desativada.');
    },
    onError: (e: Error) => toast.error('Erro', e.message),
  });

  const active = status === 'active';
  const field = (key: keyof typeof form, label: string, extra: Partial<React.ComponentProps<typeof TextField>> = {}) => (
    <TextField label={label} value={form[key]} onChangeText={(t) => setForm({ ...form, [key]: t })} {...extra} />
  );

  return (
    <>
      <Stack.Screen options={{ title: p.user.fullName }} />
      <Screen footer={<Button title="Salvar alterações" disabled={!form.fullName.trim()} loading={save.isPending} onPress={() => save.mutate()} />}>
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Avatar name={p.user.fullName} uri={p.user.profileImage} size={72} />
          <AppText variant="heading" center>
            {p.user.fullName}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Badge label={active ? 'Ativa' : 'Inativa'} tone={active ? 'success' : 'neutral'} />
            {p.crpNumber && <Badge label={`CRP ${p.crpNumber}`} tone="lilac" />}
          </View>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 6 }}>
            {[
              ['Pacientes ativos', String(p.activePatientsCount)],
              ['Sessões totais', String(p.sessionsCount)],
              ['Na clínica', monthsAtClinicText(null, false, p.monthsAtClinic)],
            ].map(([l, v]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                <AppText weight="semibold">{v}</AppText>
                <AppText variant="caption" tone="muted">
                  {l}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ gap: 14 }}>
          {field('fullName', 'Nome completo')}
          {field('email', 'E-mail', { keyboardType: 'email-address', autoCapitalize: 'none' })}
          {field('phone', 'Telefone', { keyboardType: 'phone-pad' })}
          <DateTimeField label="Data de nascimento" mode="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
          {field('crpNumber', 'Número do CRP')}
          <DateTimeField
            label="Entrada na clínica"
            mode="date"
            value={form.startedAtClinic}
            onChange={(v) => setForm({ ...form, startedAtClinic: v })}
          />
          {field('bio', 'Sobre / bio', { multiline: true })}
        </Card>

        <Card style={{ gap: 12 }}>
          <AppText variant="subtitle">Áreas de atuação</AppText>
          <SpecializationSelector selectedIds={areas} onChange={setAreas} />
        </Card>

        <Card style={{ gap: 10 }}>
          <AppText variant="subtitle">Status da psicóloga</AppText>
          <AppText tone="muted">{active ? 'Psicóloga está ativa no sistema.' : 'Psicóloga está inativa no sistema.'}</AppText>
          <Button
            title={active ? 'Desativar' : 'Ativar'}
            variant={active ? 'danger' : 'primary'}
            style={!active ? { backgroundColor: colors.success } : undefined}
            loading={toggle.isPending}
            onPress={async () => {
              const ok = await confirm({
                title: active ? 'Desativar psicóloga?' : 'Ativar psicóloga?',
                confirmLabel: active ? 'Desativar' : 'Ativar',
                destructive: active,
              });
              if (ok) toggle.mutate();
            }}
          />
        </Card>
      </Screen>
    </>
  );
}
