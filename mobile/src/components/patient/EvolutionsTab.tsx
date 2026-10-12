import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, NotebookPen, Plus, Search } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { patientKeys, useSessions } from '@/api/patients';
import { confirm } from '@/utils/confirm';
import { formatDate, formatTime } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type TypeFilter = 'all' | 'in-person' | 'online';

export function EvolutionsTab({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient();
  const { data = [], isLoading, error, refetch } = useSessions(patientId);
  const [search, setSearch] = useState('');
  const [type, setType] = useState<TypeFilter>('all');

  const list = useMemo(
    () =>
      data
        .filter((s) => s.isActive !== false)
        .filter((s) => type === 'all' || s.sessionType === type)
        .filter((s) => !search.trim() || s.evolutionNotes?.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate)),
    [data, search, type],
  );

  const archive = useMutation({
    mutationFn: (id: number) => api(`/api/patients/sessions/${id}/archive`, { method: 'PATCH', body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.sessions(patientId) });
      queryClient.invalidateQueries({ queryKey: patientKeys.counts(patientId) });
      toast.success('Evolução arquivada', 'A evolução foi arquivada com sucesso.');
    },
    onError: (e: Error) => toast.error('Erro ao arquivar', e.message),
  });

  const onArchive = async (id: number) => {
    const ok = await confirm({
      title: 'Arquivar evolução?',
      message: 'Esta evolução será arquivada e não aparecerá mais na lista. Esta ação pode ser revertida pelo administrador.',
      confirmLabel: 'Arquivar',
      destructive: true,
    });
    if (ok) archive.mutate(id);
  };

  return (
    <View style={{ gap: 12 }}>
      <Button
        title="Nova evolução"
        icon={<Plus size={18} color={colors.onPrimary} />}
        onPress={() => router.push({ pathname: '/pacientes/[id]/evolucao', params: { id: String(patientId) } })}
      />
      <TextField icon={Search} placeholder="Buscar nas evoluções..." value={search} onChangeText={setSearch} />
      <Segmented<TypeFilter>
        segments={[
          { label: 'Todos', value: 'all' },
          { label: 'Presencial', value: 'in-person' },
          { label: 'Online', value: 'online' },
        ]}
        value={type}
        onChange={setType}
      />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhuma evolução encontrada" description="Registre a primeira sessão clínica" icon={NotebookPen} />
      ) : (
        list.map((s) => (
          <Card key={s.id} style={{ gap: 8 }}>
            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <AppText weight="semibold">{formatDate(s.sessionDate, "dd 'de' MMMM 'de' yyyy")}</AppText>
                <AppText variant="caption" tone="muted">
                  {formatTime(s.sessionTime)} · {s.durationMinutes ?? 50} min
                </AppText>
              </View>
              <Badge label={s.sessionType === 'online' ? 'Online' : 'Presencial'} tone={s.sessionType === 'online' ? 'primary' : 'success'} />
              <IconButton icon={Archive} label="Arquivar evolução" onPress={() => onArchive(s.id)} />
            </View>
            <AppText>{s.evolutionNotes}</AppText>
            {!!s.nextSteps && (
              <View style={styles.next}>
                <AppText variant="overline" tone="subtle">
                  Próximos passos
                </AppText>
                <AppText variant="caption">{s.nextSteps}</AppText>
              </View>
            )}
          </Card>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  next: { backgroundColor: colors.sageSoft, borderRadius: 10, padding: 10, gap: 2 },
});
