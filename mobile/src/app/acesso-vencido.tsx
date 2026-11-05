import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeftRight, CalendarX2, LogOut, Mail } from 'lucide-react-native';

import { AuthShell } from '@/components/brand/AuthShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/auth/AuthProvider';
import { SUPPORT_EMAIL, formatDay } from '@/utils/company-access';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';

/** Shown instead of the app while the active clinic's access is expired (the platform admin is never blocked). */
export default function AccessExpiredScreen() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const company = user?.activeCompany;
  if (!user || !company) return null;
  const others = user.companies.filter((c) => c.id !== company.id && !c.accessExpired);

  const contactSupport = async () => {
    const subject = encodeURIComponent(`Renovação do acesso – ${company.name}`);
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
    } catch {
      toast.info('Nenhum app de e-mail encontrado', `Escreva para ${SUPPORT_EMAIL}`);
    }
  };

  const leave = async () => {
    setLeaving(true);
    await signOut();
  };

  return (
    <AuthShell title="Acesso da clínica vencido">
      <View style={styles.icon}>
        <CalendarX2 size={30} color={colors.danger} />
      </View>
      <AppText tone="muted" center>
        O acesso de{' '}
        <AppText weight="semibold" style={{ color: colors.ink }}>
          {company.name}
        </AppText>{' '}
        ao ConsultaPsi
        {company.accessValidUntil ? ` foi até ${formatDay(company.accessValidUntil)}` : ' venceu'}. Os dados continuam guardados
        e voltam a ficar disponíveis assim que o acesso for renovado.
      </AppText>

      <View style={styles.actions}>
        <Button title="Falar com o suporte" icon={<Mail size={18} color={colors.onPrimary} />} onPress={contactSupport} />
        {others.length > 0 && (
          <Button
            title="Trocar clínica"
            variant="outline"
            icon={<ArrowLeftRight size={18} color={colors.ink} />}
            onPress={() => router.push('/selecionar-empresa')}
          />
        )}
        <Button title="Sair" variant="ghost" icon={<LogOut size={18} color={colors.primary} />} loading={leaving} onPress={leave} />
      </View>
      <AppText variant="caption" tone="subtle" center style={{ marginTop: 16 }}>
        {SUPPORT_EMAIL}
      </AppText>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
    marginBottom: 16,
  },
  actions: { gap: 10, marginTop: 24 },
});
