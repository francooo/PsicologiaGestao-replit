import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { formatMoney } from '@/utils/format';
import { colors, fonts } from '@/theme/tokens';

export function SummaryCard({ label, value, color, hint }: { label: string; value: number | string; color: string; hint?: string }) {
  return (
    <Card style={[styles.card, { borderLeftColor: color }]} accessibilityLabel={`${label}: ${formatMoney(value)}`}>
      <AppText variant="overline" tone="subtle">
        {label}
      </AppText>
      <AppText style={[styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {typeof value === 'number' ? formatMoney(value) : value}
      </AppText>
      {hint && (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      )}
    </Card>
  );
}

export function SummaryRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { flexGrow: 1, flexBasis: '30%', minWidth: 140, borderLeftWidth: 4, gap: 4 },
  value: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, color: colors.ink },
});
