import { View } from 'react-native';
import { Image } from 'expo-image';
import { Building2 } from 'lucide-react-native';

import { apiUrl } from '@/api/client';
import { colors, radius } from '@/theme/tokens';

/** The clinic's logo (served by the API), or a building icon when it has none. */
export function CompanyLogo({ logoUrl, size = 40 }: { logoUrl?: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: radius.md };
  if (logoUrl) {
    return <Image source={{ uri: apiUrl(logoUrl) }} style={[box, { backgroundColor: colors.surface }]} contentFit="contain" />;
  }
  return (
    <View style={[box, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sageSoft }]}>
      <Building2 size={size / 2} color={colors.sageInk} />
    </View>
  );
}
