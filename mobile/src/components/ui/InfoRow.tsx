import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { colors } from '@/theme/tokens';

export function InfoRow({ label, value, last }: { label: string; value?: string | null; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.border]}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText>{value && String(value).trim() ? value : '—'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 10, gap: 2 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
});
