import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Mail, Trash2, UserPlus } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { confirm } from '@/utils/confirm';
import { formatDate } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type Admin = { id: number; fullName: string; email: string; avatarUrl: string | null; status: string };
type Invite = { id: number; email: string; createdAt: string };
type AdminsResponse = { admins: Admin[]; invites: Invite[] };

const KEY = ['/api/admin/admins'];

/** Configurações → Administradores (admin only), same API as the web section. */
export function AdminAccessCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');

  const list = useQuery({ queryKey: KEY, queryFn: () => api<AdminsResponse>('/api/admin/admins') });

  const add = useMutation({
    mutationFn: (value: string) => api<{ type: 'promoted' | 'invited' }>('/api/admin/admins', { method: 'POST', body: { email: value } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      setEmail('');
      if (res.type === 'promoted') toast.success('Administrador adicionado', 'A conta já existia e agora é administradora.');
      else toast.success('E-mail pré-autorizado', 'No primeiro acesso a pessoa já entra como administradora.');
    },
    onError: (e: Error) => toast.error('Não foi possível adicionar', e.message),
  });

  const remove = useMutation({
    mutationFn: (path: string) => api(path, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    onError: (e: Error) => toast.error('Não foi possível remover', e.message),
  });

  const removeAdmin = async (a: Admin) => {
    const ok = await confirm({
      title: 'Remover acesso de administrador?',
      message: `${a.fullName} continua com a conta, mas passa a ter acesso de psicóloga.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (ok) remove.mutate(`/api/admin/admins/${a.id}`);
  };

  const cancelInvite = async (i: Invite) => {
    const ok = await confirm({ title: 'Cancelar pré-autorização?', message: i.email, confirmLabel: 'Cancelar convite', destructive: true });
    if (ok) remove.mutate(`/api/admin/invites/${i.id}`);
  };

  return (
    <>
      <Card style={{ gap: 12 }}>
        <AppText variant="subtitle">Novo administrador</AppText>
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          icon={Mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="nome@clinica.com.br"
          hint="Sem conta ainda? O e-mail fica pré-autorizado e vira admin no primeiro acesso."
        />
        <Button
          title="Adicionar administrador"
          icon={<UserPlus size={18} color={colors.onPrimary} />}
          disabled={!email.trim()}
          loading={add.isPending}
          onPress={() => add.mutate(email.trim())}
        />
      </Card>

      {list.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <Card style={{ gap: 10 }}>
            <AppText variant="label">Ativos ({list.data?.admins.length ?? 0})</AppText>
            {list.data?.admins.map((a) => (
              <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Avatar name={a.fullName} uri={a.avatarUrl} size={36} />
                <View style={{ flex: 1 }}>
                  <AppText weight="medium" numberOfLines={1}>
                    {a.fullName}
                    {a.id === user?.id ? ' (você)' : ''}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {a.email}
                  </AppText>
                </View>
                {a.id !== user?.id && (
                  <Pressable onPress={() => removeAdmin(a)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remover ${a.fullName}`}>
                    <Trash2 size={18} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </Card>

          <Card style={{ gap: 10 }}>
            <AppText variant="label">Aguardando primeiro acesso ({list.data?.invites.length ?? 0})</AppText>
            {!list.data?.invites.length ? (
              <AppText tone="subtle">Nenhum e-mail aguardando</AppText>
            ) : (
              list.data.invites.map((i) => (
                <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.warningSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="medium" numberOfLines={1}>
                      {i.email}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      Pré-autorizado em {formatDate(new Date(i.createdAt))}
                    </AppText>
                  </View>
                  <Pressable onPress={() => cancelInvite(i)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Cancelar ${i.email}`}>
                    <Trash2 size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </Card>
        </>
      )}
    </>
  );
}
