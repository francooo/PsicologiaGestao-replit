import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { colors, fonts, radius } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const palette: Record<Variant, { bg: string; pressed: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, text: colors.onPrimary },
  secondary: { bg: colors.primarySoft, pressed: '#D3E4EE', text: colors.primary },
  outline: { bg: colors.surface, pressed: colors.surfaceMuted, text: colors.ink, border: colors.border },
  ghost: { bg: 'transparent', pressed: colors.surfaceMuted, text: colors.primary },
  danger: { bg: colors.danger, pressed: '#A3352F', text: colors.onPrimary },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  fullWidth = true,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const p = palette[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: pressed ? p.pressed : p.bg },
        p.border && { borderWidth: 1, borderColor: p.border },
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && { opacity: 0.6 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.text} />
      ) : (
        <View style={styles.content}>
          {icon}
          <AppText style={[styles.text, { color: p.text, fontSize: size === 'sm' ? 14 : 16 }]}>{title}</AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  md: { minHeight: 50 },
  sm: { minHeight: 40, paddingHorizontal: 14 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: fonts.medium },
});
