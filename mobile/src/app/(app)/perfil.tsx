import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Lock, Pencil } from 'lucide-react-native';

import { SpecializationSelector } from '@/components/profile/SpecializationSelector';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { InfoRow } from '@/components/ui/InfoRow';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { appendFile, pickImage } from '@/utils/files';
import { formatDate } from '@/utils/format';
import { monthsAtClinicText } from '@/utils/people';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type Profile = {
  id: number;
  fullName: string;
  email: string;
  profileImage: string | null;
  birthDate: string | null;
  status: string;
  age: number | null;
  psychologist: { id: number; phone: string | null; crpNumber: string | null; bio: string | null; startedAtClinic: string | null } | null;
  specializations: { id: number; name: string; category: string | null }[];
};

function SectionHeader({ title, editing, onEdit }: { title: string; editing: boolean; onEdit: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <AppText variant="subtitle">{title}</AppText>
      {!editing && (
        <Button title="Editar" size="sm" variant="secondary" fullWidth={false} icon={<Pencil size={16} color={colors.primary} />} onPress={onEdit} />
      )}
    </View>
  );
}

/** "Meu perfil profissional" (psychologists only). */
export default function MyProfileScreen() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['/api/profile'], queryFn: () => api<Profile>('/api/profile') });

  const [editInfo, setEditInfo] = useState(false);
  const [editBio, setEditBio] = useState(false);
  const [editAreas, setEditAreas] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', birthDate: '', crpNumber: '' });
  const [bio, setBio] = useState('');
  const [areas, setAreas] = useState<number[]>([]);

  const startEditInfo = () => {
    if (!data) return;
    setForm({
      fullName: data.fullName,
      phone: data.psychologist?.phone ?? '',
      birthDate: data.birthDate?.slice(0, 10) ?? '',
      crpNumber: data.psychologist?.crpNumber ?? '',
    });
    setEditInfo(true);
  };
  const startEditBio = () => {
    setBio(data?.psychologist?.bio ?? '');
    setEditBio(true);
  };
  const startEditAreas = () => {
    setAreas(data?.specializations.map((s) => s.id) ?? []);
    setEditAreas(true);
  };

  const done = (msg: string) => () => {
    queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
    toast.success(msg);
  };

  const saveInfo = useMutation({
    mutationFn: () => api('/api/profile', { method: 'PATCH', body: form }),
    onSuccess: () => {
      done('Informações atualizadas!')();
      refreshUser().catch(() => {});
      setEditInfo(false);
    },
    onError: () => toast.error('Erro ao salvar informações'),
  });
  const saveBio = useMutation({
    mutationFn: () => api('/api/profile', { method: 'PATCH', body: { bio } }),
    onSuccess: () => {
      done('Bio atualizada!')();
      setEditBio(false);
    },
    onError: () => toast.error('Erro ao salvar bio'),
  });
  const saveAreas = useMutation({
    mutationFn: () => api('/api/profile/specializations', { method: 'PUT', body: { specializationIds: areas } }),
    onSuccess: () => {
      done('Áreas de atuação atualizadas!')();
      setEditAreas(false);
    },
    onError: () => toast.error('Erro ao salvar áreas'),
  });
  const avatar = useMutation({
    mutationFn: async () => {
      const photo = await pickImage('library', { maxWidth: 800, quality: 0.8, square: true });
      if (!photo) return null;
      const form = new FormData();
      appendFile(form, 'avatar', photo);
      return api('/api/profile/avatar', { method: 'POST', body: form });
    },
    onSuccess: async (res) => {
      if (!res) return;
      await Image.clearMemoryCache();
      await Image.clearDiskCache();
      done('Foto atualizada!')();
      refreshUser().catch(() => {});
    },
    onError: (e: Error) => toast.error('Erro ao enviar foto', e.message),
  });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message} onRetry={refetch} />;

  const p = data.psychologist;
  const since = monthsAtClinicText(p?.startedAtClinic, true);

  return (
    <>
      <Stack.Screen options={{ title: 'Meu perfil' }} />
      <Screen refreshing={false} onRefresh={refetch}>
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => avatar.mutate()} accessibilityRole="button" accessibilityLabel="Alterar foto">
            <Avatar name={data.fullName} uri={data.profileImage} size={88} />
            <View style={{ position: 'absolute', right: 0, bottom: 0, backgroundColor: colors.primary, borderRadius: 16, padding: 6 }}>
              <Camera size={16} color={colors.onPrimary} />
            </View>
          </Pressable>
          <AppText variant="heading" center>
            {data.fullName}
          </AppText>
          {p?.crpNumber && <AppText tone="muted">CRP {p.crpNumber}</AppText>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {data.age !== null && <Badge label={`${data.age} anos`} tone="lilac" />}
            {p?.startedAtClinic && <Badge label={`Desde ${formatDate(p.startedAtClinic)} · ${since}`} tone="sage" />}
            <Badge label={data.status === 'active' ? 'Ativa' : 'Inativa'} tone={data.status === 'active' ? 'success' : 'neutral'} />
          </View>
        </Card>

        <Card style={{ gap: 12 }}>
          <SectionHeader title="Informações profissionais" editing={editInfo} onEdit={startEditInfo} />
          {editInfo ? (
            <>
              <TextField label="Nome completo" value={form.fullName} onChangeText={(t) => setForm({ ...form, fullName: t })} />
              <TextField label="Telefone / WhatsApp" placeholder="(11) 91234-5678" keyboardType="phone-pad" value={form.phone} onChangeText={(t) => setForm({ ...form, phone: t })} />
              <DateTimeField label="Data de nascimento" mode="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} />
              <TextField label="Número do CRP" placeholder="06/12345" value={form.crpNumber} onChangeText={(t) => setForm({ ...form, crpNumber: t })} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => setEditInfo(false)} />
                <Button title="Salvar" style={{ flex: 1 }} loading={saveInfo.isPending} onPress={() => saveInfo.mutate()} />
              </View>
            </>
          ) : (
            <View>
              <InfoRow label="Nome" value={data.fullName} />
              <InfoRow label="Telefone" value={p?.phone} />
              <InfoRow label="Nascimento" value={data.birthDate ? formatDate(data.birthDate.slice(0, 10)) : null} />
              <InfoRow label="CRP" value={p?.crpNumber} />
              <InfoRow label="E-mail 🔒" value={data.email} />
              <InfoRow label="Entrada na clínica 🔒" value={p?.startedAtClinic ? formatDate(p.startedAtClinic) : null} last />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Lock size={14} color={colors.textSubtle} />
                <AppText variant="caption" tone="subtle">
                  Campos com cadeado só podem ser editados pelo administrador.
                </AppText>
              </View>
            </View>
          )}
        </Card>

        <Card style={{ gap: 12 }}>
          <SectionHeader title="Sobre mim" editing={editBio} onEdit={startEditBio} />
          {editBio ? (
            <>
              <TextField
                multiline
                maxLength={500}
                placeholder="Fale sobre sua trajetória, abordagem terapêutica e o que motiva seu trabalho..."
                value={bio}
                onChangeText={setBio}
                hint={`${bio.length}/500 caracteres`}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => setEditBio(false)} />
                <Button title="Salvar" style={{ flex: 1 }} loading={saveBio.isPending} onPress={() => saveBio.mutate()} />
              </View>
            </>
          ) : (
            <AppText tone={p?.bio ? 'default' : 'subtle'}>{p?.bio || 'Nenhuma bio cadastrada. Toque em Editar para adicionar.'}</AppText>
          )}
        </Card>

        <Card style={{ gap: 12 }}>
          <SectionHeader title="Áreas de atuação" editing={editAreas} onEdit={startEditAreas} />
          <SpecializationSelector
            selectedIds={editAreas ? areas : data.specializations.map((s) => s.id)}
            onChange={setAreas}
            readonly={!editAreas}
          />
          {editAreas && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Cancelar"
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setEditAreas(false)}
              />
              <Button title="Salvar" style={{ flex: 1 }} loading={saveAreas.isPending} onPress={() => saveAreas.mutate()} />
            </View>
          )}
        </Card>
      </Screen>
    </>
  );
}
