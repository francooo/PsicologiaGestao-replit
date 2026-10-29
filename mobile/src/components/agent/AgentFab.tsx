import { Platform, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';

import { useAgentStatus } from '@/api/agent';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';

// Default tab bar height (without the bottom inset) on each platform
const TAB_BAR = Platform.OS === 'ios' ? 49 : 56;

/** Floating button above the tab bar that opens the assistant. */
export function AgentFab() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const status = useAgentStatus(!!user?.activeCompany);
  if (!status.data?.enabled) return null;

  return (
    <Pressable
      onPress={() => router.push('/assistente')}
      accessibilityRole="button"
      accessibilityLabel="Abrir assistente"
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + TAB_BAR + 16 },
        pressed && { backgroundColor: colors.primaryPressed },
      ]}>
      <Sparkles size={24} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#243647',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
