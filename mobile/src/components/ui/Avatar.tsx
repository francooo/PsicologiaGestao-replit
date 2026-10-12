import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from './AppText';
import { apiUrl, authHeaders } from '@/api/client';
import { initials } from '@/utils/format';
import { colors, fonts } from '@/theme/tokens';

/** Profile photo from the API (relative /api/users/:id/photo) or Google avatar, falling back to initials. */
export function Avatar({ name, uri, size = 40 }: { name?: string | null; uri?: string | null; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return (
      <Image
        source={{ uri: apiUrl(uri), headers: authHeaders() }}
        style={[style, styles.image]}
        contentFit="cover"
        accessibilityLabel={name ? `Foto de ${name}` : 'Foto de perfil'}
      />
    );
  }
  return (
    <View style={[style, styles.fallback]} accessibilityLabel={name ?? undefined}>
      <AppText style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name) || '?'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted },
  fallback: { backgroundColor: colors.lilacSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.semibold, color: colors.lilacInk },
});
