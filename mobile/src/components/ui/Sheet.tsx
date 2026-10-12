import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { AppText } from './AppText';
import { colors, radius } from '@/theme/tokens';

/** Bottom sheet modal (replaces the web Dialog/Sheet). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  scroll = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.handle} />
          {title && (
            <View style={styles.header}>
              <AppText variant="heading" style={{ flex: 1 }}>
                {title}
              </AppText>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fechar">
                <X size={22} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, styles.flexShrink]}>{children}</View>
          )}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  flexShrink: { flexShrink: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(31,51,71,0.35)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  body: { padding: 20, gap: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
});
