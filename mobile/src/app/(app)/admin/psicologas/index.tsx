import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Search, UserRound } from 'lucide-react-native';

import { useSpecializationAreas } from '@/components/profile/SpecializationSelector';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { useAdminPsychologists } from '@/api/admin';
import { monthsAtClinicText } from '@/utils/people';
import { colors } from '@/theme/tokens';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminPsychologistsScreen() {
  const { data = [], isLoading, error, refetch, isRefetching } = useAdminPsychologists();
  const areas = useSpecializationAreas();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [area, setArea] = useState(0);

  const allAreas = useMemo(() => Object.values(areas.data ?? {}).flat(), [areas.data]);
  const filtered = data.filter((p) => {
    const term = search.trim().toLowerCase();
    if (term && ![p.user.fullName, p.user.email, p.crpNumber ?? ''].some((v) => v.toLowerCase().includes(term))) return false;
    if (status === 'active' && p.user.status !== 'active') return false;
    if (status === 'inactive' && p.user.status === 'active') return false;
    return !area || p.specializations.some((s) => s.id === area);
  });
  const activeCount = data.filter((p) => p.user.status === 'active').length;

  return (
    <>
      <Stack.Screen options={{ title: 'Psicólogas' }} />
      <Screen refreshing={isRefetching} onRefresh={refetch}>
        <AppText tone="muted">Gerencie os perfis profissionais, áreas de atuação e status das psicólogas.</AppText>
        <TextField icon={Search} placeholder="Buscar por nome, e-mail ou CRP..." value={search} onChangeText={setSearch} />
        <Segmented<StatusFilter>
          segments={[
            { label: 'Todas', value: 'all' },
            { label: 'Ativas', value: 'active' },
            { label: 'Inativas', value: 'inactive' },
          ]}
          value={status}
          onChange={setStatus}
        />
        <SelectField
          value={area}
          options={[{ label: 'Todas as áreas', value: 0 }, ...allAreas.map((a) => ({ label: a.name, value: a.id }))]}
          onChange={setArea}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText tone="muted">
            {filtered.length} psicóloga{filtered.length !== 1 ? 's' : ''}
          </AppText>
          <Badge label={`${activeCount} ativas`} tone="success" />
        </View>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma psicóloga encontrada." icon={UserRound} />
        ) : (
          filtered.map((p) => {
            const active = p.user.status === 'active';
            return (
              <Card
                key={p.id}
                style={[{ gap: 10 }, !active ? { opacity: 0.65 } : {}]}
                onPress={() => router.push({ pathname: '/admin/psicologas/[id]', params: { id: String(p.id) } })}
                accessibilityLabel={`Abrir ${p.user.fullName}`}>
                <View style={styles.head}>
                  <Avatar name={p.user.fullName} uri={p.user.profileImage} size={48} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText weight="semibold">{p.user.fullName}</AppText>
                    <AppText variant="caption" tone="muted">
                      {[p.crpNumber && `CRP ${p.crpNumber}`, p.age !== null && `${p.age} anos`, p.phone].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                  <Badge label={active ? 'Ativa' : 'Inativa'} tone={active ? 'success' : 'neutral'} />
                </View>
                {p.specializations.length > 0 && (
                  <View style={styles.chips}>
                    {p.specializations.slice(0, 3).map((s) => (
                      <Badge key={s.id} label={s.name} tone="primary" />
                    ))}
                    {p.specializations.length > 3 && <Badge label={`+${p.specializations.length - 3} mais`} tone="neutral" />}
                  </View>
                )}
                <View style={styles.stats}>
                  {[
                    ['Pacientes', String(p.activePatientsCount)],
                    ['Sessões', String(p.sessionsCount)],
                    ['Na clínica', monthsAtClinicText(null, false, p.monthsAtClinic)],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.stat}>
                      <AppText weight="semibold">{value}</AppText>
                      <AppText variant="caption" tone="muted">
                        {label}
                      </AppText>
                    </View>
                  ))}
                </View>
              </Card>
            );
          })
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider, paddingTop: 10 },
  stat: { flex: 1, alignItems: 'center' },
});
