import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock } from 'lucide-react-native';

import { SummaryCard, SummaryRow } from '@/components/finance/SummaryCard';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { api } from '@/api/client';
import { roleLabels } from '@/utils/status';
import { colors } from '@/theme/tokens';

type Person = { id: number; fullName: string; email: string; role: string };
type MonthStatus = { sent: Person[]; pending: Person[]; totalUsers: number; totalSent: number; totalPending: number };

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(
  (label, i) => ({ label, value: String(i + 1).padStart(2, '0') }),
);

/** "Status por mês": who already sent invoices for the reference month. */
export default function InvoiceMonthStatusScreen() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const years = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i)).map((y) => ({ label: y, value: y }));
  const referenceMonth = `${year}-${month}`;

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['/api/admin/invoices/status', referenceMonth],
    queryFn: () => api<MonthStatus>('/api/admin/invoices/status', { query: { referenceMonth } }),
  });

  const renderPerson = (p: Person) => (
    <View key={p.id} style={{ paddingVertical: 8, gap: 2, borderTopWidth: 1, borderTopColor: colors.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText weight="medium" style={{ flex: 1 }}>
          {p.fullName}
        </AppText>
        <Badge label={roleLabels[p.role] ?? p.role} tone="neutral" />
      </View>
      <AppText variant="caption" tone="muted">
        {p.email}
      </AppText>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Status por mês' }} />
      <Screen refreshing={isRefetching} onRefresh={refetch}>
        <Card style={{ gap: 12 }}>
          <AppText variant="subtitle">Mês de referência</AppText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 2 }}>
              <SelectField value={month} options={months} onChange={setMonth} />
            </View>
            <View style={{ flex: 1 }}>
              <SelectField value={year} options={years} onChange={setYear} />
            </View>
          </View>
        </Card>

        {isLoading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error?.message} onRetry={refetch} />
        ) : (
          <>
            <SummaryRow>
              <SummaryCard label="Total de usuários" value={String(data.totalUsers)} color={colors.primary} />
              <SummaryCard label="Já enviaram" value={String(data.totalSent)} color={colors.success} />
              <SummaryCard label="Pendentes" value={String(data.totalPending)} color={colors.warning} />
            </SummaryRow>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <CheckCircle2 size={18} color={colors.success} />
                <AppText variant="subtitle">Já enviaram ({data.totalSent})</AppText>
              </View>
              {data.sent.length ? data.sent.map(renderPerson) : <AppText tone="subtle">Nenhum usuário enviou nota para este mês.</AppText>}
            </Card>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Clock size={18} color={colors.warning} />
                <AppText variant="subtitle">Ainda não enviaram ({data.totalPending})</AppText>
              </View>
              {data.pending.length ? data.pending.map(renderPerson) : <AppText tone="subtle">Todos já enviaram.</AppText>}
            </Card>
          </>
        )}
      </Screen>
    </>
  );
}
