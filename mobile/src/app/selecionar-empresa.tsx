import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Building2, Check, RefreshCw, Settings2 } from 'lucide-react-native';

import { AuthShell } from '@/components/brand/AuthShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { CompanyLogo } from '@/components/company/CompanyLogo';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';
import { roleLabels } from '@/utils/status';
import { toast } from '@/utils/toast';

/** Logged in without an active company: pick one, or learn there is none yet. */
export default function SelectCompanyScreen() {
  const { user, switchCompany, signOut, refreshUser } = useAuth();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const companies = user?.companies ?? [];

  const choose = async (companyId: number) => {
    if (companyId !== user?.activeCompany?.id) {
      setPendingId(companyId);
      try {
        await switchCompany(companyId);
      } catch (e: any) {
        toast.error('Não foi possível trocar de empresa', e?.message);
        return;
      } finally {
        setPendingId(null);
      }
    }
    router.replace('/');
  };

  // Someone may have linked the account in the meantime (Empresas → Sem clínica)
  const checkAgain = async () => {
    setChecking(true);
    try {
      const me = await refreshUser();
      if (me.activeCompany) router.replace('/');
      else toast.info('Ainda sem clínica', 'Assim que alguém vincular sua conta, toque em Atualizar de novo.');
    } catch (e: any) {
      toast.error('Não foi possível atualizar', e?.message);
    } finally {
      setChecking(false);
    }
  };

  if (companies.length === 0) {
    return (
      <AuthShell title="Nenhuma clínica vinculada">
        <EmptyState
          icon={Building2}
          title="Você ainda não faz parte de uma clínica"
          description={`Peça ao administrador da sua clínica um convite para o e-mail ${user?.email ?? ''}.`}
        />
        <Button
          title="Atualizar"
          icon={<RefreshCw size={18} color={colors.onPrimary} />}
          loading={checking}
          onPress={checkAgain}
          style={styles.signOut}
        />
        {user?.isPlatformAdmin && <ManageCompaniesButton />}
        <Button title="Sair" variant="outline" onPress={signOut} style={styles.signOut} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Escolha a clínica" subtitle="Você pode trocar depois, pelo menu.">
      <View style={styles.list}>
        {companies.map((company) => (
          <Card
            key={company.id}
            onPress={pendingId === null ? () => choose(company.id) : undefined}
            accessibilityLabel={`Entrar em ${company.name}`}
            style={styles.item}>
            <CompanyLogo logoUrl={company.logoUrl} size={40} />
            <View style={styles.text}>
              <AppText variant="subtitle" numberOfLines={1}>
                {company.name}
              </AppText>
              <AppText variant="caption" tone="muted">
                {roleLabels[company.role] ?? company.role}
              </AppText>
            </View>
            {pendingId === company.id ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              company.id === user?.activeCompany?.id && <Check size={20} color={colors.primary} accessibilityLabel="Clínica atual" />
            )}
          </Card>
        ))}
      </View>
      {user?.isPlatformAdmin && <ManageCompaniesButton />}
      <Button title="Sair" variant="ghost" onPress={signOut} style={styles.signOut} />
    </AuthShell>
  );
}

function ManageCompaniesButton() {
  return (
    <Button
      title="Gerenciar empresas"
      icon={<Settings2 size={18} color={colors.onPrimary} />}
      onPress={() => router.push('/empresas')}
      style={styles.signOut}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0 },
  signOut: { marginTop: 16 },
});
