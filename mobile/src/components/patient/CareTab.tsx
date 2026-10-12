import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Eye, Link2, Mail, Pencil, RotateCcw, Send } from 'lucide-react-native';

import { newQuestion, QuestionList, toPayload, type DraftQuestion } from './QuestionEditor';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectField } from '@/components/ui/SelectField';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { patientKeys, useCareTemplates, useDispatches } from '@/api/patients';
import { WEB_URL } from '@/config';
import { firstName, formatDate } from '@/utils/format';
import { dispatchStatus, isValidEmail } from '@/utils/patient';
import { toast } from '@/utils/toast';
import { colors, radius } from '@/theme/tokens';
import type { CareDispatch, CareResponseItem, PatientDetail } from '@/types/patient';

const NEW_TEMPLATE = -1;

function substitute(text: string, p: PatientDetail) {
  return text.replaceAll('{patient_name}', firstName(p.fullName)).replaceAll('{patient_full_name}', p.fullName);
}

export function CareTab({ patient, onEditProfile }: { patient: PatientDetail; onEditProfile: () => void }) {
  const queryClient = useQueryClient();
  const templates = useCareTemplates();
  const dispatches = useDispatches(patient.id);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [viewing, setViewing] = useState<CareDispatch | null>(null);

  const emailOk = isValidEmail(patient.email);
  const name = firstName(patient.fullName);
  const selected = templates.data?.find((t) => t.id === templateId);

  const pickTemplate = (id: number) => {
    if (id === NEW_TEMPLATE) {
      router.push('/cuidados/template');
      return;
    }
    const t = templates.data?.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSubject(`${t.title} — ${name}`);
    setQuestions(
      [...t.questions]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((q) => newQuestion({ ...q, questionText: substitute(q.questionText, patient) })),
    );
  };

  const send = useMutation({
    mutationFn: () =>
      api<{ success: boolean; responseUrl?: string; warning?: string }>(`/api/care/patients/${patient.id}/dispatch`, {
        method: 'POST',
        body: {
          template_id: templateId,
          subject: subject.trim() || undefined,
          custom_message: message.trim() || undefined,
          override_questions: toPayload(questions).filter((q) => q.questionText),
        },
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.dispatches(patient.id) });
      if (res.warning) toast.info('Formulário salvo', res.warning);
      else toast.success('Formulário enviado!', `E-mail enviado para ${patient.email}`);
      setTemplateId(null);
      setSubject('');
      setMessage('');
      setQuestions([]);
    },
    onError: (e: Error) => toast.error('Erro ao enviar', e.message),
  });

  const copyLink = async (d: CareDispatch) => {
    const url = `${WEB_URL}/responder/${d.responseToken}`;
    await Clipboard.setStringAsync(url);
    toast.success('Link copiado!', url);
  };

  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 14 }}>
        <AppText variant="subtitle">Enviar formulário</AppText>
        {emailOk ? (
          <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
            <CheckCircle2 size={18} color={colors.success} />
            <AppText variant="caption" style={{ flex: 1 }}>
              E-mail válido: {patient.email}
            </AppText>
          </View>
        ) : (
          <Pressable style={[styles.banner, { backgroundColor: colors.warningSoft }]} onPress={onEditProfile}>
            <Mail size={18} color={colors.warning} />
            <AppText variant="caption" style={{ flex: 1 }}>
              Paciente sem e-mail válido. Toque para ver o perfil.
            </AppText>
          </Pressable>
        )}

        {templates.isLoading ? (
          <LoadingState label="Carregando templates..." />
        ) : templates.error ? (
          <ErrorState message={templates.error.message} onRetry={templates.refetch} />
        ) : (
          <SelectField
            label="Template *"
            placeholder="Selecione um template"
            value={templateId}
            options={[
              ...(templates.data ?? []).map((t) => ({ label: t.isDefault ? `${t.title} (padrão)` : t.title, value: t.id })),
              { label: 'Criar novo template…', value: NEW_TEMPLATE },
            ]}
            onChange={pickTemplate}
          />
        )}

        {selected && selected.psychologistId !== null && (
          <Button
            title="Editar template"
            size="sm"
            variant="ghost"
            fullWidth={false}
            icon={<Pencil size={16} color={colors.primary} />}
            onPress={() => router.push({ pathname: '/cuidados/template', params: { id: String(selected.id) } })}
          />
        )}

        {templateId && (
          <>
            <AppText variant="label">Perguntas — edite antes de enviar:</AppText>
            <QuestionList value={questions} onChange={setQuestions} />
          </>
        )}

        <TextField label="Assunto do e-mail" placeholder={`Check-in — ${name}`} value={subject} onChangeText={setSubject} />
        <TextField
          label="Mensagem personalizada (opcional)"
          multiline
          placeholder="Uma mensagem curta que aparece no início do formulário…"
          value={message}
          onChangeText={setMessage}
        />
        <Button
          title={`Enviar formulário para ${name}`}
          icon={<Send size={18} color={colors.onPrimary} />}
          disabled={!templateId || !emailOk}
          loading={send.isPending}
          onPress={() => send.mutate()}
        />
        {!emailOk && (
          <AppText variant="caption" tone="subtle">
            Adicione um e-mail válido ao perfil do paciente antes de enviar.
          </AppText>
        )}
      </Card>

      <AppText variant="subtitle">Histórico de envios</AppText>
      {dispatches.isLoading ? (
        <LoadingState />
      ) : dispatches.error ? (
        <ErrorState message={dispatches.error.message} onRetry={dispatches.refetch} />
      ) : (dispatches.data ?? []).length === 0 ? (
        <EmptyState title="Nenhum formulário enviado ainda." icon={Send} />
      ) : (
        dispatches.data!.map((d) => {
          const s = dispatchStatus[d.status] ?? { label: d.status, tone: 'neutral' as const };
          return (
            <Card key={d.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge label={s.label} tone={s.tone} />
                <AppText weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                  {d.subject}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                {formatDate(d.sentAt, 'dd MMM yyyy')} · {d.sentToEmail}
                {d.responseCount ? ` · ${d.responseCount} resp.` : ''}
              </AppText>
              <View style={styles.dispatchActions}>
                {d.status === 'answered' && (
                  <Button
                    title="Ver respostas"
                    size="sm"
                    variant="secondary"
                    fullWidth={false}
                    icon={<Eye size={16} color={colors.primary} />}
                    onPress={() => setViewing(d)}
                  />
                )}
                {(d.status === 'expired' || d.status === 'opened') && d.templateId && (
                  <Button
                    title="Reenviar"
                    size="sm"
                    variant="outline"
                    fullWidth={false}
                    icon={<RotateCcw size={16} color={colors.ink} />}
                    onPress={() => {
                      pickTemplate(d.templateId!);
                      setSubject(d.subject);
                    }}
                  />
                )}
                <Button
                  title="Link"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  icon={<Link2 size={16} color={colors.primary} />}
                  onPress={() => copyLink(d)}
                />
              </View>
            </Card>
          );
        })
      )}

      <ResponsesSheet dispatch={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

function ResponsesSheet({ dispatch, onClose }: { dispatch: CareDispatch | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/care/dispatches', dispatch?.id, 'responses'],
    queryFn: () => api<{ questions: CareResponseItem[] }>(`/api/care/dispatches/${dispatch!.id}/responses`),
    enabled: !!dispatch,
  });

  return (
    <Sheet visible={!!dispatch} onClose={onClose} title="Respostas do paciente">
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} />
      ) : !data?.questions.length ? (
        <AppText tone="muted">Nenhuma resposta registrada.</AppText>
      ) : (
        data.questions
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q, i) => (
            <View key={q.id} style={{ gap: 6 }}>
              <AppText weight="medium">
                {i + 1}. {q.questionText}
                {q.isRequired && <AppText tone="danger"> *</AppText>}
              </AppText>
              {!q.response ? (
                <AppText tone="subtle">Não respondida</AppText>
              ) : q.questionType === 'scale' ? (
                <AppText variant="heading" tone="primary">
                  {q.response.answerScale ?? '—'} <AppText tone="muted">/ 10</AppText>
                </AppText>
              ) : q.questionType === 'multiple_choice' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {(q.options ?? []).map((o) => {
                    const chosen = o === q.response?.answerChoice;
                    return (
                      <View key={o} style={[styles.chip, chosen && styles.chipOn]}>
                        <AppText variant="caption" weight={chosen ? 'semibold' : 'regular'} tone={chosen ? 'primary' : 'muted'}>
                          {o}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <AppText>{q.response.answerText || '—'}</AppText>
              )}
            </View>
          ))
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 10 },
  dispatchActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.surfaceMuted },
  chipOn: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary },
});
