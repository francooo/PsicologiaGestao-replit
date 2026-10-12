import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Mail } from 'lucide-react-native';

import { AuthShell } from '@/components/brand/AuthShell';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/api/auth';
import { colors } from '@/theme/tokens';

const schema = z.object({ email: z.string().trim().email('Informe um e-mail válido') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await authApi.recoverPassword(email);
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? 'Não foi possível enviar o e-mail.');
    }
  });

  if (sent) {
    return (
      <AuthShell title="Verifique seu e-mail">
        <View style={styles.form}>
          <View style={styles.success}>
            <CheckCircle2 size={22} color={colors.success} />
            <AppText style={{ flex: 1 }}>
              Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha. O link abre no navegador.
            </AppText>
          </View>
          <Button title="Voltar para o login" onPress={() => router.replace('/login')} />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.">
      <View style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              label="E-mail"
              placeholder="seu.email@exemplo.com"
              icon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        {error && (
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        )}
        <Button title="Enviar link" onPress={onSubmit} loading={formState.isSubmitting} />
        <Button title="Voltar para o login" variant="ghost" onPress={() => router.back()} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  success: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
  },
});
