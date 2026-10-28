import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Building2, LogIn, Pencil, Plus } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { usePlatformCompanies, type PlatformCompany } from '@/api/platform';
import { useAuth } from '@/auth/AuthProvider';
import { formatDate } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';

/** Platform admin: every company — open details, create, enter one for support. */
export default function CompaniesScreen() {
  const { user, switchCompany } = useAuth();
  const companies = usePlatformCompanies();
  const [enteringId, setEnteringId] = useState<number | null>(null);

  const enter = async (c: PlatformCompany) => {
    if (c.id !== user?.activeCompany?.id) {
      setEnteringId(c.id);
      try {
        await switchCompany(c.id);
        toast.success(`Você entrou em ${c.name}`, 'Agora você vê os dados desta empresa.');
      } catch (e: any) {
        toast.error('Não foi possível entrar', e?.message);
        return;
      } finally {
        setEnteringId(null);
      }
    }
    router.replace('/');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Empresas' }} />
      <Screen refreshing={companies.isRefetching} onRefresh={companies.refetch}>
        <AppText tone="muted">Clínicas da plataforma: crie, acompanhe e entre para dar suporte.</AppText>
        <Button title="Nova empresa" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => router.push('/empresas/nova')} />

        {companies.isLoading ? (
          <LoadingState />
        ) : companies.error ? (
          <ErrorState message={companies.error.message} onRetry={companies.refetch} />
        ) : !(companies.data ?? []).length ? (
          <EmptyState title="Nenhuma empresa" description="Crie a primeira clínica da plataforma." icon={Building2} />
        ) : (
          companies.data!.map((c) => {
            const isActive = c.id === user?.activeCompany?.id;
            return (
              <Card key={c.id} style={{ gap: 12 }}>
                <View style={styles.header}>
                  <View style={styles.icon}>
                    <Building2 size={20} color={colors.sageInk} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="subtitle" numberOfLines={1}>
                      {c.name}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      Criada em {formatDate(c.createdAt)}
                    </AppText>
                  </View>
                  {c.status === 'suspended' ? (
                    <Badge label="Suspensa" tone="danger" />
                  ) : isActive ? (
                    <Badge label="Você está aqui" tone="success" />
                  ) : null}
                </View>
                <View style={styles.stats}>
                  <Stat label="Membros" value={c.membersCount} />
                  <Stat label="Admins" value={c.adminsCount} />
                  <Stat label="Convites" value={c.pendingInvitesCount} />
                </View>
                {c.adminsCount === 0 && c.pendingInvitesCount === 0 && (
                  <AppText variant="caption" tone="danger">
                    Sem administrador: convide alguém em Detalhes.
                  </AppText>
                )}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button
                    title="Detalhes"
                    size="sm"
                    variant="outline"
                    style={{ flex: 1 }}
                    icon={<Pencil size={16} color={colors.ink} />}
                    onPress={() => router.push({ pathname: '/empresas/[id]', params: { id: String(c.id) } })}
                  />
                  <Button
                    title={isActive ? 'Abrir' : 'Entrar'}
                    size="sm"
                    style={{ flex: 1 }}
                    icon={<LogIn size={16} color={colors.onPrimary} />}
                    loading={enteringId === c.id}
                    disabled={c.status === 'suspended' || enteringId !== null}
                    onPress={() => enter(c)}
                  />
                </View>
              </Card>
            );
          })
        )}
      </Screen>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <AppText variant="overline" tone="muted">
        {label}
      </AppText>
      <AppText variant="subtitle">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sageSoft,
  },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
});
