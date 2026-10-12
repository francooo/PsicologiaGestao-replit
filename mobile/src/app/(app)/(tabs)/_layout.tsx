import { Tabs } from 'expo-router';
import { CalendarDays, Home, LayoutGrid, Users, Wallet } from 'lucide-react-native';

import { colors, fonts } from '@/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 18 },
        headerTitleAlign: 'left',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.divider },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', headerShown: false, tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="pacientes"
        options={{ title: 'Pacientes', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="financeiro"
        options={{ title: 'Financeiro', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="mais"
        options={{ title: 'Mais', tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} /> }}
      />
    </Tabs>
  );
}
