import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { colors, fonts } from '@/theme/tokens';

/**
 * Platform (super) admin area. Outside (app) because it works without an active company;
 * the root Stack.Protected and the API (requirePlatformAdmin) guard it too.
 */
export default function CompaniesLayout() {
  const { user } = useAuth();
  if (!user) return null;
  if (!user.isPlatformAdmin) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
