import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { useRooms } from '@/api/queries';
import { confirm } from '@/utils/confirm';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { Room } from '@/types/api';

/** Create / edit room (admin). Also exposes hourlyRate, which commissions are computed from. */
export default function RoomFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const rooms = useRooms();
  if (editingId && rooms.isLoading) return <LoadingState />;
  return <RoomForm editingId={editingId} room={rooms.data?.find((r) => r.id === editingId)} />;
}

function RoomForm({ editingId, room }: { editingId: number | null; room?: Room }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(room?.name ?? '');
  const [capacity, setCapacity] = useState(room ? String(room.capacity) : '4');
  const [squareMeters, setSquareMeters] = useState(room ? (room.squareMeters ? String(room.squareMeters) : '') : '15');
  const [hourlyRate, setHourlyRate] = useState(room?.hourlyRate ?? '');
  const [hasWifi, setHasWifi] = useState(room?.hasWifi ?? true);
  const [hasAir, setHasAir] = useState(room?.hasAirConditioning ?? true);
  const [imageUrl, setImageUrl] = useState(room?.imageUrl ?? '');

  const capacityError = capacity && isNaN(parseInt(capacity, 10)) ? 'Capacidade deve ser um número válido' : undefined;
  const areaError = squareMeters && isNaN(parseInt(squareMeters, 10)) ? 'Área deve ser um número válido' : undefined;
  const rate = hourlyRate.trim() ? hourlyRate.replace(',', '.') : '';
  const rateError = rate && isNaN(parseFloat(rate)) ? 'Valor inválido' : undefined;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        capacity: parseInt(capacity, 10),
        squareMeters: squareMeters ? parseInt(squareMeters, 10) : null,
        hasWifi,
        hasAirConditioning: hasAir,
        imageUrl: imageUrl.trim() || undefined,
        hourlyRate: rate ? parseFloat(rate).toFixed(2) : null,
      };
      return editingId ? api(`/api/rooms/${editingId}`, { method: 'PUT', body }) : api('/api/rooms', { method: 'POST', body });
    },
    onSuccess: () => {
      invalidate();
      toast.success(editingId ? 'Sala atualizada' : 'Sala criada', editingId ? 'As informações foram salvas com sucesso.' : 'A sala foi criada com sucesso.');
      router.back();
    },
    onError: (e: Error) => toast.error(editingId ? 'Falha ao atualizar sala' : 'Falha ao criar sala', e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/rooms/${editingId}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      toast.success('Sala removida');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao remover', e.message),
  });

  const invalid = !name.trim() || !capacity || !!capacityError || !!areaError || !!rateError;

  return (
    <>
      <Stack.Screen options={{ title: editingId ? 'Editar sala' : 'Nova sala' }} />
      <Screen footer={<Button title={editingId ? 'Salvar alterações' : 'Adicionar sala'} disabled={invalid} loading={save.isPending} onPress={() => save.mutate()} />}>
        <Card style={{ gap: 14 }}>
          <TextField label="Nome da sala" placeholder="Ex.: Sala 01" value={name} onChangeText={setName} error={!name.trim() && name !== '' ? 'Nome é obrigatório' : undefined} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TextField containerStyle={{ flex: 1 }} label="Capacidade" keyboardType="number-pad" value={capacity} onChangeText={setCapacity} error={capacityError} />
            <TextField containerStyle={{ flex: 1 }} label="Área (m²)" keyboardType="number-pad" value={squareMeters} onChangeText={setSquareMeters} error={areaError} />
          </View>
          <TextField
            label="Valor por hora (R$)"
            placeholder="Ex.: 50,00"
            keyboardType="decimal-pad"
            hint="Usado no cálculo de comissões"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            error={rateError}
          />
          <View style={styles.switchRow}>
            <AppText variant="label">Wi-Fi</AppText>
            <Switch value={hasWifi} onValueChange={setHasWifi} trackColor={{ true: colors.primary, false: colors.border }} />
          </View>
          <View style={styles.switchRow}>
            <AppText variant="label">Ar-condicionado</AppText>
            <Switch value={hasAir} onValueChange={setHasAir} trackColor={{ true: colors.primary, false: colors.border }} />
          </View>
          <TextField label="URL da imagem" placeholder="https://exemplo.com/imagem.jpg" autoCapitalize="none" keyboardType="url" value={imageUrl} onChangeText={setImageUrl} />
        </Card>
        {editingId && (
          <Button
            title="Remover sala"
            variant="ghost"
            icon={<Trash2 size={18} color={colors.danger} />}
            loading={remove.isPending}
            onPress={async () => {
              const ok = await confirm({ title: 'Remover sala?', message: 'Esta ação não pode ser desfeita.', confirmLabel: 'Remover', destructive: true });
              if (ok) remove.mutate();
            }}
          />
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({ switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
