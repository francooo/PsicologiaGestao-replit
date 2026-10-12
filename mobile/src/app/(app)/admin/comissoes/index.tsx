import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, CheckCircle2, Eye, Settings2, Wallet, XCircle } from 'lucide-react-native';

import { SummaryCard, SummaryRow } from '@/components/finance/SummaryCard';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { usePsychologists } from '@/api/queries';
import { commissionStatus, monthOptions, monthRange, paymentMethods } from '@/utils/commission';
import { confirm } from '@/utils/confirm';
import { formatDate, formatMoney, formatTime, toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { Commission, CommissionItem } from '@/types/admin';

type Dashboard = { totalPendente: string; totalPago: string; numPsicologas: number; numLocacoes: number };

export default function CommissionsScreen() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [psychologistId, setPsychologistId] = useState(0);
  const [status, setStatus] = useState('all');
  const [detail, setDetail] = useState<Commission | null>(null);
  const [paying, setPaying] = useState<Commission | null>(null);
  const [payDate, setPayDate] = useState(toDateKey());
  const [payMethod, setPayMethod] = useState<string | null>(null);
  const [payNotes, setPayNotes] = useState('');

  const ym = `${year}-${month}`;
  const range = monthRange(ym);
  const psychologists = usePsychologists();
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i)).map((y) => ({ label: y, value: y }));

  const dashboard = useQuery({
    queryKey: ['/api/admin/commissions/dashboard', ym],
    queryFn: () => api<Dashboard>('/api/admin/commissions/dashboard', { query: { month: ym } }),
  });
  const list = useQuery({
    queryKey: ['/api/admin/commissions', ym, psychologistId, status],
    queryFn: () =>
      api<Commission[]>('/api/admin/commissions', {
        query: {
          periodStart: range.start,
          periodEnd: range.end,
          psychologistId: psychologistId || undefined,
          status: status === 'all' ? undefined : status,
        },
      }),
  });
  const items = useQuery({
    queryKey: ['/api/admin/commissions', detail?.id, 'items'],
    queryFn: () => api<CommissionItem[]>(`/api/admin/commissions/${detail!.id}/items`),
    enabled: !!detail,
  });

  const invalidate = () => queryClient.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith('/api/admin/commissions') });

  const pay = useMutation({
    mutationFn: () =>
      api(`/api/admin/commissions/${paying!.id}/pay`, {
        method: 'PATCH',
        body: { paymentDate: payDate, paymentMethod: payMethod, paymentNotes: payNotes.trim() || null },
      }),
    onSuccess: () => {
      invalidate();
      toast.success('Pagamento registrado!');
      setPaying(null);
      setPayMethod(null);
      setPayNotes('');
    },
    onError: (e: Error) => toast.error('Erro ao registrar pagamento', e.message),
  });

  const cancel = useMutation({
    mutationFn: (c: Commission) => api(`/api/admin/commissions/${c.id}/cancel`, { method: 'PATCH', body: {} }),
    onSuccess: () => {
      invalidate();
      toast.success('Comissionamento cancelado.');
    },
    onError: (e: Error) => toast.error('Erro ao cancelar', e.message),
  });

  const onCancel = async (c: Commission) => {
    const ok = await confirm({
      title: 'Cancelar comissionamento?',
      message: `${c.psychologistName}\n${formatDate(c.periodStart)} – ${formatDate(c.periodEnd)}\nRepasse: ${formatMoney(c.totalRepasse)}\n\nEsta ação não pode ser desfeita.`,
      confirmLabel: 'Sim, cancelar',
      destructive: true,
    });
    if (ok) cancel.mutate(c);
  };

  const refresh = () => {
    dashboard.refetch();
    list.refetch();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Comissões' }} />
      <Screen refreshing={list.isRefetching} onRefresh={refresh}>
        <AppText tone="muted">Gestão de repasses financeiros das psicólogas</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Gerar"
            style={{ flex: 1 }}
            icon={<Calculator size={18} color={colors.onPrimary} />}
            onPress={() => router.push('/admin/comissoes/gerar')}
          />
          <Button
            title="Repasses"
            variant="secondary"
            style={{ flex: 1 }}
            icon={<Settings2 size={18} color={colors.primary} />}
            onPress={() => router.push('/admin/comissoes/configuracoes')}
          />
        </View>

        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 2 }}>
              <SelectField label="Mês" value={month} options={monthOptions} onChange={setMonth} />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField label="Ano" value={year} options={years} onChange={setYear} />
            </View>
          </View>
          <SelectField
            label="Psicóloga"
            value={psychologistId}
            options={[
              { label: 'Todas as psicólogas', value: 0 },
              ...(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `Psicóloga #${p.id}`, value: p.id })),
            ]}
            onChange={setPsychologistId}
          />
          <SelectField
            label="Status"
            value={status}
            options={[
              { label: 'Todos', value: 'all' },
              { label: 'Pendente', value: 'pending' },
              { label: 'Pago', value: 'paid' },
              { label: 'Cancelado', value: 'cancelled' },
            ]}
            onChange={setStatus}
          />
        </Card>

        {dashboard.data && (
          <SummaryRow>
            <SummaryCard label="Total pendente" value={parseFloat(dashboard.data.totalPendente)} color={colors.warning} />
            <SummaryCard label="Total pago" value={parseFloat(dashboard.data.totalPago)} color={colors.success} />
            <SummaryCard label="Psicólogas" value={String(dashboard.data.numPsicologas)} color={colors.primary} />
            <SummaryCard label="Locações" value={String(dashboard.data.numLocacoes)} color={colors.lilacInk} />
          </SummaryRow>
        )}

        {list.isLoading ? (
          <LoadingState />
        ) : list.error ? (
          <ErrorState message={list.error.message} onRetry={refresh} />
        ) : !(list.data ?? []).length ? (
          <EmptyState title="Nenhum comissionamento encontrado para o período selecionado." icon={Wallet} />
        ) : (
          list.data!.map((c) => {
            const s = commissionStatus(c.status);
            return (
              <Card key={c.id} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText weight="semibold" style={{ flex: 1 }}>
                    {c.psychologistName}
                  </AppText>
                  <Badge label={s.label} tone={s.tone} />
                </View>
                <AppText variant="caption" tone="muted">
                  {formatDate(c.periodStart)} – {formatDate(c.periodEnd)} · {c.totalBookings} locações
                </AppText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText tone="muted">Valor total: {formatMoney(c.totalRoomsValue)}</AppText>
                  <AppText weight="semibold">Repasse: {formatMoney(c.totalRepasse)}</AppText>
                </View>
                {c.paymentDate && (
                  <AppText variant="caption" tone="muted">
                    Pago em {formatDate(c.paymentDate)}
                  </AppText>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button title="Detalhes" size="sm" variant="ghost" fullWidth={false} icon={<Eye size={16} color={colors.primary} />} onPress={() => setDetail(c)} />
                  {c.status === 'pending' && (
                    <>
                      <Button
                        title="Pagar"
                        size="sm"
                        fullWidth={false}
                        style={{ backgroundColor: colors.success }}
                        icon={<CheckCircle2 size={16} color={colors.onPrimary} />}
                        onPress={() => {
                          setPayDate(toDateKey());
                          setPaying(c);
                        }}
                      />
                      <Button title="Cancelar" size="sm" variant="ghost" fullWidth={false} icon={<XCircle size={16} color={colors.danger} />} onPress={() => onCancel(c)} />
                    </>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </Screen>

      <Sheet
        visible={!!paying}
        onClose={() => setPaying(null)}
        title="Registrar pagamento"
        footer={<Button title="Confirmar pagamento" disabled={!payDate || !payMethod} loading={pay.isPending} onPress={() => pay.mutate()} />}>
        {paying && (
          <AppText tone="muted">
            {paying.psychologistName} · {formatDate(paying.periodStart)} – {formatDate(paying.periodEnd)} · Repasse{' '}
            {formatMoney(paying.totalRepasse)}
          </AppText>
        )}
        <DateTimeField label="Data do pagamento" mode="date" value={payDate} onChange={setPayDate} />
        <SelectField label="Método de pagamento *" value={payMethod} options={paymentMethods} onChange={setPayMethod} />
        <TextField label="Observações (opcional)" placeholder="Ex.: comprovante enviado por e-mail" value={payNotes} onChangeText={setPayNotes} />
      </Sheet>

      <Sheet visible={!!detail} onClose={() => setDetail(null)} title="Detalhes do comissionamento">
        {detail && (
          <>
            <View style={{ gap: 4 }}>
              <AppText weight="semibold">{detail.psychologistName}</AppText>
              <Badge {...commissionStatus(detail.status)} />
              <AppText tone="muted">
                {formatDate(detail.periodStart)} – {formatDate(detail.periodEnd)}
              </AppText>
              <AppText weight="semibold">Repasse total: {formatMoney(detail.totalRepasse)}</AppText>
              {detail.status === 'paid' && (
                <AppText variant="caption" tone="muted">
                  Pago em {formatDate(detail.paymentDate)} via{' '}
                  {paymentMethods.find((m) => m.value === detail.paymentMethod)?.label ?? detail.paymentMethod}
                  {detail.paymentNotes ? ` · ${detail.paymentNotes}` : ''}
                </AppText>
              )}
            </View>
            <AppText variant="subtitle">Locações do período</AppText>
            {items.isLoading ? (
              <LoadingState />
            ) : !(items.data ?? []).length ? (
              <AppText tone="subtle">Nenhuma locação registrada.</AppText>
            ) : (
              items.data!.map((it) => (
                <View key={it.bookingId} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.divider }}>
                  <AppText weight="medium">
                    {formatDate(it.bookingDate)} · {it.roomName ?? 'Sala'}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {formatTime(it.startTime)} – {formatTime(it.endTime)} · Valor {formatMoney(it.bookingValue)} · Repasse{' '}
                    {formatMoney(it.repasseValue)}
                  </AppText>
                </View>
              ))
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
