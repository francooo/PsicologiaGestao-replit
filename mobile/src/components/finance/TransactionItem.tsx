import { StyleSheet, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { formatDate, formatMoney } from '@/utils/format';
import { colors, radius } from '@/theme/tokens';
import type { TransactionRow } from '@/utils/finance';

export function TransactionItem({ t, showResponsible }: { t: TransactionRow; showResponsible?: boolean }) {
  const income = t.type === 'income';
  const Icon = income ? ArrowUpRight : ArrowDownLeft;
  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: income ? colors.successSoft : colors.dangerSoft }]}>
        <Icon size={18} color={income ? colors.success : colors.danger} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="medium" numberOfLines={1}>
          {t.description}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {[formatDate(t.date), t.category, showResponsible ? t.responsible?.fullName ?? 'Admin' : null].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <AppText weight="semibold" style={{ color: income ? colors.success : colors.danger }}>
        {income ? '+ ' : '- '}
        {formatMoney(t.amount)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  icon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
