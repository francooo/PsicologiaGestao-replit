import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/ui/AppText';
import { colors, fonts } from '@/theme/tokens';

const sizes = {
  sm: { icon: 28, text: 22 },
  md: { icon: 40, text: 30 },
  lg: { icon: 52, text: 40 },
};

// Same leaf mark as client/src/components/auth/brand-logo.tsx
export function BrandLogo({ size = 'md', style }: { size?: keyof typeof sizes; style?: ViewStyle }) {
  const s = sizes[size];
  return (
    <View style={[styles.row, style]}>
      <Svg width={s.icon} height={s.icon} viewBox="0 0 48 48">
        <Path d="M23 33 C 16 22, 24 6, 44 1 C 48 18, 40 32, 23 33 Z" fill="#9FAE96" />
        <Path d="M11 47 C 1 36, 5 19, 22 13 C 30 29, 25 43, 11 47 Z" fill="#A99BBB" />
        <Path d="M22 13 C 26 21, 27 28, 25 33 C 21 30, 20 22, 22 13 Z" fill="#E9E6EE" opacity={0.9} />
      </Svg>
      <AppText style={[styles.text, { fontSize: s.text, lineHeight: s.text * 1.15 }]}>
        Consulta<AppText style={[styles.psi, { fontSize: s.text }]}>Psi</AppText>
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontFamily: fonts.medium, color: colors.ink, letterSpacing: -0.5 },
  psi: { fontFamily: fonts.semibold, color: colors.primary },
});
