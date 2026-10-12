import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo } from './BrandLogo';
import { OrganicBackground } from './OrganicBackground';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, shadow } from '@/theme/tokens';

/** Creme background + centered white card, as in the web login mock. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <OrganicBackground />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.center}>
          <View style={styles.card}>
            <BrandLogo style={styles.logo} />
            <View style={styles.header}>
              <AppText variant="title">{title}</AppText>
              {subtitle && <AppText tone="muted">{subtitle}</AppText>}
            </View>
            {children}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: 16 },
  // Grows to fill short content and centers it; taller content simply scrolls (never clipped at the top)
  center: { flexGrow: 1, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    ...shadow.card,
  },
  logo: { alignSelf: 'center', marginBottom: 28 },
  header: { gap: 4, marginBottom: 24 },
});
