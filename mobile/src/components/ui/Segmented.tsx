import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { colors, radius } from '@/theme/tokens';

export type Segment<T extends string> = { label: string; value: T };

/** Pill-style segmented control / tab switcher. `scrollable` for many options. */
export function Segmented<T extends string>({
  segments,
  value,
  onChange,
  scrollable,
}: {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
}) {
  const items = segments.map((s) => {
    const active = s.value === value;
    return (
      <Pressable
        key={s.value}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        onPress={() => onChange(s.value)}
        style={[styles.item, !scrollable && styles.flex, active && styles.active]}>
        <AppText variant="label" weight={active ? 'semibold' : 'medium'} tone={active ? 'primary' : 'muted'} numberOfLines={1}>
          {s.label}
        </AppText>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
        {items}
      </ScrollView>
    );
  }
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  flex: { flex: 1 },
  item: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.surface,
    shadowColor: '#1F3347',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});
