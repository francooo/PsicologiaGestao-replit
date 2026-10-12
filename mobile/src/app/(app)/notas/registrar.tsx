import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, FileText, FolderOpen, Sparkles } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { api } from '@/api/client';
import { useAuth } from '@/auth/AuthProvider';
import { pickDocument, pickImage, readBase64, type LocalFile } from '@/utils/files';
import { formatDate, formatMoney } from '@/utils/format';
import { confidenceBadge } from '@/utils/invoice';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';
import type { AiExtraction } from '@/types/invoice';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
// Server limit is 4MB of file data; base64 inflates ~33%, Vercel caps the request at ~4.5MB
const MAX_BYTES = 3 * 1024 * 1024;

type Step = 1 | 2 | 3;

export default function RegisterInvoiceScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<LocalFile | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [ai, setAi] = useState<{ data: AiExtraction; score: number } | null>(null);
  const [reviewed, setReviewed] = useState(false);

  const choose = async (source: 'camera' | 'library' | 'document') => {
    const picked =
      source === 'document' ? await pickDocument(ACCEPTED, true) : await pickImage(source, { base64: true, maxWidth: 2000, quality: 0.75 });
    if (!picked) return;
    if (!ACCEPTED.includes(picked.type)) {
      toast.error('Formato inválido', 'Use PDF, JPEG, PNG ou WebP.');
      return;
    }
    const b64 = picked.base64 ?? (await readBase64(picked.uri));
    if (b64.length * 0.75 > MAX_BYTES) {
      toast.error('Arquivo grande', 'Máximo 3MB. Para fotos, tente novamente com a câmera do app.');
      return;
    }
    setFile(picked);
    setBase64(b64);
    setAi(null);
  };

  const analyze = useMutation({
    mutationFn: () =>
      api<{ data: AiExtraction; ai_confidence_score: number }>('/api/invoices/analyze-image', {
        method: 'POST',
        body: {
          image: base64,
          image_type: file!.type,
          psychologist_profile: { nome: user?.fullName, email: user?.email },
        },
      }),
    onSuccess: (res) => {
      setAi({ data: res.data, score: res.ai_confidence_score });
      setStep(2);
    },
    onError: (e: Error) => toast.error('Erro na análise', e.message),
  });

  const v = (key: string) => ai?.data[key]?.valor;
  const str = (key: string) => {
    const x = v(key);
    return x === null || x === undefined || x === '' ? '' : String(x);
  };
  const num = (key: string) => {
    const x = v(key);
    const n = x === null || x === undefined || x === '' ? NaN : Number(x);
    return Number.isFinite(n) ? n : null;
  };
  const lowConfidence = !!ai && Object.values(ai.data).some((f) => f && f.confianca > 0 && f.confianca < 0.6);

  const save = useMutation({
    mutationFn: () =>
      api('/api/invoices', {
        method: 'POST',
        body: {
          image: base64,
          image_type: file!.type,
          chave_nfe: str('chave_nfe'),
          numero_nota: str('numero_nota'),
          serie: str('serie'),
          data_emissao: str('data_emissao'),
          emitente_nome: str('emitente_nome') || user?.fullName,
          emitente_cnpj_cpf: str('emitente_cnpj_cpf'),
          emitente_crp: str('emitente_crp'),
          emitente_endereco: str('emitente_endereco'),
          emitente_municipio: str('emitente_municipio'),
          emitente_uf: str('emitente_uf'),
          emitente_cep: str('emitente_cep'),
          emitente_telefone: str('emitente_telefone'),
          emitente_email: str('emitente_email') || user?.email,
          tomador_nome: str('tomador_nome'),
          tomador_cpf_cnpj: str('tomador_cpf_cnpj'),
          tomador_endereco: str('tomador_endereco'),
          tomador_municipio: str('tomador_municipio'),
          tomador_uf: str('tomador_uf'),
          tomador_cep: str('tomador_cep'),
          tomador_email: str('tomador_email'),
          descricao_servico: str('descricao_servico'),
          codigo_servico: str('codigo_servico') || '8.02',
          codigo_cnae: str('codigo_cnae'),
          iss_retido: v('iss_retido') === true,
          aliquota_iss: num('aliquota_iss'),
          valor_servicos: num('valor_servicos'),
          valor_deducoes: num('valor_deducoes') ?? 0,
          base_calculo: num('base_calculo'),
          valor_iss: num('valor_iss'),
          valor_pis: num('valor_pis'),
          valor_cofins: num('valor_cofins'),
          valor_inss: num('valor_inss'),
          valor_ir: num('valor_ir'),
          valor_csll: num('valor_csll'),
          valor_liquido: num('valor_liquido') ?? num('valor_servicos'),
          ai_raw_response: ai?.data,
          ai_confidence_score: ai?.score,
          ai_extracted_at: new Date().toISOString(),
          revisado_pela_psicologa: true,
          status: 'ativa',
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/summary'] });
      toast.success('Nota fiscal registrada com sucesso.');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao salvar', e.message),
  });

  const renderField = (label: string, k: string, money?: boolean) => {
    const c = confidenceBadge(ai?.data[k]?.confianca);
    const raw = str(k);
    const shown = !raw ? '—' : money ? formatMoney(raw) : k === 'data_emissao' ? formatDate(raw) : raw;
    return (
      <View key={k} style={styles.field}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="caption" tone="muted">
            {label}
          </AppText>
          <Badge label={c.label} tone={c.tone} />
        </View>
        <AppText>{shown}</AppText>
      </View>
    );
  };

  const ReviewCheck = (
    <Pressable style={styles.check} onPress={() => setReviewed((r) => !r)} accessibilityRole="checkbox" accessibilityState={{ checked: reviewed }}>
      <Switch value={reviewed} onValueChange={setReviewed} trackColor={{ true: colors.primary, false: colors.border }} />
      <AppText style={{ flex: 1 }}>Revisei os dados acima e confirmo que estão corretos.</AppText>
    </Pressable>
  );

  const footer =
    step === 1 ? (
      <Button
        title="Analisar com IA"
        icon={<Sparkles size={18} color={colors.onPrimary} />}
        disabled={!file}
        loading={analyze.isPending}
        onPress={() => analyze.mutate()}
      />
    ) : step === 2 ? (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Voltar" variant="outline" style={{ flex: 1 }} onPress={() => setStep(1)} />
        <Button title="Continuar" style={{ flex: 1 }} disabled={lowConfidence && !reviewed} onPress={() => setStep(3)} />
      </View>
    ) : (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Voltar" variant="outline" style={{ flex: 1 }} onPress={() => setStep(2)} />
        <Button title="Salvar nota" style={{ flex: 1 }} disabled={!reviewed} loading={save.isPending} onPress={() => save.mutate()} />
      </View>
    );

  return (
    <>
      <Stack.Screen options={{ title: 'Registrar nota fiscal' }} />
      <Screen footer={footer}>
        <View style={styles.steps}>
          {['Upload', 'Revisão', 'Confirmar'].map((label, i) => (
            <Badge key={label} label={`${i + 1}. ${label}`} tone={step === i + 1 ? 'primary' : 'neutral'} />
          ))}
        </View>

        {step === 1 && (
          <Card style={{ gap: 14 }}>
            <AppText tone="muted">
              Fotografe a nota ou selecione um PDF, JPEG, PNG ou WebP. Para PDF, o texto é extraído automaticamente; para
              imagens, é usada visão computacional.
            </AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Câmera" variant="outline" style={{ flex: 1 }} icon={<Camera size={18} color={colors.ink} />} onPress={() => choose('camera')} />
              <Button title="Galeria" variant="outline" style={{ flex: 1 }} icon={<FolderOpen size={18} color={colors.ink} />} onPress={() => choose('library')} />
            </View>
            <Button title="Selecionar PDF" variant="outline" icon={<FileText size={18} color={colors.ink} />} onPress={() => choose('document')} />
            {file && (
              <View style={styles.fileBox}>
                <FileText size={18} color={colors.primary} />
                <AppText style={{ flex: 1 }} numberOfLines={1}>
                  {file.name}
                </AppText>
              </View>
            )}
            {analyze.isPending && (
              <AppText tone="primary" center>
                A IA está lendo sua nota...
              </AppText>
            )}
          </Card>
        )}

        {step === 2 && ai && (
          <>
            {typeof v('emitente_divergencias') === 'string' && (
              <View style={styles.warn}>
                <AlertTriangle size={18} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <AppText weight="semibold">Divergência nos dados do emitente</AppText>
                  <AppText variant="caption">{String(v('emitente_divergencias'))}</AppText>
                </View>
              </View>
            )}
            <Card>
              {renderField('Chave NF-e', 'chave_nfe')}
              {renderField('Número', 'numero_nota')}
              {renderField('Série', 'serie')}
              {renderField('Data de emissão', 'data_emissao')}
            </Card>
            <Card>
              <AppText variant="overline" tone="subtle">
                Emitente (pré-preenchido com seu perfil)
              </AppText>
              <View style={styles.field}>
                <AppText variant="caption" tone="muted">
                  Nome
                </AppText>
                <AppText>{str('emitente_nome') || user?.fullName}</AppText>
              </View>
              <View style={styles.field}>
                <AppText variant="caption" tone="muted">
                  E-mail
                </AppText>
                <AppText>{str('emitente_email') || user?.email}</AppText>
              </View>
            </Card>
            <Card>
              <AppText variant="overline" tone="subtle">
                Tomador
              </AppText>
              {renderField('Tomador (paciente / responsável)', 'tomador_nome')}
              {renderField('CPF/CNPJ tomador', 'tomador_cpf_cnpj')}
            </Card>
            <Card>
              {renderField('Descrição do serviço', 'descricao_servico')}
              {renderField('Valor dos serviços', 'valor_servicos', true)}
              {renderField('Valor líquido', 'valor_liquido', true)}
            </Card>
            {lowConfidence && (
              <AppText variant="caption" style={{ color: colors.warning }}>
                Alguns campos tiveram baixa confiança na leitura. Revise e marque a confirmação.
              </AppText>
            )}
            {ReviewCheck}
          </>
        )}

        {step === 3 && ai && (
          <>
            <Card style={{ gap: 8 }}>
              <AppText>
                <AppText weight="semibold">Chave NF-e: </AppText>
                {str('chave_nfe') || '—'}
              </AppText>
              <AppText>
                <AppText weight="semibold">Tomador: </AppText>
                {str('tomador_nome') || '—'}
              </AppText>
              <AppText>
                <AppText weight="semibold">Data de emissão: </AppText>
                {str('data_emissao') ? formatDate(str('data_emissao')) : '—'}
              </AppText>
              <AppText>
                <AppText weight="semibold">Valor líquido: </AppText>
                {formatMoney(num('valor_liquido') ?? num('valor_servicos') ?? 0)}
              </AppText>
            </Card>
            {ReviewCheck}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  field: { paddingVertical: 8, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  fileBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  warn: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
