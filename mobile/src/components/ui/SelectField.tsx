import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';

import { AppText } from './AppText';
import { Sheet } from './Sheet';
import { TextField } from './TextField';
import { colors, radius } from '@/theme/tokens';

export type SelectOption<T extends string | number> = { label: string; value: T; description?: string };

type SelectFieldProps<T extends string | number> = {
  label?: string;
  placeholder?: string;
  value: T | null | undefined;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
};

/** Native-feeling select: tappable field that opens a bottom sheet list. */
export function SelectField<T extends string | number>({
  label,
  placeholder = 'Selecione',
  value,
  options,
  onChange,
  error,
  disabled,
  searchable = options.length > 8,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="label" style={{ color: colors.ink }}>
          {label}
        </AppText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${selected?.label ?? placeholder}` : selected?.label ?? placeholder}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.field, !!error && { borderColor: colors.danger }, disabled && styles.disabled]}>
        <AppText style={{ flex: 1 }} tone={selected ? 'default' : 'subtle'} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </AppText>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
      {!!error && (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      )}

      <Sheet
        visible={open}
        onClose={() => {
          setOpen(false);
          setQuery('');
        }}
        title={label ?? placeholder}
        scroll={false}>
        {searchable && (
          <TextField icon={Search} placeholder="Buscar..." value={query} onChangeText={setQuery} autoCorrect={false} />
        )}
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.value)}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <AppText tone="muted" center style={{ paddingVertical: 24 }}>
              Nenhuma opção encontrada
            </AppText>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                  setQuery('');
                }}
                style={({ pressed }) => [styles.option, isSelected && styles.optionSelected, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1 }}>
                  <AppText weight={isSelected ? 'semibold' : 'regular'}>{item.label}</AppText>
                  {item.description && (
                    <AppText variant="caption" tone="muted">
                      {item.description}
                    </AppText>
                  )}
                </View>
                {isSelected && <Check size={18} color={colors.primary} />}
              </Pressable>
            );
          }}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    gap: 8,
  },
  disabled: { backgroundColor: colors.surfaceMuted, opacity: 0.7 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    gap: 8,
  },
  optionSelected: { backgroundColor: colors.primarySoft },
});
