import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Mail } from 'lucide-react-native';

import { AuthShell } from '@/components/brand/AuthShell';
import { GoogleIcon } from '@/components/brand/GoogleIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/auth/AuthProvider';
import { apiUrl } from '@/api/client';
import { colors } from '@/theme/tokens';

const schema = z.object({
  username: z.string().trim().min(1, 'Informe seu e-mail ou nome de usuário'),
  password: z.string().min(1, 'A senha é obrigatória'),
});
type FormData = z.infer<typeof schema>;

const loginErrors: Record<string, string> = {
  'Invalid username or password': 'E-mail/usuário ou senha incorretos.',
  'Account is not active. Please contact administrator.': 'Conta inativa. Fale com o administrador.',
};

export default function LoginScreen() {
  const { signIn, signInWithToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setError(null);
    try {
      await signIn(username, password);
    } catch (e: any) {
      setError(loginErrors[e?.message] ?? e?.message ?? 'Não foi possível entrar.');
    }
  });

  // Google OAuth happens on the server; it redirects back to the app with the session token
  const onGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const redirect = Linking.createURL('auth-callback');
      const url = apiUrl(`/auth/google?mobile_redirect=${encodeURIComponent(redirect)}`);
      const result = await WebBrowser.openAuthSessionAsync(url, redirect);
      if (result.type !== 'success') return;
      const { queryParams } = Linking.parse(result.url);
      const token = typeof queryParams?.token === 'string' ? queryParams.token : null;
      if (!token) {
        setError('Não foi possível entrar com o Google.');
        return;
      }
      await signInWithToken(token);
    } catch {
      setError('Não foi possível entrar com o Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Entre para continuar sua rotina no ConsultaPsi.">
      <View style={styles.form}>
        <Controller
          control={control}
          name="username"
          render={({ field, fieldState }) => (
            <TextField
              label="E-mail ou nome de usuário"
              placeholder="Digite seu e-mail ou usuário"
              icon={Mail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="username"
              returnKeyType="next"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              label="Senha"
              placeholder="Digite sua senha"
              icon={Lock}
              password
              textContentType="password"
              autoComplete="current-password"
              returnKeyType="go"
              onSubmitEditing={onSubmit}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" hitSlop={8} style={styles.forgot}>
            <AppText variant="label" tone="primary">
              Esqueceu sua senha?
            </AppText>
          </Pressable>
        </Link>

        {error && (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <AppText variant="caption" tone="danger">
              {error}
            </AppText>
          </View>
        )}

        <Button title="Entrar" onPress={onSubmit} loading={formState.isSubmitting} />

        <View style={styles.divider}>
          <View style={styles.line} />
          <AppText variant="overline" tone="subtle">
            ou
          </AppText>
          <View style={styles.line} />
        </View>

        <Button
          title="Continuar com Google"
          variant="outline"
          icon={<GoogleIcon />}
          onPress={onGoogle}
          loading={googleLoading}
        />

        <View style={styles.footer}>
          <AppText tone="muted">Não tem uma conta? </AppText>
          <Link href="/register" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <AppText weight="medium" tone="primary">
                Criar conta
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
  forgot: { alignSelf: 'flex-end', marginTop: -4 },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  footer: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 },
});
