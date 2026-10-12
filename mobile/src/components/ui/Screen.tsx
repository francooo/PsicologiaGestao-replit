import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrganicBackground } from '@/components/brand/OrganicBackground';
import { colors } from '@/theme/tokens';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  background?: 'plain' | 'organic';
  /** Add the top safe-area inset (screens without a native header). */
  edgeTop?: boolean;
  contentStyle?: ViewStyle;
  footer?: ReactNode;
};

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  background = 'plain',
  edgeTop = false,
  contentStyle,
  footer,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = [styles.content, edgeTop && { paddingTop: insets.top + 12 }, contentStyle];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {background === 'organic' && <OrganicBackground variant="subtle" />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={padding}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, ...padding]}>{children}</View>
      )}
      {footer && <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});
