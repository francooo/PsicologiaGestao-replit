import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, FileText, ImagePlus, Trash2 } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { CompanyLogo } from '@/components/company/CompanyLogo';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { appendFile, pickImage } from '@/utils/files';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type CurrentCompany = { id: number; name: string; slug: string; cnpj: string | null; logoUrl: string | null };

const KEY = ['/api/companies/current'];

/** Configurações → Clínica (admin of the active company): name, CNPJ and logo. Same API as the web card. */
export function CompanyCard() {
  const company = useQuery({ queryKey: KEY, queryFn: () => api<CurrentCompany>('/api/companies/current') });
  if (company.isLoading || !company.data) return <LoadingState />;
  // Re-created after a save, so the fields start from the saved values
  return <CompanyForm key={`${company.data.name}|${company.data.cnpj}|${company.data.logoUrl}`} company={company.data} />;
}

function CompanyForm({ company }: { company: CurrentCompany }) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [name, setName] = useState(company.name);
  const [cnpj, setCnpj] = useState(company.cnpj ?? '');

  // The active company's name/logo also live in /api/user (menu)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: KEY });
    refreshUser().catch(() => {});
  };

  const save = useMutation({
    mutationFn: () => api('/api/companies/current', { method: 'PATCH', body: { name, cnpj } }),
    onSuccess: () => {
      refresh();
      toast.success('Dados da empresa salvos');
    },
    onError: (e: Error) => toast.error('Não foi possível salvar', e.message),
  });

  const uploadLogo = useMutation({
    mutationFn: async () => {
      const image = await pickImage('library', { maxWidth: 600, quality: 0.85 });
      if (!image) return null;
      const form = new FormData();
      appendFile(form, 'logo', image);
      return api('/api/companies/current/logo', { method: 'POST', body: form });
    },
    onSuccess: (res) => {
      if (!res) return;
      refresh();
      toast.success('Logo atualizado');
    },
    onError: (e: Error) => toast.error('Não foi possível enviar o logo', e.message),
  });

  const removeLogo = useMutation({
    mutationFn: () => api('/api/companies/current/logo', { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      toast.success('Logo removido');
    },
    onError: (e: Error) => toast.error('Não foi possível remover o logo', e.message),
  });

  const changed = name.trim() !== company.name || cnpj.replace(/\D/g, '') !== (company.cnpj ?? '');

  return (
    <Card style={{ gap: 14 }}>
      <AppText tone="muted">Nome e logo aparecem no menu e nas páginas que os pacientes abrem.</AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CompanyLogo logoUrl={company.logoUrl} size={72} />
        <View style={{ flex: 1, gap: 8 }}>
          <Button
            title={company.logoUrl ? 'Trocar logo' : 'Enviar logo'}
            size="sm"
            variant="outline"
            icon={<ImagePlus size={16} color={colors.ink} />}
            loading={uploadLogo.isPending}
            disabled={removeLogo.isPending}
            onPress={() => uploadLogo.mutate()}
          />
          {company.logoUrl && (
            <Button
              title="Remover logo"
              size="sm"
              variant="ghost"
              icon={<Trash2 size={16} color={colors.danger} />}
              loading={removeLogo.isPending}
              disabled={uploadLogo.isPending}
              onPress={() => removeLogo.mutate()}
            />
          )}
        </View>
      </View>
      <TextField label="Nome da clínica" icon={Building2} value={name} onChangeText={setName} />
      <TextField label="CNPJ" icon={FileText} value={cnpj} onChangeText={setCnpj} keyboardType="number-pad" />
      {company.name === 'Empresa 1' && (
        <AppText variant="caption" tone="muted">
          Esta clínica ainda está com o nome padrão. Troque pelo nome real para ele aparecer no menu.
        </AppText>
      )}
      <Button title="Salvar dados" onPress={() => save.mutate()} loading={save.isPending} disabled={!changed || !name.trim()} />
    </Card>
  );
}
