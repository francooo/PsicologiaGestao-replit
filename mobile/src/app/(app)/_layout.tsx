import { Stack } from 'expo-router';

import { colors, fonts } from '@/theme/tokens';

// Stack on top of the tabs: detail/form screens push here with a native header
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* admin/ has its own Stack (with role guard) and headers */}
      <Stack.Screen name="admin" options={{ headerShown: false }} />
      {/* The assistant, opened by the floating button over the tabs */}
      <Stack.Screen name="assistente" options={{ presentation: 'modal', title: 'Assistente' }} />
    </Stack>
  );
}
