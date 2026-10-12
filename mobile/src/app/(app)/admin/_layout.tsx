import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { colors, fonts } from '@/theme/tokens';

/** Admin-only area (the API enforces it too; this keeps deep links out). */
export default function AdminLayout() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Redirect href="/" />;
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
