import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { roleLabels } from '@/utils/status';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { User } from '@/types/api';
import type { Permission, RolePermission } from '@/types/admin';

type Tab = 'usuarios' | 'permissoes';
type EditableRole = 'psychologist' | 'receptionist';

const roleOptions = [
  { label: 'Psicóloga', value: 'psychologist' },
  { label: 'Recepcionista', value: 'receptionist' },
  { label: 'Administrador', value: 'admin' },
];
const statusOptions = [
  { label: 'Ativo', value: 'active' },
  { label: 'Inativo', value: 'inactive' },
  { label: 'Pendente', value: 'pending' },
];

const prettyPermission = (name: string) => name.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function PermissionsScreen() {
  const [tab, setTab] = useState<Tab>('usuarios');
  return (
    <>
      <Stack.Screen options={{ title: 'Permissões de acesso' }} />
      <Screen>
        <Segmented<Tab>
          segments={[
            { label: 'Usuários', value: 'usuarios' },
            { label: 'Permissões por função', value: 'permissoes' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'usuarios' ? <UsersSection /> : <MatrixSection />}
      </Screen>
    </>
  );
}

function UsersSection() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['/api/users'], queryFn: () => api<User[]>('/api/users') });
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', username: '', password: '', role: 'psychologist', status: 'active' });

  const errors = {
    fullName: !form.fullName.trim() ? 'Nome é obrigatório' : undefined,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? 'E-mail inválido' : undefined,
    username: form.username.trim().length < 3 ? 'Mínimo de 3 caracteres' : undefined,
    password: form.password.length < 6 ? 'Mínimo de 6 caracteres' : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const [touched, setTouched] = useState(false);

  const create = useMutation({
    // As admin, the server keeps the chosen role/status and does not switch the session
    mutationFn: () => api('/api/register', { method: 'POST', body: { ...form, fullName: form.fullName.trim(), email: form.email.trim(), username: form.username.trim() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/psychologists'] });
      toast.success('Usuário criado', 'O usuário foi criado com sucesso.');
      setOpen(false);
      setTouched(false);
      setForm({ fullName: '', email: '', username: '', password: '', role: 'psychologist', status: 'active' });
    },
    onError: (e: Error) => toast.error('Erro ao criar usuário', e.message === 'Username already exists' ? 'Este nome de usuário já existe.' : e.message),
  });

  const list = (users.data ?? []).filter((u) => filter === 'all' || u.role === filter);
  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });

  return (
    <>
      <Button title="Adicionar usuário" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => setOpen(true)} />
      <Segmented
        scrollable
        segments={[{ label: 'Todos', value: 'all' }, { label: 'Administrador', value: 'admin' }, { label: 'Psicóloga', value: 'psychologist' }, { label: 'Recepcionista', value: 'receptionist' }]}
        value={filter}
        onChange={setFilter}
      />
      {users.isLoading ? (
        <LoadingState />
      ) : users.error ? (
        <ErrorState message={users.error.message} onRetry={users.refetch} />
      ) : !list.length ? (
        <EmptyState title="Nenhum usuário encontrado com os filtros selecionados." />
      ) : (
        list.map((u) => (
          <Card key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={u.fullName} uri={u.profileImage ?? u.avatarUrl} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="medium">{u.fullName}</AppText>
              <AppText variant="caption" tone="muted">
                {u.email} · {roleLabels[u.role] ?? u.role}
              </AppText>
            </View>
            <Badge
              label={u.status === 'active' ? 'Ativo' : u.status === 'pending' ? 'Pendente' : 'Inativo'}
              tone={u.status === 'active' ? 'success' : u.status === 'pending' ? 'warning' : 'neutral'}
            />
          </Card>
        ))
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Novo usuário"
        footer={
          <Button
            title="Criar usuário"
            loading={create.isPending}
            onPress={() => {
              setTouched(true);
              if (valid) create.mutate();
            }}
          />
        }>
        <TextField label="Nome completo" value={form.fullName} onChangeText={set('fullName')} error={touched ? errors.fullName : undefined} />
        <TextField label="E-mail" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={set('email')} error={touched ? errors.email : undefined} />
        <TextField label="Nome de usuário" autoCapitalize="none" value={form.username} onChangeText={set('username')} error={touched ? errors.username : undefined} />
        <TextField label="Senha" password value={form.password} onChangeText={set('password')} error={touched ? errors.password : undefined} />
        <SelectField label="Função" value={form.role} options={roleOptions} onChange={set('role')} />
        <SelectField label="Status" value={form.status} options={statusOptions} onChange={set('status')} />
      </Sheet>
    </>
  );
}

function MatrixSection() {
  const permissions = useQuery({ queryKey: ['/api/permissions'], queryFn: () => api<Permission[]>('/api/permissions') });
  const links = useQuery({ queryKey: ['/api/role-permissions'], queryFn: () => api<RolePermission[]>('/api/role-permissions') });
  const [role, setRole] = useState<EditableRole>('psychologist');
  const current = useMemo(() => (links.data ?? []).filter((l) => l.role === role), [links.data, role]);

  if (permissions.isLoading || links.isLoading) return <LoadingState />;
  if (permissions.error) return <ErrorState message={permissions.error.message} onRetry={permissions.refetch} />;

  return (
    <>
      <AppText tone="muted">Administradores têm acesso total. Ajuste o que cada função pode fazer:</AppText>
      <Segmented<EditableRole>
        segments={[
          { label: 'Psicóloga', value: 'psychologist' },
          { label: 'Recepcionista', value: 'receptionist' },
        ]}
        value={role}
        onChange={setRole}
      />
      {/* Remounts with fresh checkboxes when the role or the saved links change */}
      <RoleMatrix
        key={`${role}:${current.map((l) => l.id).join(',')}`}
        role={role}
        current={current}
        permissions={permissions.data ?? []}
      />
    </>
  );
}

function RoleMatrix({ role, current, permissions }: { role: EditableRole; current: RolePermission[]; permissions: Permission[] }) {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<Set<number>>(() => new Set(current.map((l) => l.permissionId)));

  const save = useMutation({
    // The web called DELETE /api/role-permissions/role/:role, which doesn't exist; diff with the real endpoints
    mutationFn: async () => {
      const toRemove = current.filter((l) => !checked.has(l.permissionId));
      const existing = new Set(current.map((l) => l.permissionId));
      const toAdd = [...checked].filter((id) => !existing.has(id));
      for (const l of toRemove) await api(`/api/role-permissions/${l.id}`, { method: 'DELETE' });
      for (const permissionId of toAdd) await api('/api/role-permissions', { method: 'POST', body: { role, permissionId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/role-permissions'] });
      toast.success('Permissões atualizadas', `As permissões de ${roleLabels[role]} foram atualizadas.`);
    },
    onError: (e: Error) => toast.error('Falha ao atualizar permissões', e.message),
  });

  const dirty =
    checked.size !== current.length || current.some((l) => !checked.has(l.permissionId));

  return (
    <>
      <Card>
        {permissions.length === 0 ? (
          <EmptyState title="Nenhuma permissão cadastrada" icon={ShieldCheck} />
        ) : (
          permissions.map((p, i) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                gap: 10,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.divider,
              }}>
              <View style={{ flex: 1 }}>
                <AppText>{prettyPermission(p.name)}</AppText>
                {p.description && (
                  <AppText variant="caption" tone="muted">
                    {p.description}
                  </AppText>
                )}
              </View>
              <Switch
                value={checked.has(p.id)}
                onValueChange={(v) => {
                  const next = new Set(checked);
                  if (v) next.add(p.id);
                  else next.delete(p.id);
                  setChecked(next);
                }}
                trackColor={{ true: colors.primary, false: colors.border }}
                accessibilityLabel={prettyPermission(p.name)}
              />
            </View>
          ))
        )}
      </Card>
      <Button title="Salvar alterações" disabled={!dirty} loading={save.isPending} onPress={() => save.mutate()} />
    </>
  );
}
