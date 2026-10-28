import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Camera, CheckCircle2, Pencil } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { InfoRow } from '@/components/ui/InfoRow';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { AdminAccessCard } from '@/components/profile/AdminAccessCard';
import { CompanyCard } from '@/components/profile/CompanyCard';
import { api } from '@/api/client';
import { useGoogleStatus } from '@/api/meetings';
import { useAuth } from '@/auth/AuthProvider';
import { appendFile, pickImage } from '@/utils/files';
import { formatDate } from '@/utils/format';
import { roleLabels } from '@/utils/status';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type Tab = 'dados' | 'integracoes' | 'clinica' | 'admins';
type GoogleEvent = { id: string; summary?: string; start?: { dateTime?: string; date?: string } };

/** "Configurações" (web /profile): personal data, photo and Google Calendar integration. */
export default function SettingsScreen() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('dados');
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [birthDate, setBirthDate] = useState(user?.birthDate?.slice(0, 10) ?? '');

  const google = useGoogleStatus();
  const events = useQuery({
    queryKey: ['/api/google-calendar/events'],
    queryFn: () => api<GoogleEvent[]>('/api/google-calendar/events'),
    enabled: !!google.data?.authenticated && tab === 'integracoes',
  });

  const save = useMutation({
    mutationFn: async (photo?: Awaited<ReturnType<typeof pickImage>>) => {
      const form = new FormData();
      form.append('fullName', fullName.trim());
      form.append('email', user!.email);
      if (birthDate) form.append('birthDate', birthDate);
      if (photo) appendFile(form, 'profileImageFile', photo);
      return api('/api/profile', { method: 'POST', body: form });
    },
    onSuccess: async () => {
      await Image.clearMemoryCache();
      await Image.clearDiskCache();
      await refreshUser();
      toast.success('Perfil atualizado', 'Suas informações foram atualizadas com sucesso.');
      setEditing(false);
    },
    onError: (e: Error) => toast.error('Erro ao salvar', e.message),
  });

  const changePhoto = async () => {
    // Server limit for this endpoint is 2MB — compress to ~600px
    const photo = await pickImage('library', { maxWidth: 600, quality: 0.8, square: true });
    if (photo) save.mutate(photo);
  };

  const connectGoogle = async () => {
    try {
      const { authUrl } = await api<{ authUrl: string }>('/api/google-calendar/auth');
      // The callback lands on the web /profile page; when the browser closes we re-check the status
      await WebBrowser.openBrowserAsync(authUrl);
      await queryClient.invalidateQueries({ queryKey: ['/api/google-calendar/status'] });
    } catch {
      toast.error('Erro', 'Não foi possível conectar ao Google Calendar. Tente novamente mais tarde.');
    }
  };

  if (!user) return <LoadingState />;

  return (
    <>
      <Stack.Screen options={{ title: 'Configurações' }} />
      <Screen>
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={changePhoto} accessibilityRole="button" accessibilityLabel="Alterar foto de perfil">
            <Avatar name={user.fullName} uri={user.profileImage ?? user.avatarUrl} size={88} />
            <View
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                backgroundColor: colors.primary,
                borderRadius: 16,
                padding: 6,
              }}>
              <Camera size={16} color={colors.onPrimary} />
            </View>
          </Pressable>
          <AppText variant="heading">{user.fullName}</AppText>
          <Badge label={roleLabels[user.role] ?? user.role} tone="lilac" />
        </Card>

        <Segmented<Tab>
          segments={[
            { label: 'Dados pessoais', value: 'dados' },
            { label: 'Integrações', value: 'integracoes' },
            ...(user.role === 'admin'
              ? [
                  { label: 'Clínica', value: 'clinica' as Tab },
                  { label: 'Administradores', value: 'admins' as Tab },
                ]
              : []),
          ]}
          value={tab}
          onChange={setTab}
          // Four tabs for admins: scroll instead of cutting the labels
          scrollable={user.role === 'admin'}
        />

        {tab === 'clinica' ? (
          <CompanyCard />
        ) : tab === 'admins' ? (
          <AdminAccessCard />
        ) : tab === 'dados' ? (
          editing ? (
            <Card style={{ gap: 14 }}>
              <TextField label="Nome completo" value={fullName} onChangeText={setFullName} />
              <TextField label="E-mail" value={user.email} editable={false} hint="E-mail não pode ser alterado" />
              <DateTimeField label="Data de nascimento" mode="date" value={birthDate} onChange={setBirthDate} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => setEditing(false)} />
                <Button
                  title="Salvar"
                  style={{ flex: 1 }}
                  disabled={fullName.trim().length < 2}
                  loading={save.isPending}
                  onPress={() => save.mutate(undefined)}
                />
              </View>
            </Card>
          ) : (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <AppText variant="subtitle">Informações pessoais</AppText>
                <Button
                  title="Editar"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  icon={<Pencil size={16} color={colors.primary} />}
                  onPress={() => setEditing(true)}
                />
              </View>
              <InfoRow label="Nome" value={user.fullName} />
              <InfoRow label="E-mail" value={user.email} />
              <InfoRow label="Usuário" value={user.username} />
              <InfoRow label="Data de nascimento" value={user.birthDate ? formatDate(user.birthDate.slice(0, 10)) : 'Não informada'} last />
            </Card>
          )
        ) : (
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Calendar size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText weight="semibold">Google Calendar</AppText>
                <AppText variant="caption" tone="muted">
                  Sincronize seus agendamentos e gere links do Google Meet
                </AppText>
              </View>
            </View>
            {google.isLoading ? (
              <LoadingState />
            ) : google.data?.authenticated ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={18} color={colors.success} />
                  <AppText tone="success" weight="medium">
                    Conectado — sincronização ativa
                  </AppText>
                </View>
                <AppText variant="label">Próximos eventos</AppText>
                {events.isLoading ? (
                  <AppText tone="subtle">Carregando eventos...</AppText>
                ) : !(events.data ?? []).length ? (
                  <AppText tone="subtle">Nenhum evento próximo encontrado</AppText>
                ) : (
                  events.data!.slice(0, 3).map((e) => {
                    const when = e.start?.dateTime ?? e.start?.date;
                    return (
                      <View key={e.id} style={{ paddingVertical: 6 }}>
                        <AppText>{e.summary ?? 'Sem título'}</AppText>
                        {when && (
                          <AppText variant="caption" tone="muted">
                            {formatDate(new Date(when), 'dd/MM/yyyy HH:mm')}
                          </AppText>
                        )}
                      </View>
                    );
                  })
                )}
                <Button title="Reconectar" variant="ghost" size="sm" onPress={connectGoogle} />
              </>
            ) : (
              <Button title="Conectar" onPress={connectGoogle} />
            )}
          </Card>
        )}
      </Screen>
    </>
  );
}
