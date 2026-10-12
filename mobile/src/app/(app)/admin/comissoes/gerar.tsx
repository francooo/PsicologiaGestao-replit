import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, startOfMonth } from 'date-fns';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { api } from '@/api/client';
import { usePsychologists } from '@/api/queries';
import { formatDate, formatMoney, toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { CommissionItem } from '@/types/admin';

type Preview = { items: CommissionItem[]; totalRoomsValue: number; totalRepasse: number; totalBookings: number };

export default function GenerateCommissionScreen() {
  const queryClient = useQueryClient();
  const psychologists = usePsychologists();
  const now = new Date();
  const [psychologistId, setPsychologistId] = useState<number | null>(null);
  const [periodStart, setPeriodStart] = useState(toDateKey(startOfMonth(now)));
  const [periodEnd, setPeriodEnd] = useState(toDateKey(endOfMonth(now)));
  const [preview, setPreview] = useState<Preview | null>(null);

  const calc = useMutation({
    mutationFn: () => api<Preview>('/api/admin/commissions/preview', { query: { psychologistId: psychologistId!, periodStart, periodEnd } }),
    onSuccess: setPreview,
    onError: (e: Error) => toast.error('Erro no preview', e.message),
  });

  const generate = useMutation({
    mutationFn: () => api('/api/admin/commissions/generate', { method: 'POST', body: { psychologistId, periodStart, periodEnd } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/admin/commissions') });
      toast.success('Comissionamento gerado com sucesso!');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao gerar', e.message),
  });

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPreview(null);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Gerar comissionamento' }} />
      <Screen
        footer={
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Calcular preview" variant="outline" style={{ flex: 1 }} disabled={!psychologistId} loading={calc.isPending} onPress={() => calc.mutate()} />
            <Button title="Gerar" style={{ flex: 1 }} disabled={!psychologistId} loading={generate.isPending} onPress={() => generate.mutate()} />
          </View>
        }>
        <Card style={{ gap: 14 }}>
          <SelectField
            label="Psicóloga"
            value={psychologistId}
            options={(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `Psicóloga #${p.id}`, value: p.id }))}
            onChange={reset(setPsychologistId)}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateTimeField label="Início do período" mode="date" value={periodStart} onChange={reset(setPeriodStart)} />
            <DateTimeField label="Fim do período" mode="date" value={periodEnd} onChange={reset(setPeriodEnd)} />
          </View>
        </Card>

        {preview && (
          <Card style={{ gap: 8 }}>
            <AppText variant="subtitle">Preview do comissionamento</AppText>
            <AppText>Locações encontradas: {preview.totalBookings}</AppText>
            <AppText>Valor total das locações: {formatMoney(preview.totalRoomsValue)}</AppText>
            <AppText weight="semibold" style={{ color: colors.success }}>
              Repasse calculado: {formatMoney(preview.totalRepasse)}
            </AppText>
            {preview.items.map((it) => (
              <View key={it.bookingId} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.divider }}>
                <AppText variant="caption">
                  {formatDate(it.bookingDate)} · {it.roomName ?? 'Sala'} · {formatMoney(it.bookingValue)} → {formatMoney(it.repasseValue)}
                </AppText>
              </View>
            ))}
          </Card>
        )}
      </Screen>
    </>
  );
}
