import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Camera, Download, FileImage, FileText, FolderOpen, Sparkles, Trash2, Upload } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { patientKeys, useDocuments } from '@/api/patients';
import { confirm } from '@/utils/confirm';
import { appendFile, downloadAndShare, MAX_UPLOAD_BYTES, pickDocument, pickImage, type LocalFile } from '@/utils/files';
import { formatDate } from '@/utils/format';
import { documentTypes } from '@/utils/patient';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';
import type { PatientDocument } from '@/types/patient';

const ACCEPTED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const FALLBACK_TITLES = ['Resumo objetivo', 'Pontos de atenção clínica', 'Insights terapêuticos', 'Sugestões de follow-up'];

/** Splits the AI summary into titled sections (same parsing rules as AISummaryModal). */
function parseSummary(summary: string) {
  const numbered = [...summary.matchAll(/(?:^|\n)\s*\d+\.\s+\*\*([^*]+)\*\*/g)];
  if (numbered.length >= 2) {
    return numbered.map((m, i) => {
      const start = (m.index ?? 0) + m[0].length;
      const end = i + 1 < numbered.length ? numbered[i + 1].index : summary.length;
      return { title: m[1].trim().replace(/:$/, ''), content: summary.slice(start, end).replace(/^[:\s]+/, '').trim() };
    });
  }
  const found = FALLBACK_TITLES.map((t) => ({ t, i: summary.toLowerCase().indexOf(t.toLowerCase()) })).filter((x) => x.i >= 0);
  if (found.length < 2) return null;
  found.sort((a, b) => a.i - b.i);
  return found.map((f, k) => ({
    title: f.t,
    content: summary
      .slice(f.i + f.t.length, k + 1 < found.length ? found[k + 1].i : summary.length)
      .replace(/^[\s:*#-]+/, '')
      .trim(),
  }));
}

export function DocumentsTab({ patientId }: { patientId: number }) {
  const queryClient = useQueryClient();
  const { data = [], isLoading, error, refetch } = useDocuments(patientId);
  const [filter, setFilter] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<LocalFile | null>(null);
  const [docType, setDocType] = useState('other');
  const [docName, setDocName] = useState('');
  const [summary, setSummary] = useState<{ doc: PatientDocument; text?: string; error?: string } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: patientKeys.documents(patientId) });
    queryClient.invalidateQueries({ queryKey: patientKeys.counts(patientId) });
  };

  const upload = useMutation({
    mutationFn: () => {
      const form = new FormData();
      appendFile(form, 'file', file!);
      form.append('documentType', docType);
      form.append('documentName', docName.trim() || file!.name.replace(/\.[^.]+$/, ''));
      return api<PatientDocument>(`/api/patients/${patientId}/documents`, { method: 'POST', body: form });
    },
    onSuccess: (doc) => {
      invalidate();
      toast.success('Upload concluído', `"${doc.documentName}" adicionado com sucesso.`);
      setUploadOpen(false);
      setFile(null);
      setDocName('');
      setDocType('other');
    },
    onError: (e: Error) => toast.error('Erro no upload', e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/patients/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      toast.success('Documento removido');
    },
    onError: (e: Error) => toast.error('Erro ao excluir', e.message),
  });

  const summarize = useMutation({
    mutationFn: (doc: PatientDocument) =>
      api<{ summary: string }>(`/api/patients/documents/${doc.id}/summarize`, { method: 'POST' }),
    onSuccess: (res, doc) => setSummary({ doc, text: res.summary }),
    onError: (e: Error, doc) => setSummary({ doc, error: e.message || 'Erro ao conectar com a IA. Tente novamente.' }),
  });

  const choose = async (source: 'document' | 'camera') => {
    const picked = source === 'camera' ? await pickImage('camera') : await pickDocument(ACCEPTED);
    if (!picked) return;
    if (picked.size && picked.size > MAX_UPLOAD_BYTES) {
      toast.error('Arquivo muito grande', 'O tamanho máximo permitido é 4MB.');
      return;
    }
    setFile(picked);
    if (!docName) setDocName(picked.name.replace(/\.[^.]+$/, ''));
  };

  const onDownload = async (doc: PatientDocument) => {
    try {
      const ext = doc.mimeType.includes('pdf') ? '.pdf' : '';
      const name = /\.[a-z0-9]+$/i.test(doc.documentName) ? doc.documentName : `${doc.documentName}${ext}`;
      await downloadAndShare(`/api/patients/documents/${doc.id}/download`, name, doc.mimeType);
    } catch (e: any) {
      toast.error('Erro ao baixar', e?.message);
    }
  };

  const onDelete = async (doc: PatientDocument) => {
    const ok = await confirm({
      title: 'Excluir documento?',
      message: 'Esta ação não pode ser desfeita. O arquivo será removido permanentemente.',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (ok) remove.mutate(doc.id);
  };

  const list = data.filter((d) => filter === 'all' || d.documentType === filter);
  const sections = summary?.text ? parseSummary(summary.text) : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <SelectField
            value={filter}
            options={[{ label: 'Todos os tipos', value: 'all' }, ...documentTypes]}
            onChange={setFilter}
          />
        </View>
        <Button
          title="Enviar"
          fullWidth={false}
          icon={<Upload size={18} color={colors.onPrimary} />}
          onPress={() => setUploadOpen(true)}
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nenhum documento encontrado"
          description={filter === 'all' ? 'Faça upload de um documento para começar' : 'Nenhum documento deste tipo'}
          icon={FolderOpen}
          actionLabel="Fazer upload"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        list.map((d) => {
          const t = documentTypes.find((x) => x.value === d.documentType);
          const Icon = d.mimeType.startsWith('image/') ? FileImage : FileText;
          return (
            <Card key={d.id} style={{ gap: 10 }}>
              <View style={styles.docHead}>
                <View style={styles.docIcon}>
                  <Icon size={20} color={d.mimeType.includes('pdf') ? colors.danger : colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <AppText weight="medium" numberOfLines={2}>
                    {d.documentName}
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Badge label={t?.label ?? d.documentType} tone={t?.tone ?? 'neutral'} />
                    <AppText variant="caption" tone="subtle">
                      {formatDate(d.createdAt)}
                    </AppText>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <Button
                  title="Resumir com IA"
                  size="sm"
                  variant="secondary"
                  fullWidth={false}
                  icon={<Sparkles size={16} color={colors.primary} />}
                  loading={summarize.isPending && summarize.variables?.id === d.id}
                  onPress={() => {
                    setSummary({ doc: d });
                    summarize.mutate(d);
                  }}
                />
                <View style={{ flexDirection: 'row' }}>
                  <IconButton icon={Download} label="Baixar documento" onPress={() => onDownload(d)} />
                  <IconButton icon={Trash2} tone="danger" label="Excluir documento" onPress={() => onDelete(d)} />
                </View>
              </View>
            </Card>
          );
        })
      )}

      <Sheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Adicionar documento"
        footer={
          <Button title="Enviar documento" disabled={!file} loading={upload.isPending} onPress={() => upload.mutate()} />
        }>
        <AppText tone="muted">Selecione o arquivo, defina o tipo e o nome antes de enviar.</AppText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Escolher arquivo"
            variant="outline"
            style={{ flex: 1 }}
            icon={<FolderOpen size={18} color={colors.ink} />}
            onPress={() => choose('document')}
          />
          <Button
            title="Câmera"
            variant="outline"
            fullWidth={false}
            icon={<Camera size={18} color={colors.ink} />}
            onPress={() => choose('camera')}
          />
        </View>
        {file ? (
          <Pressable style={styles.fileBox} onPress={() => choose('document')}>
            <FileText size={18} color={colors.primary} />
            <AppText style={{ flex: 1 }} numberOfLines={1}>
              {file.name}
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="caption" tone="subtle">
            Limite: 4MB. Formatos aceitos: PDF, imagens, Word, Excel.
          </AppText>
        )}
        <SelectField label="Tipo de documento *" value={docType} options={documentTypes} onChange={setDocType} />
        <TextField
          label="Nome do documento (opcional)"
          placeholder="Ex.: Termo assinado – Janeiro 2025"
          hint="Deixe em branco para usar o nome do arquivo."
          value={docName}
          onChangeText={setDocName}
        />
      </Sheet>

      <Sheet
        visible={!!summary}
        onClose={() => setSummary(null)}
        title={summary ? `Resumo IA — ${summary.doc.documentName}` : undefined}
        footer={
          summary?.text ? (
            <Button
              title="Copiar resumo"
              variant="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(summary.text!);
                toast.success('Copiado!', 'Resumo copiado para a área de transferência.');
              }}
            />
          ) : undefined
        }>
        {summary && !summary.text && !summary.error && <LoadingState label="A IA está lendo o documento..." />}
        {summary?.error && (
          <View style={styles.errorBox}>
            <AppText tone="danger">{summary.error}</AppText>
          </View>
        )}
        {summary?.text &&
          (sections ? (
            sections.map((s, i) => (
              <View key={i} style={{ gap: 4 }}>
                <AppText weight="semibold">
                  {i + 1}. {s.title}
                </AppText>
                <AppText tone={s.content ? 'default' : 'subtle'}>{s.content || 'Sem informações disponíveis.'}</AppText>
              </View>
            ))
          ) : (
            <AppText>{summary.text}</AppText>
          ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  docHead: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: 12 },
});
