import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Plus, Receipt, Search } from 'lucide-react-native';

import { SummaryCard, SummaryRow } from '@/components/finance/SummaryCard';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { usePsychologists } from '@/api/queries';
import { downloadAndShare, shareTextFile, toCsv } from '@/utils/files';
import { formatDate } from '@/utils/format';
import { invoiceStatusInfo, invoiceStatusOptions, moneyOrDash, shortKey } from '@/utils/invoice';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { Invoice, InvoiceSummary } from '@/types/invoice';

const PAGE = 20;

/** Shared by "Minhas notas" (/api/invoices) and admin "Gestão de notas" (/api/admin/invoices). */
export function InvoiceList({ admin }: { admin: boolean }) {
  const base = admin ? '/api/admin/invoices' : '/api/invoices';
  const psychologists = usePsychologists(admin);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [psychologist, setPsychologist] = useState<number>(0);
  const [page, setPage] = useState(0);

  const filters = {
    data_emissao_from: from || undefined,
    data_emissao_to: to || undefined,
    status: status === 'all' ? undefined : status,
    psychologist_id: admin && psychologist ? psychologist : undefined,
  };

  const list = useQuery({
    queryKey: [base, { ...filters, search, page }],
    queryFn: () =>
      api<{ invoices: Invoice[]; total: number }>(base, {
        query: { ...filters, search: search.trim() || undefined, limit: PAGE, offset: page * PAGE },
      }),
    placeholderData: keepPreviousData,
  });
  const summary = useQuery({
    queryKey: [`${base}/summary`, filters],
    queryFn: () => api<InvoiceSummary>(`${base}/summary`, { query: filters }),
  });

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  const exportCsv = async () => {
    try {
      if (admin) {
        // Server-side CSV (all pages), downloaded with the session token
        const qs = Object.entries(filters)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&');
        await downloadAndShare(`/api/admin/invoices/export${qs ? `?${qs}` : ''}`, 'notas-fiscais.csv', 'text/csv');
        return;
      }
      const rows = list.data?.invoices ?? [];
      if (!rows.length) return;
      await shareTextFile(
        'minhas-notas-fiscais.csv',
        toCsv([
          ['Chave NF-e', 'Número', 'Série', 'Data Emissão', 'Tomador', 'Valor Líquido', 'Status', 'Registrada em'],
          ...rows.map((n) => [
            n.chaveNfe,
            n.numeroNota,
            n.serie,
            n.dataEmissao,
            n.tomadorNome,
            n.valorLiquido,
            n.status,
            n.dataUpload ? formatDate(new Date(n.dataUpload), 'dd/MM/yyyy HH:mm') : '',
          ]),
        ]),
      );
    } catch (e: any) {
      toast.error('Erro ao exportar', e?.message);
    }
  };

  const total = list.data?.total ?? 0;
  const pages = Math.ceil(total / PAGE);
  const invoices = list.data?.invoices ?? [];

  return (
    <Screen
      refreshing={list.isRefetching}
      onRefresh={() => {
        list.refetch();
        summary.refetch();
      }}>
      {!admin && (
        <Button
          title="Registrar nota"
          icon={<Plus size={18} color={colors.onPrimary} />}
          onPress={() => router.push('/notas/registrar')}
        />
      )}

      <SummaryRow>
        <SummaryCard label="Total de notas" value={String(summary.data?.totalCount ?? '—')} color={colors.primary} />
        <SummaryCard
          label={admin ? 'Faturamento bruto' : 'Receita bruta'}
          value={parseFloat(summary.data?.sumValorServicos ?? '0')}
          color={colors.sageInk}
        />
        <SummaryCard
          label={admin ? 'Faturamento líquido' : 'Receita líquida'}
          value={parseFloat(summary.data?.sumValorLiquido ?? '0')}
          color={colors.success}
        />
      </SummaryRow>

      <Card style={{ gap: 12 }}>
        {admin && (
          <SelectField
            label="Psicóloga"
            value={psychologist}
            options={[
              { label: 'Todas as psicólogas', value: 0 },
              // The admin filter uses the psychologist's USER id
              ...(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `Psicóloga ${p.id}`, value: p.userId })),
            ]}
            onChange={resetPage(setPsychologist)}
          />
        )}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DateTimeField label="Emissão de" mode="date" value={from} onChange={resetPage(setFrom)} placeholder="Início" />
          <DateTimeField label="Até" mode="date" value={to} onChange={resetPage(setTo)} placeholder="Fim" />
        </View>
        <SelectField label="Status" value={status} options={invoiceStatusOptions} onChange={resetPage(setStatus)} />
        <TextField icon={Search} placeholder="Buscar paciente/tomador" value={search} onChangeText={resetPage(setSearch)} />
        {(from || to) && (
          <Button
            title="Limpar datas"
            variant="ghost"
            size="sm"
            onPress={() => {
              setFrom('');
              setTo('');
              setPage(0);
            }}
          />
        )}
        <Button
          title="Exportar CSV"
          variant="outline"
          disabled={!admin && !invoices.length}
          icon={<Download size={18} color={colors.ink} />}
          onPress={exportCsv}
        />
      </Card>

      {list.isLoading ? (
        <LoadingState />
      ) : list.error ? (
        <ErrorState message={list.error.message} onRetry={list.refetch} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title={admin ? 'Nenhuma nota fiscal encontrada.' : 'Nenhuma nota fiscal registrada.'}
          description={admin ? undefined : 'Toque em "Registrar nota" para começar.'}
          icon={Receipt}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {invoices.map((n) => {
            const s = invoiceStatusInfo(n.status);
            return (
              <Card
                key={n.id}
                style={{ gap: 6 }}
                onPress={() =>
                  router.push({ pathname: '/notas/[id]', params: { id: String(n.id), admin: admin ? '1' : '0' } })
                }
                accessibilityLabel={`Nota ${n.numeroNota ?? n.id}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText weight="semibold" style={{ flex: 1 }}>
                    Nº {n.numeroNota ?? '—'}
                    {n.serie ? ` / ${n.serie}` : ''}
                  </AppText>
                  <Badge label={s.label} tone={s.tone} />
                </View>
                {admin && n.user?.fullName && (
                  <AppText variant="caption" tone="primary">
                    {n.user.fullName}
                  </AppText>
                )}
                <AppText numberOfLines={1}>{n.tomadorNome ?? '—'}</AppText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <AppText variant="caption" tone="muted">
                    Emissão {formatDate(n.dataEmissao)} · {shortKey(n.chaveNfe)}
                  </AppText>
                  <AppText weight="semibold">{moneyOrDash(n.valorLiquido)}</AppText>
                </View>
              </Card>
            );
          })}
          {pages > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Button title="Anterior" variant="outline" size="sm" style={{ flex: 1 }} disabled={page === 0} onPress={() => setPage((p) => p - 1)} />
              <AppText variant="caption" tone="muted">
                {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} de {total}
              </AppText>
              <Button
                title="Próxima"
                variant="outline"
                size="sm"
                style={{ flex: 1 }}
                disabled={page + 1 >= pages}
                onPress={() => setPage((p) => p + 1)}
              />
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
