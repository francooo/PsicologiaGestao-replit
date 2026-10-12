import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadow } from '@/theme/tokens';

export function Card({
  children,
  style,
  onPress,
  padded = true,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.card, padded && styles.padded, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    ...shadow.card,
  },
  padded: { padding: 16 },
  pressed: { opacity: 0.85 },
});
