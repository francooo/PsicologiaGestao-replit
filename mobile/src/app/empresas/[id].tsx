import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Mail, Pause, Play, Trash2, UserPlus } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import {
  adminResultMessage,
  PLATFORM_COMPANIES_KEY,
  platformCompanyKey,
  usePlatformCompany,
  type AddAdminResult,
  type PlatformCompany,
} from '@/api/platform';
import { confirm } from '@/utils/confirm';
import { formatDate } from '@/utils/format';
import { roleLabels } from '@/utils/status';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

/** Platform admin: one company — data, suspend/reactivate, admins, members and pending invites. */
export default function CompanyDetailScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const queryClient = useQueryClient();
  const detail = usePlatformCompany(id);
  const [adminEmail, setAdminEmail] = useState('');
  const company = detail.data?.company;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: PLATFORM_COMPANIES_KEY });
    queryClient.invalidateQueries({ queryKey: platformCompanyKey(id) });
  };

  const save = useMutation({
    mutationFn: (body: Record<string, string>) => api(`/api/platform/companies/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      refresh();
      toast.success('Empresa atualizada');
    },
    onError: (e: Error) => toast.error('Não foi possível salvar', e.message),
  });
  const addAdmin = useMutation({
    mutationFn: () => api<AddAdminResult>(`/api/platform/companies/${id}/admins`, { method: 'POST', body: { email: adminEmail } }),
    onSuccess: (res) => {
      refresh();
      setAdminEmail('');
      toast.success('Administrador adicionado', adminResultMessage(res));
    },
    onError: (e: Error) => toast.error('Não foi possível adicionar', e.message),
  });
  const cancelInvite = useMutation({
    mutationFn: (inviteId: number) => api(`/api/platform/companies/${id}/invites/${inviteId}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error('Não foi possível cancelar', e.message),
  });

  if (detail.isLoading) return <LoadingState />;
  if (detail.error || !company) return <ErrorState message={detail.error?.message} onRetry={detail.refetch} />;

  const suspended = company.status === 'suspended';

  const toggleStatus = async () => {
    if (!suspended) {
      const ok = await confirm({
        title: `Suspender ${company.name}?`,
        message: 'Ninguém consegue entrar nesta empresa enquanto estiver suspensa. Os dados continuam guardados.',
        confirmLabel: 'Suspender',
        destructive: true,
      });
      if (!ok) return;
    }
    save.mutate({ status: suspended ? 'active' : 'suspended' });
  };

  return (
    <>
      <Stack.Screen options={{ title: company.name }} />
      <Screen refreshing={detail.isRefetching} onRefresh={detail.refetch}>
        <CompanyDataCard
          // Re-created after a save, so the fields start from the saved values
          key={`${company.name}|${company.cnpj}`}
          company={company}
          saving={save.isPending}
          onSave={(name, cnpj) => save.mutate({ name, cnpj })}>
          <Button
            title={suspended ? 'Reativar empresa' : 'Suspender empresa'}
            variant={suspended ? 'secondary' : 'outline'}
            icon={suspended ? <Play size={16} color={colors.primary} /> : <Pause size={16} color={colors.danger} />}
            onPress={toggleStatus}
            disabled={save.isPending}
          />
        </CompanyDataCard>

        <Card style={{ gap: 12 }}>
          <AppText variant="subtitle">Novo administrador</AppText>
          <TextField
            label="E-mail"
            value={adminEmail}
            onChangeText={setAdminEmail}
            icon={Mail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            hint="Sem conta ainda? Entra como administrador no primeiro acesso."
          />
          <Button
            title="Adicionar"
            icon={<UserPlus size={18} color={colors.onPrimary} />}
            onPress={() => addAdmin.mutate()}
            loading={addAdmin.isPending}
            disabled={!adminEmail.trim()}
          />
        </Card>

        <Card style={{ gap: 10 }}>
          <AppText variant="subtitle">Membros ({detail.data!.members.length})</AppText>
          {detail.data!.members.length === 0 ? (
            <AppText tone="muted">Ninguém ainda</AppText>
          ) : (
            detail.data!.members.map((m) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText numberOfLines={1}>{m.fullName}</AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {m.email}
                  </AppText>
                </View>
                <Badge label={roleLabels[m.role] ?? m.role} tone={m.role === 'admin' ? 'lilac' : 'neutral'} />
                {m.status !== 'active' && <Badge label="Inativo" tone="neutral" />}
              </View>
            ))
          )}
        </Card>

        <Card style={{ gap: 10 }}>
          <AppText variant="subtitle">Aguardando primeiro acesso ({detail.data!.invites.length})</AppText>
          {detail.data!.invites.length === 0 ? (
            <AppText tone="muted">Nenhum e-mail aguardando</AppText>
          ) : (
            detail.data!.invites.map((i) => (
              <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color={colors.textMuted} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText numberOfLines={1}>{i.email}</AppText>
                  <AppText variant="caption" tone="muted">
                    {roleLabels[i.role] ?? i.role} · desde {formatDate(i.createdAt)}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cancelar pré-autorização de ${i.email}`}
                  hitSlop={8}
                  disabled={cancelInvite.isPending}
                  onPress={() => cancelInvite.mutate(i.id)}>
                  <Trash2 size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))
          )}
        </Card>
      </Screen>
    </>
  );
}

function CompanyDataCard({
  company,
  saving,
  onSave,
  children,
}: {
  company: PlatformCompany;
  saving: boolean;
  onSave: (name: string, cnpj: string) => void;
  children: React.ReactNode;
}) {
  const [name, setName] = useState(company.name);
  const [cnpj, setCnpj] = useState(company.cnpj ?? '');
  const changed = name.trim() !== company.name || cnpj.replace(/\D/g, '') !== (company.cnpj ?? '');
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText variant="subtitle" style={{ flex: 1 }}>
          Dados
        </AppText>
        {company.status === 'suspended' && <Badge label="Suspensa" tone="danger" />}
      </View>
      <TextField label="Nome" value={name} onChangeText={setName} />
      <TextField label="CNPJ" value={cnpj} onChangeText={setCnpj} keyboardType="number-pad" />
      <Button title="Salvar dados" onPress={() => onSave(name.trim(), cnpj)} disabled={!changed || !name.trim()} loading={saving} />
      {children}
    </Card>
  );
}
