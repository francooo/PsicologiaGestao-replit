import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, FileText, Mail } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { adminResultMessage, PLATFORM_COMPANIES_KEY, type AddAdminResult, type PlatformCompany } from '@/api/platform';
import { toast } from '@/utils/toast';

/** Platform admin: a new company (clínica), optionally with its first admin. */
export default function NewCompanyScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', cnpj: '', adminEmail: '' });

  const create = useMutation({
    mutationFn: () =>
      api<{ company: PlatformCompany; admin: AddAdminResult | null }>('/api/platform/companies', { method: 'POST', body: form }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: PLATFORM_COMPANIES_KEY });
      toast.success(`Empresa ${res.company.name} criada`, adminResultMessage(res.admin));
      router.back();
    },
    onError: (e: Error) => toast.error('Não foi possível criar', e.message),
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Nova empresa' }} />
      <Screen>
        <AppText tone="muted">Uma clínica nova, com dados separados das demais.</AppText>
        <Card style={{ gap: 14 }}>
          <TextField
            label="Nome da clínica"
            icon={Building2}
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
            autoFocus
          />
          <TextField
            label="CNPJ (opcional)"
            icon={FileText}
            value={form.cnpj}
            onChangeText={(cnpj) => setForm({ ...form, cnpj })}
            keyboardType="number-pad"
          />
          <TextField
            label="E-mail do primeiro administrador"
            icon={Mail}
            value={form.adminEmail}
            onChangeText={(adminEmail) => setForm({ ...form, adminEmail })}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            hint="Sem conta ainda? Entra como administrador no primeiro acesso (Google ou cadastro)."
          />
          <Button title="Criar empresa" onPress={() => create.mutate()} loading={create.isPending} disabled={!form.name.trim()} />
        </Card>
      </Screen>
    </>
  );
}
