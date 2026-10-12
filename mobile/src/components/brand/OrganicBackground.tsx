import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/**
 * Decorative blobs from the "acolhimento" login, adapted to phone proportions.
 * `variant="full"` for auth screens, `"subtle"` behind regular app screens.
 */
export function OrganicBackground({ variant = 'full' }: { variant?: 'full' | 'subtle' }) {
  const { width, height } = useWindowDimensions();
  const opacity = variant === 'full' ? 1 : 0.55;
  const topSize = width * (variant === 'full' ? 0.85 : 0.6);
  const bottomWidth = width * (variant === 'full' ? 1.1 : 0.8);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Top-right lilac blob */}
      <Svg
        width={topSize}
        height={topSize}
        viewBox="0 0 560 560"
        style={{ position: 'absolute', top: -topSize * 0.35, right: -topSize * 0.25, opacity }}>
        <Path
          d="M120 0 H560 V430 C 500 470, 410 450, 330 380 C 250 310, 150 230, 120 120 C 110 70, 112 30, 120 0 Z"
          fill="#D9D1E2"
        />
        <Path
          d="M0 40 C 80 160, 220 200, 330 240 C 430 280, 500 330, 545 470"
          stroke="#D9C2AA"
          strokeWidth={2}
          fill="none"
        />
      </Svg>

      {/* Bottom-left sage + sand blobs */}
      <Svg
        width={bottomWidth}
        height={bottomWidth * (620 / 760)}
        viewBox="0 0 760 620"
        style={{ position: 'absolute', bottom: -height * 0.02, left: -bottomWidth * 0.12, opacity }}>
        <Path d="M300 620 C 330 470, 470 400, 590 440 C 690 475, 730 560, 740 620 Z" fill={colors.sand} />
        <Path
          d="M0 40 C 90 70, 140 160, 170 260 C 200 360, 230 400, 330 410 C 260 470, 250 560, 280 620 H0 Z"
          fill="#C9D0C0"
        />
        <Path
          d="M0 260 C 160 300, 330 400, 360 520 C 370 570, 355 600, 330 620"
          stroke="#7E8A77"
          strokeWidth={2}
          fill="none"
        />
      </Svg>
    </View>
  );
}
