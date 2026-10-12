import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Variant = 'title' | 'heading' | 'subtitle' | 'body' | 'label' | 'caption' | 'overline';
type Tone = 'default' | 'muted' | 'subtle' | 'primary' | 'danger' | 'success' | 'inverse';

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  weight?: keyof typeof fonts;
  center?: boolean;
};

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  subtle: colors.textSubtle,
  primary: colors.primary,
  danger: colors.danger,
  success: colors.success,
  inverse: colors.onPrimary,
};

export function AppText({ variant = 'body', tone = 'default', weight, center, style, ...props }: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        styles[variant],
        { color: toneColor[tone] },
        weight && { fontFamily: fonts[weight] },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26 },
  subtitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
});
