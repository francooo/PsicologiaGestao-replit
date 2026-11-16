import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { addMonths, format, parse, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, ExternalLink, ReceiptText, TriangleAlert, Undo2 } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Segmented, type Segment } from '@/components/ui/Segmented';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { usePsychologists } from '@/api/queries';
import {
  BLOCKING,
  ISSUE_TEXT,
  PSYCH_ISSUES,
  RECEITA_SAUDE_URL,
  useMarkReceipt,
  useReceipts,
  useUnmarkReceipt,
  type ReceiptIssue,
  type ReceiptItem,
} from '@/api/receipts';
import { useAuth } from '@/auth/AuthProvider';
import { formatCpf, formatDate, formatMoney, parseAmount } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

type Filter = 'pending' | 'issued' | 'issues' | 'all';
const FILTERS: Segment<Filter>[] = [
  { label: 'Pendentes', value: 'pending' },
  { label: 'Emitidas', value: 'issued' },
  { label: 'Com pendência', value: 'issues' },
  { label: 'Todas', value: 'all' },
];

const monthKey = (d: Date) => format(d, 'yyyy-MM');
const monthDate = (m: string) => parse(`${m}-01`, 'yyyy-MM-dd', new Date());
const amountText = (n: number) => n.toFixed(2).replace('.', ',');

function receiptText(i: ReceiptItem, amount: number) {
  const lines = [`Pagador: ${i.payer?.name ?? i.patientName} — CPF ${formatCpf(i.payer?.cpf) || 'não cadastrado'}`];
  if (i.payer?.isGuardian) {
    lines.push(`Beneficiário (paciente): ${i.beneficiary?.name} — CPF ${formatCpf(i.beneficiary?.cpf) || 'não cadastrado'}`);
  }
  lines.push(`Valor: R$ ${amountText(amount)}`, `Data do pagamento: ${formatDate(i.date)}`, 'Descrição: Sessão de psicoterapia');
  return lines.join('\n');
}

async function copy(text: string, what: string) {
  await Clipboard.setStringAsync(text);
  toast.success(`${what} copiado`);
}

/** Recibos (Receita Saúde): the month's completed sessions with the data to issue each receipt. */
export default function ReceiptsScreen() {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'receptionist';
  const [month, setMonth] = useState(() => monthKey(subMonths(new Date(), 1)));
  const [psychologistId, setPsychologistId] = useState<number>(0); // 0 = todas
  const [filter, setFilter] = useState<Filter>('pending');
  const [open, setOpen] = useState<ReceiptItem | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useReceipts(month, isStaff && psychologistId ? psychologistId : null);
  const { data: psychologists } = usePsychologists(isStaff);

  const items = useMemo(() => data?.items ?? [], [data]);
  const visible = useMemo(
    () =>
      items.filter((i) =>
        filter === 'pending' ? !i.receipt : filter === 'issued' ? !!i.receipt : filter === 'issues' ? !i.receipt && i.issues.length > 0 : true,
      ),
    [items, filter],
  );
  const psychMissing = useMemo(() => {
    const map = new Map<number, { id: number; name: string; issues: ReceiptIssue[] }>();
    for (const i of items) {
      const own = i.issues.filter((x) => PSYCH_ISSUES.includes(x));
      if (own.length && !map.has(i.psychologist.id)) map.set(i.psychologist.id, { id: i.psychologist.id, name: i.psychologist.name, issues: own });
    }
    return Array.from(map.values());
  }, [items]);

  const s = data?.summary;
  const shift = (n: number) => setMonth(monthKey(addMonths(monthDate(month), n)));

  return (
    <>
      <Stack.Screen options={{ title: 'Recibos' }} />
      <Screen refreshing={isRefetching} onRefresh={refetch}>
        <View style={styles.header}>
          <IconButton icon={ChevronLeft} label="Mês anterior" onPress={() => shift(-1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="subtitle" style={{ textTransform: 'capitalize' }}>
              {format(monthDate(month), "MMMM 'de' yyyy", { locale: ptBR })}
            </AppText>
            {s && (
              <AppText variant="caption" tone="muted">
                {s.issued} de {s.total} recibos emitidos · {formatMoney(s.issuedAmount)}
              </AppText>
            )}
          </View>
          <IconButton icon={ChevronRight} label="Próximo mês" onPress={() => shift(1)} />
        </View>

        <Card>
          <AppText variant="label" weight="semibold">
            O recibo é emitido no Receita Saúde
          </AppText>
          <AppText tone="muted" style={{ marginTop: 4, marginBottom: 12 }}>
            Abra o app Receita Federal (Receita Saúde) ou o e-CAC com sua conta gov.br, copie os dados de cada sessão daqui e,
            depois de emitir, marque como emitido.
          </AppText>
          <Button
            title="Abrir Receita Saúde"
            variant="outline"
            icon={<ExternalLink size={18} color={colors.primary} />}
            onPress={() => Linking.openURL(RECEITA_SAUDE_URL)}
          />
        </Card>

        {psychMissing.length > 0 && (
          <Card style={{ backgroundColor: colors.warningSoft }}>
            <AppText weight="semibold">Complete o perfil para emitir os recibos</AppText>
            {psychMissing.map((p) => (
              <AppText key={p.id} tone="muted" style={{ marginTop: 4 }}>
                {isStaff ? `${p.name}: ` : ''}
                {p.issues.map((x) => ISSUE_TEXT[x].replace('Psicóloga sem ', 'falta ')).join(', ')}
              </AppText>
            ))}
            <View style={{ marginTop: 12 }}>
              <Button
                title={isStaff ? 'Abrir cadastro da psicóloga' : 'Completar meu perfil'}
                variant="secondary"
                onPress={() =>
                  isStaff
                    ? router.push({ pathname: '/admin/psicologas/[id]', params: { id: psychMissing[0].id } })
                    : router.push('/perfil')
                }
              />
            </View>
          </Card>
        )}

        {isStaff && (
          <SelectField
            label="Psicóloga"
            value={psychologistId}
            onChange={setPsychologistId}
            options={[
              { label: 'Todas', value: 0 },
              ...(psychologists ?? []).map((p) => ({ label: p.user?.fullName ?? `#${p.id}`, value: p.id })),
            ]}
          />
        )}

        <Segmented segments={FILTERS} value={filter} onChange={setFilter} scrollable />

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title={items.length === 0 ? 'Nenhuma sessão concluída neste mês' : 'Nada neste filtro'}
            description={items.length === 0 ? 'Só entram as consultas marcadas como Concluído na agenda.' : undefined}
          />
        ) : (
          <Card padded={false}>
            {visible.map((item, i) => (
              <Row key={item.appointmentId} item={item} first={i === 0} showPsychologist={isStaff} onPress={() => setOpen(item)} />
            ))}
          </Card>
        )}
      </Screen>

      {open && <ReceiptSheet item={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Row({ item, first, showPsychologist, onPress }: { item: ReceiptItem; first: boolean; showPsychologist: boolean; onPress: () => void }) {
  const blocked = item.issues.some((x) => BLOCKING.includes(x));
  const amount = item.receipt?.amount ?? item.suggestedAmount;
  const detail = [formatDate(item.date, 'dd/MM'), item.startTime, showPsychologist ? item.psychologist.name : null, amount ? formatMoney(amount) : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Recibo de ${item.patientName}`}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={{ flex: 1 }}>
        <AppText weight="medium" numberOfLines={1}>
          {item.patientName}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      {item.receipt ? (
        <View style={styles.inline}>
          <CheckCircle2 size={16} color={colors.success} />
          <AppText variant="caption" tone="success">
            Emitido
          </AppText>
        </View>
      ) : blocked ? (
        <Badge label="Falta dado" tone="warning" />
      ) : (
        <Badge label="Pendente" tone="primary" />
      )}
    </Pressable>
  );
}

function ReceiptSheet({ item, onClose }: { item: ReceiptItem; onClose: () => void }) {
  const mark = useMarkReceipt();
  const unmark = useUnmarkReceipt();
  const [raw, setRaw] = useState(item.suggestedAmount ? amountText(item.suggestedAmount) : '');
  const amount = item.receipt ? item.receipt.amount : parseAmount(raw);
  const amountValid = Number.isFinite(amount) && amount > 0;
  const rowIssues = item.issues.filter((x) => !PSYCH_ISSUES.includes(x));
  const blocked = item.issues.some((x) => BLOCKING.includes(x));

  const onMark = () =>
    mark.mutate(
      { appointmentId: item.appointmentId, amount },
      {
        onSuccess: () => {
          toast.success('Recibo marcado como emitido');
          onClose();
        },
        onError: (e: Error) => toast.error('Não foi possível marcar', e.message),
      },
    );
  const onUnmark = () =>
    unmark.mutate(item.appointmentId, {
      onSuccess: () => {
        toast.success('Marcação desfeita');
        onClose();
      },
      onError: (e: Error) => toast.error('Não foi possível desfazer', e.message),
    });

  return (
    <Sheet
      visible
      onClose={onClose}
      title={item.patientName}
      footer={
        item.receipt ? (
          <Button title="Desfazer marcação" variant="outline" icon={<Undo2 size={18} color={colors.primary} />} loading={unmark.isPending} onPress={onUnmark} />
        ) : (
          <Button
            title="Marcar como emitido"
            icon={<CheckCircle2 size={18} color={colors.onPrimary} />}
            disabled={blocked || !amountValid}
            loading={mark.isPending}
            onPress={onMark}
          />
        )
      }>
      <View style={{ gap: 14 }}>
        <AppText tone="muted">
          Sessão de {formatDate(item.date)} às {item.startTime}
        </AppText>

        {item.receipt && (
          <View style={[styles.inline, styles.issued]}>
            <CheckCircle2 size={18} color={colors.success} />
            <AppText tone="success" weight="medium">
              Emitido em {formatDate(item.receipt.issuedAt.slice(0, 10))} · {formatMoney(item.receipt.amount)}
            </AppText>
          </View>
        )}

        {rowIssues.length > 0 && !item.receipt && (
          <View style={styles.warning}>
            <View style={styles.inline}>
              <TriangleAlert size={16} color={colors.warning} />
              <AppText weight="medium" style={{ flex: 1 }}>
                {rowIssues.map((x) => ISSUE_TEXT[x]).join(' · ')}
              </AppText>
            </View>
            {item.patientId && (
              <Button
                title="Abrir cadastro do paciente"
                variant="ghost"
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/pacientes/[id]/editar', params: { id: item.patientId! } });
                }}
              />
            )}
          </View>
        )}

        {item.payer && (
          <CopyLine
            label={item.payer.isGuardian ? `Pagador (responsável): ${item.payer.name}` : `Pagador: ${item.payer.name}`}
            value={formatCpf(item.receipt?.payerCpf ?? item.payer.cpf)}
            copyValue={(item.receipt?.payerCpf ?? item.payer.cpf ?? '').replace(/\D/g, '')}
            what="CPF"
          />
        )}
        {item.payer?.isGuardian && (
          <CopyLine
            label={`Beneficiário (paciente): ${item.beneficiary?.name ?? ''}`}
            value={formatCpf(item.beneficiary?.cpf)}
            copyValue={(item.beneficiary?.cpf ?? '').replace(/\D/g, '')}
            what="CPF"
          />
        )}

        {item.receipt ? (
          <CopyLine label="Valor" value={formatMoney(item.receipt.amount)} copyValue={amountText(item.receipt.amount)} what="Valor" />
        ) : (
          <View style={styles.inline}>
            <TextField label="Valor da sessão (R$)" keyboardType="decimal-pad" value={raw} onChangeText={setRaw} containerStyle={{ flex: 1 }} />
            <IconButton icon={Copy} label="Copiar valor" onPress={() => amountValid && copy(amountText(amount), 'Valor')} />
          </View>
        )}

        <Button
          title="Copiar todos os dados"
          variant="secondary"
          icon={<Copy size={18} color={colors.primary} />}
          disabled={!item.payer}
          onPress={() => copy(receiptText(item, amountValid ? amount : 0), 'Dados do recibo')}
        />
      </View>
    </Sheet>
  );
}

function CopyLine({ label, value, copyValue, what }: { label: string; value: string; copyValue: string; what: string }) {
  return (
    <View style={styles.inline}>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText weight="semibold">{value || '—'}</AppText>
      </View>
      {!!copyValue && <IconButton icon={Copy} label={`Copiar ${what}`} onPress={() => copy(copyValue, what)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  issued: { backgroundColor: colors.successSoft, borderRadius: 12, padding: 12 },
  warning: { backgroundColor: colors.warningSoft, borderRadius: 12, padding: 12, gap: 8 },
});
