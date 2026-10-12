import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { newQuestion, QuestionList, toPayload, type DraftQuestion } from '@/components/patient/QuestionEditor';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { patientKeys, useCareTemplates } from '@/api/patients';
import { toast } from '@/utils/toast';
import type { CareTemplate } from '@/types/patient';

/** Create / edit a care template (web TemplateModal). */
export default function CareTemplateScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editingId = id ? Number(id) : null;
  const templates = useCareTemplates();
  if (editingId && templates.isLoading) return <LoadingState />;
  const template = editingId ? templates.data?.find((x) => x.id === editingId) ?? null : null;
  return <TemplateEditor editingId={editingId} template={template} />;
}

function TemplateEditor({ editingId, template: t }: { editingId: number | null; template: CareTemplate | null }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(t?.title ?? '');
  const [description, setDescription] = useState(t?.description ?? '');
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    t ? [...t.questions].sort((a, b) => a.orderIndex - b.orderIndex).map((q) => newQuestion(q)) : [newQuestion()],
  );

  const save = useMutation({
    mutationFn: async () => {
      const items = toPayload(questions).filter((q) => q.questionText);
      if (editingId) {
        await api(`/api/care/templates/${editingId}`, {
          method: 'PATCH',
          body: { title: title.trim(), description: description.trim() || null },
        });
        await api(`/api/care/templates/${editingId}/questions`, { method: 'PUT', body: items });
      } else {
        await api('/api/care/templates', {
          method: 'POST',
          body: { title: title.trim(), description: description.trim() || null, questions: items },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.templates });
      toast.success(editingId ? 'Template atualizado' : 'Template criado com sucesso');
      router.back();
    },
    onError: (e: Error) => toast.error('Erro', e.message),
  });

  return (
    <>
      <Stack.Screen options={{ title: editingId ? 'Editar template' : 'Novo template' }} />
      <Screen
        footer={
          <Button
            title={editingId ? 'Salvar alterações' : 'Criar template'}
            disabled={!title.trim()}
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        }>
        <Card style={{ gap: 14 }}>
          <TextField label="Nome do template *" placeholder="Ex.: Check-in semanal" value={title} onChangeText={setTitle} maxLength={100} />
          <TextField
            label="Descrição (opcional)"
            placeholder="Breve descrição do propósito do formulário"
            value={description}
            onChangeText={setDescription}
            maxLength={500}
          />
          <AppText variant="caption" tone="subtle">
            Variáveis: {'{patient_name}'} · {'{patient_full_name}'} · {'{psychologist_name}'}
          </AppText>
        </Card>
        <AppText variant="subtitle">Perguntas</AppText>
        <QuestionList value={questions} onChange={setQuestions} />
      </Screen>
    </>
  );
}
