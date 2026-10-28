import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import {
  BarChart3,
  Building2,
  ChevronRight,
  DoorOpen,
  FileCheck2,
  HandCoins,
  LogOut,
  Receipt,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  Video,
} from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { confirm } from '@/utils/confirm';
import { roleLabels } from '@/utils/status';
import { colors, radius } from '@/theme/tokens';
import type { Role } from '@/types/api';

type Item = {
  label: string;
  href: Href;
  icon: ComponentType<{ size?: number; color?: string }>;
  roles?: Role[];
  /** Only for the platform (super) admin */
  platformOnly?: boolean;
};

// Same role matrix as client/src/components/sidebar.tsx
const sections: { title: string; items: Item[] }[] = [
  {
    title: 'Atendimento',
    items: [{ label: 'Reuniões', href: '/reunioes', icon: Video }],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Fluxo de caixa', href: '/financeiro/fluxo-caixa', icon: BarChart3 },
      { label: 'Minhas notas fiscais', href: '/notas', icon: Receipt },
      { label: 'Gestão de notas', href: '/admin/notas', icon: FileCheck2, roles: ['admin'] },
      { label: 'Comissões', href: '/admin/comissoes', icon: HandCoins, roles: ['admin'] },
    ],
  },
  {
    title: 'Administração',
    items: [
      { label: 'Psicólogas', href: '/admin/psicologas', icon: UsersRound, roles: ['admin'] },
      { label: 'Salas', href: '/admin/salas', icon: DoorOpen, roles: ['admin'] },
      { label: 'Permissões', href: '/admin/permissoes', icon: ShieldCheck, roles: ['admin'] },
      { label: 'Empresas', href: '/empresas', icon: Building2, platformOnly: true },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Meu perfil', href: '/perfil', icon: UserRound, roles: ['psychologist'] },
      { label: 'Configurações', href: '/configuracoes', icon: Settings },
    ],
  },
];

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  const visible = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => (i.platformOnly ? user.isPlatformAdmin : !i.roles || i.roles.includes(user.role))),
    }))
    .filter((s) => s.items.length);

  const onSignOut = async () => {
    const ok = await confirm({ title: 'Sair da conta?', confirmLabel: 'Sair', destructive: true });
    if (ok) await signOut();
  };

  return (
    <Screen background="organic">
      <Card style={styles.profile} onPress={() => router.push('/configuracoes')} accessibilityLabel="Abrir configurações">
        <Avatar name={user.fullName} uri={user.profileImage ?? user.avatarUrl} size={52} />
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle">{user.fullName}</AppText>
          <AppText variant="caption" tone="muted">
            {roleLabels[user.role] ?? user.role} · {user.email}
          </AppText>
        </View>
        <ChevronRight size={18} color={colors.textSubtle} />
      </Card>

      {visible.map((section) => (
        <View key={section.title} style={{ gap: 8 }}>
          <AppText variant="overline" tone="subtle" style={{ marginLeft: 4 }}>
            {section.title}
          </AppText>
          <Card padded={false}>
            {section.items.map((item, i) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.href)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, i > 0 && styles.border, pressed && { backgroundColor: colors.surfaceMuted }]}>
                <View style={styles.icon}>
                  <item.icon size={18} color={colors.primary} />
                </View>
                <AppText style={{ flex: 1 }}>{item.label}</AppText>
                <ChevronRight size={18} color={colors.textSubtle} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      <Card padded={false}>
        <Pressable onPress={onSignOut} accessibilityRole="button" style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.dangerSoft }]}>
            <LogOut size={18} color={colors.danger} />
          </View>
          <AppText tone="danger" weight="medium">
            Sair
          </AppText>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 56 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  icon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
