import type { ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AlertCircle, Inbox } from 'lucide-react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { colors } from '@/theme/tokens';

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText tone="muted">{label}</AppText>
    </View>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: number; color?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.box}>
      <View style={styles.iconCircle}>
        <Icon size={26} color={colors.primary} />
      </View>
      <AppText variant="subtitle" center>
        {title}
      </AppText>
      {description && (
        <AppText tone="muted" center>
          {description}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} size="sm" />
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.box}>
      <View style={[styles.iconCircle, { backgroundColor: colors.dangerSoft }]}>
        <AlertCircle size={26} color={colors.danger} />
      </View>
      <AppText variant="subtitle" center>
        Não foi possível carregar
      </AppText>
      {message && (
        <AppText tone="muted" center>
          {message}
        </AppText>
      )}
      {onRetry && <Button title="Tentar novamente" onPress={onRetry} variant="outline" fullWidth={false} size="sm" />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, paddingHorizontal: 16, gap: 10 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
