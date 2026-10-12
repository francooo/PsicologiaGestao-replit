import type { ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export function IconButton({
  icon: Icon,
  onPress,
  label,
  tone = 'default',
  size = 20,
}: {
  icon: ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'primary' | 'danger';
  size?: number;
}) {
  const color = tone === 'primary' ? colors.primary : tone === 'danger' ? colors.danger : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <Icon size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
