import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Building2 } from 'lucide-react-native';

import { AuthShell } from '@/components/brand/AuthShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { useAuth } from '@/auth/AuthProvider';
import { colors } from '@/theme/tokens';
import { roleLabels } from '@/utils/status';
import { toast } from '@/utils/toast';

/** Logged in without an active company: pick one, or learn there is none yet. */
export default function SelectCompanyScreen() {
  const { user, switchCompany, signOut } = useAuth();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const companies = user?.companies ?? [];

  const choose = async (companyId: number) => {
    setPendingId(companyId);
    try {
      await switchCompany(companyId);
    } catch (e: any) {
      toast.error('Não foi possível trocar de empresa', e?.message);
    } finally {
      setPendingId(null);
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
        <Button title="Sair" variant="outline" onPress={signOut} />
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
            <View style={styles.icon}>
              <Building2 size={20} color={colors.primary} />
            </View>
            <View style={styles.text}>
              <AppText variant="subtitle" numberOfLines={1}>
                {company.name}
              </AppText>
              <AppText variant="caption" tone="muted">
                {roleLabels[company.role] ?? company.role}
              </AppText>
            </View>
            {pendingId === company.id && <ActivityIndicator color={colors.primary} />}
          </Card>
        ))}
      </View>
      <Button title="Sair" variant="ghost" onPress={signOut} style={styles.signOut} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  text: { flex: 1, minWidth: 0 },
  signOut: { marginTop: 16 },
});
