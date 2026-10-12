import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { AppText } from './AppText';
import { colors } from '@/theme/tokens';

export function SectionHeader({
  title,
  icon: Icon,
  actionLabel = 'Ver tudo',
  onAction,
}: {
  title: string;
  icon?: ComponentType<{ size?: number; color?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.title}>
        {Icon && <Icon size={18} color={colors.primary} />}
        <AppText variant="subtitle">{title}</AppText>
      </View>
      {onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10} style={styles.action}>
          <AppText variant="label" tone="primary">
            {actionLabel}
          </AppText>
          <ChevronRight size={16} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44 },
});
