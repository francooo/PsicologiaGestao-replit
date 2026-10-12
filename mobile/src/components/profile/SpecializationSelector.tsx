import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Search, X } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';

type Area = { id: number; name: string; category?: string | null; isCustom?: boolean };

export function useSpecializationAreas() {
  return useQuery({
    queryKey: ['/api/specialization-areas'],
    // Grouped object { [category]: Area[] }
    queryFn: () => api<Record<string, Area[]>>('/api/specialization-areas'),
  });
}

function Chip({ label, selected, onPress, removable }: { label: string; selected?: boolean; onPress?: () => void; removable?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn]}>
      {selected && !removable && <Check size={14} color={colors.primary} />}
      <AppText variant="caption" weight={selected ? 'semibold' : 'regular'} tone={selected ? 'primary' : 'default'}>
        {label}
      </AppText>
      {removable && <X size={14} color={colors.primary} />}
    </Pressable>
  );
}

/** Port of specialization-chip-selector.tsx (read-only or editable). */
export function SpecializationSelector({
  selectedIds,
  onChange,
  readonly,
}: {
  selectedIds: number[];
  onChange?: (ids: number[]) => void;
  readonly?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSpecializationAreas();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const groups = useMemo(() => Object.entries(data ?? {}), [data]);
  const all = useMemo(() => groups.flatMap(([, items]) => items), [groups]);
  const selected = all.filter((a) => selectedIds.includes(a.id));

  const create = useMutation({
    mutationFn: (name: string) =>
      api<Area>('/api/specialization-areas', { method: 'POST', body: { name, category: 'Personalizada' } }),
    onSuccess: (area) => {
      queryClient.invalidateQueries({ queryKey: ['/api/specialization-areas'] });
      if (!selectedIds.includes(area.id)) onChange?.([...selectedIds, area.id]);
      setNewName('');
      setAdding(false);
    },
    onError: () => toast.error('Erro ao adicionar especialização'),
  });

  const toggle = (id: number) =>
    onChange?.(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);

  if (isLoading) return <LoadingState />;

  if (readonly) {
    if (!selected.length) return <AppText tone="subtle">Nenhuma área de atuação cadastrada.</AppText>;
    const byCat = groups
      .map(([cat, items]) => [cat, items.filter((a) => selectedIds.includes(a.id))] as const)
      .filter(([, items]) => items.length);
    return (
      <View style={{ gap: 10 }}>
        {byCat.map(([cat, items]) => (
          <View key={cat} style={{ gap: 6 }}>
            <AppText variant="overline" tone="subtle">
              {cat}
            </AppText>
            <View style={styles.wrap}>
              {items.map((a) => (
                <Chip key={a.id} label={a.name} selected />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  const term = search.trim().toLowerCase();
  const filteredGroups = groups
    .map(([cat, items]) => [cat, term ? items.filter((a) => a.name.toLowerCase().includes(term)) : items] as const)
    .filter(([, items]) => items.length);

  return (
    <View style={{ gap: 12 }}>
      {selected.length > 0 && (
        <View style={styles.wrap}>
          {selected.map((a) => (
            <Chip key={a.id} label={a.name} selected removable onPress={() => toggle(a.id)} />
          ))}
        </View>
      )}
      <TextField icon={Search} placeholder="Buscar área de atuação..." value={search} onChangeText={setSearch} />
      {filteredGroups.length === 0 ? (
        <AppText tone="subtle">Nenhuma área encontrada.</AppText>
      ) : (
        filteredGroups.map(([cat, items]) => (
          <View key={cat} style={{ gap: 6 }}>
            <AppText variant="overline" tone="subtle">
              {cat}
            </AppText>
            <View style={styles.wrap}>
              {items.map((a) => (
                <Chip key={a.id} label={a.name} selected={selectedIds.includes(a.id)} onPress={() => toggle(a.id)} />
              ))}
            </View>
          </View>
        ))
      )}
      {adding ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <TextField
              placeholder="Nome da especialização..."
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={() => newName.trim() && create.mutate(newName.trim())}
            />
          </View>
          <Button title="Adicionar" size="sm" fullWidth={false} disabled={!newName.trim()} loading={create.isPending} onPress={() => create.mutate(newName.trim())} />
        </View>
      ) : (
        <Button
          title="Adicionar personalizada"
          variant="ghost"
          size="sm"
          fullWidth={false}
          icon={<Plus size={16} color={colors.primary} />}
          onPress={() => setAdding(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
});
