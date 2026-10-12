import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AtSign, Lock, Mail, User } from 'lucide-react-native';

import { AuthShell } from '@/components/brand/AuthShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/auth/AuthProvider';
import { authApi } from '@/api/auth';
import { colors } from '@/theme/tokens';

// Same rules as the web sign-up form (client/src/pages/auth-page.tsx)
const schema = z
  .object({
    fullName: z.string().trim().min(1, 'Informe seu nome completo'),
    email: z.string().trim().email('E-mail inválido'),
    username: z.string().trim().min(1, 'Escolha um nome de usuário'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

type FieldName = keyof FormData;

const fields: {
  name: FieldName;
  label: string;
  placeholder: string;
  icon: typeof User;
  password?: boolean;
  keyboard?: 'email-address';
}[] = [
  { name: 'fullName', label: 'Nome completo', placeholder: 'Digite seu nome completo', icon: User },
  { name: 'email', label: 'E-mail', placeholder: 'seu.email@exemplo.com', icon: Mail, keyboard: 'email-address' },
  { name: 'username', label: 'Nome de usuário', placeholder: 'Escolha um nome de usuário', icon: AtSign },
  { name: 'password', label: 'Senha', placeholder: 'Escolha uma senha', icon: Lock, password: true },
  { name: 'confirmPassword', label: 'Confirmar senha', placeholder: 'Confirme sua senha', icon: Lock, password: true },
];

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', username: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ confirmPassword, ...data }) => {
    setError(null);
    try {
      await authApi.register(data);
      await signIn(data.username, data.password);
    } catch (e: any) {
      setError(e?.message === 'Username already exists' ? 'Este nome de usuário já existe.' : e?.message ?? 'Não foi possível criar a conta.');
    }
  });

  return (
    <AuthShell title="Criar conta" subtitle="Preencha suas informações para começar a usar o ConsultaPsi.">
      <View style={styles.form}>
        {fields.map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field, fieldState }) => (
              <TextField
                label={f.label}
                placeholder={f.placeholder}
                icon={f.icon}
                password={f.password}
                keyboardType={f.keyboard}
                autoCapitalize={f.name === 'fullName' ? 'words' : 'none'}
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        ))}

        {error && (
          <View style={styles.errorBox}>
            <AppText variant="caption" tone="danger">
              {error}
            </AppText>
          </View>
        )}

        <Button title="Criar conta" onPress={onSubmit} loading={formState.isSubmitting} />

        <View style={styles.footer}>
          <AppText tone="muted">Já tem uma conta? </AppText>
          <Link href="/login" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <AppText weight="medium" tone="primary">
                Entrar
              </AppText>
            </Pressable>
          </Link>
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 },
});
