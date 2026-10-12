import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfMonth } from 'date-fns';
import { Pencil } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { usePsychologists } from '@/api/queries';
import { formatDate, formatMoney, toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import type { CommissionConfig } from '@/types/admin';

type PayoutType = 'percentual' | 'fixed';

/** Payout rules per psychologist (web "Configurar Repasses"). */
export default function CommissionConfigsScreen() {
  const queryClient = useQueryClient();
  const psychologists = usePsychologists();
  const configs = useQuery({
    queryKey: ['/api/admin/commission-configs'],
    queryFn: () => api<CommissionConfig[]>('/api/admin/commission-configs'),
  });

  const [editing, setEditing] = useState<CommissionConfig | null>(null);
  const [psychologistId, setPsychologistId] = useState<number | null>(null);
  const [payoutType, setPayoutType] = useState<PayoutType>('percentual');
  const [value, setValue] = useState('');
  const [validFrom, setValidFrom] = useState(toDateKey(startOfMonth(new Date())));
  const [validUntil, setValidUntil] = useState('');

  const resetForm = () => {
    setEditing(null);
    setPsychologistId(null);
    setPayoutType('percentual');
    setValue('');
    setValidFrom(toDateKey(startOfMonth(new Date())));
    setValidUntil('');
  };

  const edit = (c: CommissionConfig) => {
    setEditing(c);
    setPsychologistId(c.psychologistId);
    setPayoutType(c.payoutType);
    setValue(c.payoutValue);
    setValidFrom(c.validFrom.slice(0, 10));
    setValidUntil(c.validUntil?.slice(0, 10) ?? '');
  };

  const numeric = parseFloat(value.replace(',', '.'));

  const save = useMutation({
    mutationFn: () => {
      const body = { psychologistId, payoutType, payoutValue: numeric, validFrom, validUntil: validUntil || null };
      return editing
        ? api(`/api/admin/commission-configs/${editing.id}`, { method: 'PUT', body })
        : api('/api/admin/commission-configs', { method: 'POST', body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/commission-configs'] });
      toast.success(editing ? 'Configuração atualizada!' : 'Configuração criada!');
      resetForm();
    },
    onError: (e: Error) => toast.error('Erro ao salvar configuração', e.message),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Configurar repasses' }} />
      <Screen>
        <Card style={{ gap: 14 }}>
          <AppText variant="subtitle">{editing ? 'Editar configuração' : 'Nova configuração'}</AppText>
          <SelectField
            label="Psicóloga"
            disabled={!!editing}
            value={psychologistId}
            options={(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `Psicóloga #${p.id}`, value: p.id }))}
            onChange={setPsychologistId}
          />
          <Segmented<PayoutType>
            segments={[
              { label: 'Percentual (%)', value: 'percentual' },
              { label: 'Valor fixo (R$)', value: 'fixed' },
            ]}
            value={payoutType}
            onChange={setPayoutType}
          />
          <TextField
            label={payoutType === 'percentual' ? 'Percentual (%)' : 'Valor (R$)'}
            placeholder={payoutType === 'percentual' ? 'Ex.: 40' : 'Ex.: 150,00'}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateTimeField label="Válido a partir de" mode="date" value={validFrom} onChange={setValidFrom} />
            <DateTimeField label="Válido até" mode="date" value={validUntil} onChange={setValidUntil} placeholder="Opcional" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {editing && <Button title="Cancelar" variant="outline" style={{ flex: 1 }} onPress={resetForm} />}
            <Button
              title={editing ? 'Salvar alterações' : 'Criar configuração'}
              style={{ flex: 1 }}
              disabled={!psychologistId || !(numeric >= 0) || !value}
              loading={save.isPending}
              onPress={() => save.mutate()}
            />
          </View>
        </Card>

        <AppText variant="subtitle">Configurações cadastradas</AppText>
        {configs.isLoading ? (
          <LoadingState />
        ) : configs.error ? (
          <ErrorState message={configs.error.message} onRetry={configs.refetch} />
        ) : (
          (configs.data ?? []).map((c) => (
            <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText weight="medium">{c.psychologistName}</AppText>
                <AppText variant="caption" tone="muted">
                  {c.payoutType === 'percentual' ? `Percentual · ${parseFloat(c.payoutValue)}%` : `Fixo · ${formatMoney(c.payoutValue)}`}
                </AppText>
                <AppText variant="caption" tone="subtle">
                  {formatDate(c.validFrom)} – {c.validUntil ? formatDate(c.validUntil) : 'Atual'}
                </AppText>
              </View>
              <IconButton icon={Pencil} label="Editar configuração" onPress={() => edit(c)} />
            </Card>
          ))
        )}
      </Screen>
    </>
  );
}
