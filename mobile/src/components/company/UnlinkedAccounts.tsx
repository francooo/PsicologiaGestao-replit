import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, RotateCcw, Search, UserCheck, UserX } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import {
  PLATFORM_COMPANIES_KEY,
  UNLINKED_KEY,
  usePlatformCompanies,
  useUnlinkedAccounts,
  type UnlinkedAccount,
  type UnlinkedFilter,
} from '@/api/platform';
import { confirm } from '@/utils/confirm';
import { formatDate } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

const ROLES = [
  {
    value: 'psychologist',
    label: 'Psicóloga',
    description: 'Atende pacientes, agenda e prontuários.',
  },
  {
    value: 'receptionist',
    label: 'Recepcionista',
    description: 'Agenda, salas e cadastro de pacientes.',
  },
  {
    value: 'admin',
    label: 'Administrador',
    description: 'Gerencia a clínica, a equipe e o financeiro.',
  },
];

/** Empresas → Sem clínica: who signed up without an invite (or lost every clinic). Same API as the web tab. */
export function UnlinkedAccounts() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<UnlinkedFilter>('waiting');
  const [search, setSearch] = useState('');
  const [linking, setLinking] = useState<UnlinkedAccount | null>(null);
  const accounts = useUnlinkedAccounts(filter);

  const term = search.trim().toLowerCase();
  const shown = (accounts.data ?? []).filter((a) => !term || `${a.fullName} ${a.email}`.toLowerCase().includes(term));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: UNLINKED_KEY });
    queryClient.invalidateQueries({ queryKey: PLATFORM_COMPANIES_KEY });
  };

  const deactivate = useMutation({
    mutationFn: (a: UnlinkedAccount) =>
      api(`/api/platform/unlinked-accounts/${a.id}/deactivate`, {
        method: 'POST',
      }),
    onSuccess: (_res, a) => {
      refresh();
      toast.success(`Conta de ${a.fullName} desativada`, 'Ela fica em Desativadas e pode ser reativada.');
    },
    onError: (e: Error) => toast.error('Não foi possível desativar', e.message),
  });

  const reactivate = useMutation({
    mutationFn: (a: UnlinkedAccount) =>
      api(`/api/platform/unlinked-accounts/${a.id}/reactivate`, {
        method: 'POST',
      }),
    onSuccess: (_res, a) => {
      refresh();
      toast.success(`Conta de ${a.fullName} reativada`, 'Ela volta para a lista Aguardando.');
    },
    onError: (e: Error) => toast.error('Não foi possível reativar', e.message),
  });

  const askDeactivate = async (a: UnlinkedAccount) => {
    const ok = await confirm({
      title: `Desativar a conta de ${a.fullName}?`,
      message: 'A pessoa não consegue mais entrar e as sessões abertas são encerradas. Dá para reativar depois.',
      confirmLabel: 'Desativar',
      destructive: true,
    });
    if (ok) deactivate.mutate(a);
  };

  return (
    <>
      <Segmented
        segments={[
          { label: 'Aguardando', value: 'waiting' },
          { label: 'Desativadas', value: 'inactive' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <TextField icon={Search} placeholder="Buscar por nome ou e-mail" value={search} onChangeText={setSearch} autoCapitalize="none" />

      {accounts.isLoading ? (
        <LoadingState />
      ) : accounts.error ? (
        <ErrorState message={accounts.error.message} onRetry={accounts.refetch} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title={term ? 'Nenhuma conta encontrada' : filter === 'waiting' ? 'Nenhuma conta aguardando vínculo' : 'Nenhuma conta desativada'}
          description={
            !term && filter === 'waiting'
              ? 'Aparecem aqui as pessoas que criaram a conta sem convite, ou que saíram de todas as clínicas.'
              : undefined
          }
        />
      ) : (
        shown.map((a) => (
          <Card key={a.id} style={{ gap: 12 }}>
            <View style={styles.header}>
              <Avatar name={a.fullName} uri={a.avatarUrl} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameRow}>
                  <AppText variant="subtitle" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {a.fullName}
                  </AppText>
                  {a.viaGoogle && <Badge label="Google" tone="neutral" />}
                </View>
                <AppText tone="muted" numberOfLines={1}>
                  {a.email}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {a.createdAt ? `Cadastro em ${formatDate(a.createdAt)}` : 'Conta antiga'}
                  {a.lastCompanyName ? ` · Saiu de ${a.lastCompanyName}` : ''}
                </AppText>
              </View>
            </View>
            {filter === 'waiting' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button
                  title="Desativar"
                  size="sm"
                  variant="outline"
                  style={{ flex: 1 }}
                  icon={<UserX size={16} color={colors.danger} />}
                  loading={deactivate.isPending && deactivate.variables?.id === a.id}
                  onPress={() => askDeactivate(a)}
                />
                <Button
                  title="Vincular"
                  size="sm"
                  style={{ flex: 1 }}
                  icon={<Link2 size={16} color={colors.onPrimary} />}
                  onPress={() => setLinking(a)}
                />
              </View>
            ) : (
              <Button
                title="Reativar"
                size="sm"
                variant="outline"
                icon={<RotateCcw size={16} color={colors.ink} />}
                loading={reactivate.isPending && reactivate.variables?.id === a.id}
                onPress={() => reactivate.mutate(a)}
              />
            )}
          </Card>
        ))
      )}

      {linking && <LinkSheet account={linking} onClose={() => setLinking(null)} onLinked={refresh} />}
    </>
  );
}

function LinkSheet({ account, onClose, onLinked }: { account: UnlinkedAccount; onClose: () => void; onLinked: () => void }) {
  const companies = usePlatformCompanies();
  const active = (companies.data ?? []).filter((c) => c.status === 'active');
  const [companyId, setCompanyId] = useState<number | null>(active.length === 1 ? active[0].id : null);
  const [role, setRole] = useState('psychologist');

  const link = useMutation({
    mutationFn: () =>
      api<{ company: { name: string } }>(`/api/platform/unlinked-accounts/${account.id}/link`, {
        method: 'POST',
        body: { companyId, role },
      }),
    onSuccess: (res) => {
      onLinked();
      onClose();
      toast.success(`${account.fullName} agora faz parte de ${res.company.name}`, 'No próximo acesso, a pessoa já entra nesta clínica.');
    },
    onError: (e: Error) => toast.error('Não foi possível vincular', e.message),
  });

  return (
    <Sheet
      visible
      onClose={() => !link.isPending && onClose()}
      title="Vincular a uma clínica"
      footer={
        <Button
          title="Vincular"
          icon={<Link2 size={18} color={colors.onPrimary} />}
          loading={link.isPending}
          disabled={companyId === null}
          onPress={() => link.mutate()}
        />
      }>
      <View style={{ gap: 14 }}>
        <AppText tone="muted">
          {account.fullName} · {account.email}
        </AppText>
        <SelectField
          label="Clínica"
          placeholder="Escolha a clínica"
          value={companyId}
          options={active.map((c) => ({ label: c.name, value: c.id }))}
          onChange={setCompanyId}
        />
        <SelectField label="Papel na clínica" value={role} options={ROLES} onChange={setRole} />
        <AppText variant="caption" tone="muted">
          No próximo acesso, a pessoa já entra nesta clínica com o papel escolhido.
        </AppText>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
