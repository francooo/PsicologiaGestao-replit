import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

import { AppText } from '@/components/ui/AppText';
import { formatMoney } from '@/utils/format';
import { colors, fonts } from '@/theme/tokens';

const INCOME = '#6E9A6A';
const EXPENSE = '#C2413A';
const BALANCE = '#8E7BA8';

const axisText = { fontFamily: fonts.regular, fontSize: 10, color: colors.textSubtle };
const compact = (v: string) => {
  const n = Number(v);
  return Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(Math.round(n));
};

function useWidth() {
  const [width, setWidth] = useState(0);
  return { width, onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width) };
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={styles.legend}>
      {items.map((i) => (
        <View key={i.label} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: i.color }]} />
          <AppText variant="caption" tone="muted">
            {i.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Income x expenses per month (web "Evolução Financeira", area chart). */
export function MonthlyAreaChart({ points }: { points: { label: string; income: number; expense: number }[] }) {
  const { width, onLayout } = useWidth();
  const chartWidth = Math.max(0, width - 44);
  const spacing = points.length > 1 ? chartWidth / (points.length - 1) - 4 : chartWidth;
  return (
    <View onLayout={onLayout} style={{ gap: 8 }}>
      {width > 0 && (
        <LineChart
          areaChart
          curved
          isAnimated
          data={points.map((p) => ({ value: p.income, label: p.label }))}
          data2={points.map((p) => ({ value: p.expense }))}
          color1={INCOME}
          color2={EXPENSE}
          startFillColor1={INCOME}
          startFillColor2={EXPENSE}
          startOpacity={0.25}
          endOpacity={0.02}
          thickness1={2}
          thickness2={2}
          hideDataPoints={points.length > 6}
          width={chartWidth}
          height={180}
          initialSpacing={8}
          spacing={Math.max(spacing, 20)}
          noOfSections={4}
          yAxisLabelWidth={36}
          formatYLabel={compact}
          yAxisTextStyle={axisText}
          xAxisLabelTextStyle={axisText}
          rulesColor={colors.divider}
          yAxisColor="transparent"
          xAxisColor={colors.border}
        />
      )}
      <Legend items={[{ label: 'Receitas', color: INCOME }, { label: 'Despesas', color: EXPENSE }]} />
    </View>
  );
}

/** Daily income / expense / accumulated balance (web "Fluxo de Caixa Diário"). */
export function DailyBarChart({ days }: { days: { label: string; income: number; expense: number; balance: number }[] }) {
  const { width, onLayout } = useWidth();
  const data = days.flatMap((d) => [
    { value: d.income, frontColor: INCOME, spacing: 2, label: d.label, labelWidth: 36 },
    { value: d.expense, frontColor: EXPENSE, spacing: 2 },
    { value: Math.max(d.balance, 0), frontColor: BALANCE, spacing: 14 },
  ]);
  return (
    <View onLayout={onLayout} style={{ gap: 8 }}>
      {width > 0 && (
        <BarChart
          data={data}
          barWidth={8}
          width={Math.max(0, width - 44)}
          height={180}
          noOfSections={4}
          yAxisLabelWidth={36}
          formatYLabel={compact}
          yAxisTextStyle={axisText}
          xAxisLabelTextStyle={axisText}
          rulesColor={colors.divider}
          yAxisColor="transparent"
          xAxisColor={colors.border}
          initialSpacing={8}
          isAnimated
        />
      )}
      <Legend
        items={[
          { label: 'Receitas', color: INCOME },
          { label: 'Despesas', color: EXPENSE },
          { label: 'Saldo acumulado', color: BALANCE },
        ]}
      />
    </View>
  );
}

/** Donut with legend (web pie "Receitas/Despesas por Categoria"). */
export function CategoryDonut({ items }: { items: { name: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!items.length || total === 0) {
    return (
      <AppText tone="subtle" center style={{ paddingVertical: 16 }}>
        Sem categorias para exibir
      </AppText>
    );
  }
  return (
    <View style={styles.donutRow}>
      <PieChart
        donut
        radius={64}
        innerRadius={40}
        data={items.map((i) => ({ value: i.value, color: i.color }))}
        centerLabelComponent={() => (
          <AppText variant="caption" weight="semibold" center>
            {items.length}
            {'\n'}
            <AppText variant="caption" tone="muted">
              categ.
            </AppText>
          </AppText>
        )}
      />
      <View style={{ flex: 1, gap: 6 }}>
        {items.map((i) => (
          <View key={i.name} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: i.color }]} />
            <AppText variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              {i.name} · {Math.round((i.value / total) * 100)}%
            </AppText>
            <AppText variant="caption" weight="medium">
              {formatMoney(i.value)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
