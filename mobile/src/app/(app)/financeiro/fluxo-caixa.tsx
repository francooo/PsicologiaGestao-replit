import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { Download, Minus, Plus, Wallet } from 'lucide-react-native';

import { CategoryDonut, DailyBarChart } from '@/components/finance/Charts';
import { SummaryCard, SummaryRow } from '@/components/finance/SummaryCard';
import { TransactionItem } from '@/components/finance/TransactionItem';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { amountOf, byCategory, colorFor, totals, useTransactions } from '@/utils/finance';
import { shareTextFile, toCsv } from '@/utils/files';
import { formatDate, fromDateKey, toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type TypeFilter = 'all' | 'income' | 'expense';

export default function CashFlowScreen() {
  const now = new Date();
  const [startDate, setStartDate] = useState(toDateKey(startOfMonth(now)));
  const [endDate, setEndDate] = useState(toDateKey(endOfMonth(now)));
  const [type, setType] = useState<TypeFilter>('all');
  const { data = [], isLoading, error, refetch, isRefetching } = useTransactions({ startDate, endDate });

  const filtered = data.filter((t) => type === 'all' || t.type === type);
  const sum = totals(filtered);

  // Daily series over the whole range (not affected by the type filter, as in the web)
  const days = useMemo(() => {
    if (endDate < startDate) return [];
    let acc = 0;
    return eachDayOfInterval({ start: fromDateKey(startDate), end: fromDateKey(endDate) }).map((d) => {
      const key = toDateKey(d);
      const day = data.filter((t) => t.date.startsWith(key));
      const income = day.filter((t) => t.type === 'income').reduce((s, t) => s + amountOf(t), 0);
      const expense = day.filter((t) => t.type === 'expense').reduce((s, t) => s + amountOf(t), 0);
      acc += income - expense;
      return { label: format(d, 'dd/MM'), income, expense, balance: acc };
    });
  }, [data, startDate, endDate]);
  const activeDays = days.filter((d) => d.income || d.expense);

  const exportCsv = async () => {
    if (!filtered.length) {
      toast.info('Sem dados', 'Não há transações para exportar no período selecionado');
      return;
    }
    // Fixes the web CSV (comma-separated with "R$ 1.234,56" values broke the columns)
    const csv = toCsv([
      ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'],
      ...filtered.map((t) => [
        formatDate(t.date),
        t.description,
        t.category,
        t.type === 'income' ? 'Receita' : 'Despesa',
        amountOf(t).toFixed(2).replace('.', ','),
      ]),
    ]);
    try {
      await shareTextFile(`fluxo-caixa-${startDate}-a-${endDate}.csv`, csv);
    } catch (e: any) {
      toast.error('Erro ao exportar', e?.message);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Fluxo de caixa' }} />
      <Screen refreshing={isRefetching} onRefresh={refetch}>
        <AppText tone="muted">Análise detalhada das receitas e despesas</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Entrada"
            style={{ flex: 1, backgroundColor: colors.success }}
            icon={<Plus size={18} color={colors.onPrimary} />}
            onPress={() => router.push({ pathname: '/financeiro/transacao', params: { type: 'income' } })}
          />
          <Button
            title="Saída"
            variant="danger"
            style={{ flex: 1 }}
            icon={<Minus size={18} color={colors.onPrimary} />}
            onPress={() => router.push({ pathname: '/financeiro/transacao', params: { type: 'expense' } })}
          />
        </View>

        <Card style={{ gap: 12 }}>
          <AppText variant="subtitle">Filtros</AppText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DateTimeField label="De" mode="date" value={startDate} onChange={setStartDate} />
            <DateTimeField label="Até" mode="date" value={endDate} onChange={setEndDate} />
          </View>
          <Segmented<TypeFilter>
            segments={[
              { label: 'Todos', value: 'all' },
              { label: 'Receitas', value: 'income' },
              { label: 'Despesas', value: 'expense' },
            ]}
            value={type}
            onChange={setType}
          />
          <Button
            title="Exportar CSV"
            variant="outline"
            icon={<Download size={18} color={colors.ink} />}
            onPress={exportCsv}
          />
        </Card>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : (
          <>
            <SummaryRow>
              <SummaryCard label="Entradas" value={sum.income} color={colors.primary} />
              <SummaryCard label="Saídas" value={sum.expense} color={colors.danger} />
              <SummaryCard
                label={sum.balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
                value={sum.balance}
                color={sum.balance >= 0 ? colors.success : colors.warning}
              />
            </SummaryRow>

            <Card style={{ gap: 12 }}>
              <AppText variant="subtitle">Fluxo de caixa diário</AppText>
              <AppText variant="caption" tone="muted">
                Dias com movimentação no período
              </AppText>
              {activeDays.length ? (
                <DailyBarChart days={activeDays} />
              ) : (
                <AppText tone="subtle" center>
                  Sem dados para exibir
                </AppText>
              )}
            </Card>

            <Card style={{ gap: 12 }}>
              <AppText variant="subtitle">Receitas por categoria</AppText>
              <CategoryDonut items={byCategory(data, 'income').map((c, i) => ({ ...c, color: colorFor(c.name, i) }))} />
            </Card>
            <Card style={{ gap: 12 }}>
              <AppText variant="subtitle">Despesas por categoria</AppText>
              <CategoryDonut items={byCategory(data, 'expense').map((c, i) => ({ ...c, color: colorFor(c.name, i) }))} />
            </Card>

            <Card>
              <AppText variant="subtitle">Transações detalhadas</AppText>
              {filtered.length === 0 ? (
                <EmptyState title="Nenhuma transação no período" icon={Wallet} />
              ) : (
                [...filtered].sort((a, b) => b.date.localeCompare(a.date)).map((t) => <TransactionItem key={t.id} t={t} />)
              )}
            </Card>
          </>
        )}
      </Screen>
    </>
  );
}
