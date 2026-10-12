import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Plus, Search, Users } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { usePatients } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { patientStatusBadge } from '@/utils/patient';
import { colors } from '@/theme/tokens';

export default function PatientsScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const { data = [], isLoading, error, refetch, isRefetching } = usePatients(showInactive ? { active: false } : undefined);

  // Same client-side search as the web: name, CPF, e-mail
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (p) =>
        p.fullName.toLowerCase().includes(term) ||
        String(p.cpf ?? '').includes(term) ||
        String(p.email ?? '').toLowerCase().includes(term),
    );
  }, [data, search]);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={isLoading || error ? [] : filtered}
      keyExtractor={(p) => String(p.id)}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <AppText tone="muted">Gerencie seus pacientes e prontuários</AppText>
          <TextField
            icon={Search}
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={styles.toggleRow}>
            <AppText variant="label">Incluir inativos</AppText>
            <Switch
              value={showInactive}
              onValueChange={setShowInactive}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Incluir pacientes inativos"
            />
          </View>
          <Button
            title="Novo paciente"
            icon={<Plus size={18} color={colors.onPrimary} />}
            onPress={() => router.push('/pacientes/novo')}
          />
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : (
          <EmptyState title="Nenhum paciente encontrado" icon={Users} />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item: p }) => {
        const s = patientStatusBadge(p.status as string);
        return (
          <Card
            style={styles.row}
            onPress={() => router.push({ pathname: '/pacientes/[id]', params: { id: String(p.id) } })}
            accessibilityLabel={`Abrir prontuário de ${p.fullName}`}>
            <Avatar name={p.fullName} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="medium" numberOfLines={1}>
                {p.fullName}
              </AppText>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                {[p.phone, isAdmin ? (p.psychologistName as string | undefined) ?? 'Sem psicóloga' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
            <Badge label={s.label} tone={s.tone} />
            <ChevronRight size={18} color={colors.textSubtle} />
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
