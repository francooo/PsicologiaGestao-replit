import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Trash2, XCircle } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoRow } from '@/components/ui/InfoRow';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { api, apiUrl, authHeaders } from '@/api/client';
import { confirm } from '@/utils/confirm';
import { downloadAndShare } from '@/utils/files';
import { formatDate } from '@/utils/format';
import { invoiceFileName, invoiceStatusInfo, moneyOrDash } from '@/utils/invoice';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { Invoice } from '@/types/invoice';

type Tab = 'dados' | 'imagem';

function Section({ title, rows }: { title: string; rows: [string, string | null | undefined][] }) {
  const visible = rows.filter(([, v]) => v && v !== '—');
  if (!visible.length) return null;
  return (
    <Card>
      <AppText variant="overline" tone="subtle">
        {title}
      </AppText>
      {visible.map(([label, value], i) => (
        <InfoRow key={label} label={label} value={value} last={i === visible.length - 1} />
      ))}
    </Card>
  );
}

export default function InvoiceDetailScreen() {
  const { id, admin } = useLocalSearchParams<{ id: string; admin?: string }>();
  const isAdmin = admin === '1';
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('dados');
  const [imageFailed, setImageFailed] = useState(false);

  const { data: n, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/invoices', Number(id)],
    queryFn: () => api<Invoice>(`/api/invoices/${id}`),
  });

  const setStatus = useMutation({
    mutationFn: (status: string) => api(`/api/invoices/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      toast.success('Status atualizado.');
    },
    onError: (e: Error) => toast.error('Erro', e.message),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/invoices/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/summary'] });
      toast.success('Nota fiscal excluída com sucesso.');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao excluir', e.message),
  });

  if (isLoading) return <LoadingState />;
  if (error || !n) return <ErrorState message={error?.message} onRetry={refetch} />;

  const s = invoiceStatusInfo(n.status);
  const isPdf = n.imageMimeType === 'application/pdf';

  const download = async () => {
    try {
      await downloadAndShare(`/api/invoices/${n.id}/download`, invoiceFileName(n), n.imageMimeType ?? undefined);
    } catch (e: any) {
      toast.error('Erro ao baixar', e?.message);
    }
  };

  const cancel = async () => {
    const ok = await confirm({
      title: 'Cancelar nota fiscal?',
      message: 'Tem certeza que deseja cancelar esta nota fiscal?',
      confirmLabel: 'Cancelar nota',
      destructive: true,
    });
    if (ok) setStatus.mutate('cancelada', { onSuccess: () => router.back() });
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: 'Excluir nota fiscal?',
      message: 'Tem certeza que deseja excluir esta nota fiscal?',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (ok) remove.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ title: `Nota Nº ${n.numeroNota ?? n.id}` }} />
      <Screen
        footer={
          <View style={{ gap: 10 }}>
            <Button title="Baixar arquivo" variant="outline" icon={<Download size={18} color={colors.ink} />} onPress={download} />
            {!isAdmin && n.status !== 'cancelada' && (
              <Button title="Cancelar nota" variant="danger" icon={<XCircle size={18} color={colors.onPrimary} />} onPress={cancel} />
            )}
            {!isAdmin && (
              <Button
                title="Excluir nota"
                variant="ghost"
                icon={<Trash2 size={18} color={colors.danger} />}
                loading={remove.isPending}
                onPress={onDelete}
              />
            )}
          </View>
        }>
        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppText variant="heading" style={{ flex: 1 }}>
              Nota fiscal Nº {n.numeroNota ?? n.id}
              {n.serie ? ` · Série ${n.serie}` : ''}
            </AppText>
            <Badge label={s.label} tone={s.tone} />
          </View>
          <AppText variant="caption" tone="muted">
            Emissão: {formatDate(n.dataEmissao)}
            {n.dataUpload ? ` · Registrada em ${formatDate(new Date(n.dataUpload), 'dd/MM/yyyy HH:mm')}` : ''}
            {isAdmin && n.user?.fullName ? ` · ${n.user.fullName}` : ''}
          </AppText>
        </Card>

        {isAdmin && (
          <SelectField
            label="Status"
            value={n.status}
            options={[
              { label: 'Ativa', value: 'ativa' },
              { label: 'Pendente', value: 'pendente' },
              { label: 'Cancelada', value: 'cancelada' },
            ]}
            onChange={(v) => setStatus.mutate(v, { onSuccess: () => refetch() })}
          />
        )}

        <Segmented<Tab>
          segments={[
            { label: 'Dados da nota', value: 'dados' },
            { label: 'Imagem original', value: 'imagem' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'dados' ? (
          <>
            <Section
              title="Identificação"
              rows={[
                ['Chave NF-e', n.chaveNfe],
                ['Número', n.numeroNota],
                ['Série', n.serie],
                ['Data de emissão', n.dataEmissao ? formatDate(n.dataEmissao) : null],
                ['Cód. verificação', n.codigoVerificacao],
                ['Protocolo', n.protocoloAutorizacao],
              ]}
            />
            <Section
              title="Emitente (prestador)"
              rows={[
                ['Nome', n.emitenteNome],
                ['CPF/CNPJ', n.emitenteCnpjCpf],
                ['CRP', n.emitenteCrp],
                ['Endereço', n.emitenteEndereco],
                ['Bairro', n.emitenteBairro],
                ['Município', n.emitenteMunicipio],
                ['UF', n.emitenteUf],
                ['CEP', n.emitenteCep],
                ['Telefone', n.emitenteTelefone],
                ['E-mail', n.emitenteEmail],
              ]}
            />
            <Section
              title="Tomador (cliente/paciente)"
              rows={[
                ['Nome', n.tomadorNome],
                ['CPF/CNPJ', n.tomadorCpfCnpj],
                ['Endereço', n.tomadorEndereco],
                ['Bairro', n.tomadorBairro],
                ['Município', n.tomadorMunicipio],
                ['UF', n.tomadorUf],
                ['CEP', n.tomadorCep],
                ['E-mail', n.tomadorEmail],
                ['Telefone', n.tomadorTelefone],
              ]}
            />
            <Section
              title="Serviço"
              rows={[
                ['Descrição', n.descricaoServico],
                ['Código serviço', n.codigoServico],
                ['CNAE', n.codigoCnae],
              ]}
            />
            <Section
              title="Tributos e valores"
              rows={[
                ['Valor serviços', moneyOrDash(n.valorServicos)],
                ['Deduções', moneyOrDash(n.valorDeducoes)],
                ['Base de cálculo', moneyOrDash(n.baseCalculo)],
                ['Valor ISS', moneyOrDash(n.valorIss)],
                ['PIS', moneyOrDash(n.valorPis)],
                ['COFINS', moneyOrDash(n.valorCofins)],
                ['INSS', moneyOrDash(n.valorInss)],
                ['IR', moneyOrDash(n.valorIr)],
                ['CSLL', moneyOrDash(n.valorCsll)],
                ['Valor líquido', moneyOrDash(n.valorLiquido)],
              ]}
            />
            <Section title="Observações" rows={[['Observações', n.observacoes]]} />
          </>
        ) : isPdf || imageFailed ? (
          <Card style={{ gap: 10, alignItems: 'center' }}>
            <AppText tone="muted" center>
              {isPdf ? 'O arquivo original é um PDF.' : 'Imagem não disponível.'} Use “Baixar arquivo” para abrir.
            </AppText>
          </Card>
        ) : (
          // The web only fetched the image when imagePath existed (base64 uploads never showed); always try here
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <Image
              source={{ uri: apiUrl(`/api/invoices/${n.id}/image`), headers: authHeaders() }}
              style={{ width: '100%', aspectRatio: 0.72 }}
              contentFit="contain"
              onError={() => setImageFailed(true)}
              accessibilityLabel="Imagem da nota fiscal"
            />
          </Card>
        )}
      </Screen>
    </>
  );
}
