import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { colors, fonts, radius } from '@/theme/tokens';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'lilac' | 'sage' | 'sand';

const tones: Record<BadgeTone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: colors.surfaceMuted, fg: colors.textMuted },
  lilac: { bg: colors.lilacSoft, fg: colors.lilacInk },
  sage: { bg: colors.sageSoft, fg: colors.sageInk },
  sand: { bg: colors.sandSoft, fg: colors.sandInk },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <AppText style={[styles.text, { color: t.fg }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
});
