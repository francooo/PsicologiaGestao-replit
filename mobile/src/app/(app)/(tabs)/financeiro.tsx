import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Minus, Plus, Receipt, Wallet } from 'lucide-react-native';

import { MonthlyAreaChart } from '@/components/finance/Charts';
import { SummaryCard, SummaryRow } from '@/components/finance/SummaryCard';
import { TransactionItem } from '@/components/finance/TransactionItem';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/auth/AuthProvider';
import { amountOf, totals, useTransactions } from '@/utils/finance';
import { toDateKey } from '@/utils/format';
import { colors } from '@/theme/tokens';

type Period = '1' | '3' | '6' | '12';

export default function FinancialScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [startDate, setStartDate] = useState(toDateKey(startOfMonth(now)));
  const [endDate, setEndDate] = useState(toDateKey(endOfMonth(now)));
  const [period, setPeriod] = useState<Period>('3');

  const list = useTransactions({ startDate, endDate });
  // The web chart only used the filtered list (other months showed 0); fetch the chart range itself
  const chartStart = startOfMonth(subMonths(now, Number(period) - 1));
  const chart = useTransactions({ startDate: toDateKey(chartStart), endDate: toDateKey(endOfMonth(now)) });

  const sum = totals(list.data ?? []);
  const points = useMemo(
    () =>
      eachMonthOfInterval({ start: chartStart, end: now }).map((m) => {
        const key = format(m, 'yyyy-MM');
        const month = (chart.data ?? []).filter((t) => t.date.startsWith(key));
        return {
          label: format(m, 'MMM', { locale: ptBR }),
          income: month.filter((t) => t.type === 'income').reduce((s, t) => s + amountOf(t), 0),
          expense: month.filter((t) => t.type === 'expense').reduce((s, t) => s + amountOf(t), 0),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chart.data, period],
  );

  const refresh = () => {
    list.refetch();
    chart.refetch();
  };

  return (
    <Screen refreshing={list.isRefetching} onRefresh={refresh}>
      <AppText tone="muted">Gestão financeira do consultório</AppText>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          title="Receita"
          style={{ flex: 1, backgroundColor: colors.success }}
          icon={<Plus size={18} color={colors.onPrimary} />}
          onPress={() => router.push({ pathname: '/financeiro/transacao', params: { type: 'income' } })}
        />
        <Button
          title="Despesa"
          variant="danger"
          style={{ flex: 1 }}
          icon={<Minus size={18} color={colors.onPrimary} />}
          onPress={() => router.push({ pathname: '/financeiro/transacao', params: { type: 'expense' } })}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          title="Fluxo de caixa"
          variant="secondary"
          style={{ flex: 1 }}
          icon={<BarChart3 size={18} color={colors.primary} />}
          onPress={() => router.push('/financeiro/fluxo-caixa')}
        />
        <Button
          title="Minhas notas"
          variant="secondary"
          style={{ flex: 1 }}
          icon={<Receipt size={18} color={colors.primary} />}
          onPress={() => router.push('/notas')}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DateTimeField label="De" mode="date" value={startDate} onChange={setStartDate} />
        <DateTimeField label="Até" mode="date" value={endDate} onChange={setEndDate} />
      </View>

      {list.isLoading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error.message} onRetry={refresh} />
      ) : (
        <>
          <SummaryRow>
            <SummaryCard label="Receitas" value={sum.income} color={colors.success} />
            <SummaryCard label="Despesas" value={sum.expense} color={colors.danger} />
            <SummaryCard label="Lucro" value={sum.balance} color={colors.primary} />
          </SummaryRow>

          <Card style={{ gap: 12 }}>
            <AppText variant="subtitle">Evolução financeira</AppText>
            <Segmented<Period>
              segments={[
                { label: '1M', value: '1' },
                { label: '3M', value: '3' },
                { label: '6M', value: '6' },
                { label: '1A', value: '12' },
              ]}
              value={period}
              onChange={setPeriod}
            />
            {chart.isLoading ? <LoadingState /> : <MonthlyAreaChart points={points} />}
          </Card>

          <Card>
            <AppText variant="subtitle">Transações do período</AppText>
            {(list.data ?? []).length === 0 ? (
              <EmptyState title="Nenhuma transação encontrada no período selecionado." icon={Wallet} />
            ) : (
              [...list.data!]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((t) => <TransactionItem key={t.id} t={t} showResponsible={user?.role === 'admin'} />)
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
