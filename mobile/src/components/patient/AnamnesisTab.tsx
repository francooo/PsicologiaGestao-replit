import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { AppText } from '@/components/ui/AppText';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { patientKeys, useMedicalRecord } from '@/api/patients';
import type { MedicalRecord } from '@/types/patient';
import { toast } from '@/utils/toast';

const sections = [
  { key: 'chiefComplaint', title: 'Queixa principal', placeholder: 'Descreva o motivo da busca pelo atendimento...' },
  { key: 'personalHistory', title: 'Histórico pessoal', placeholder: 'Histórico de vida, desenvolvimento e eventos relevantes...' },
  { key: 'familyHistory', title: 'Histórico familiar', placeholder: 'Dinâmica familiar, histórico de saúde mental na família...' },
  { key: 'therapeuticObjectives', title: 'Objetivos terapêuticos', placeholder: 'Metas e objetivos para o processo terapêutico...' },
] as const;

type Key = (typeof sections)[number]['key'];
type Values = Record<Key, string>;

function progress(values: Values): { label: string; tone: BadgeTone } {
  const filled = sections.filter((s) => values[s.key].trim()).length;
  if (filled === 0) return { label: 'Não iniciada', tone: 'neutral' };
  if (filled === 1) return { label: 'Incompleta', tone: 'warning' };
  if (filled < 4) return { label: 'Em andamento', tone: 'primary' };
  return { label: 'Finalizada', tone: 'success' };
}

/** Anamnesis with debounced autosave (1.2s), same as the web. POST is an upsert. */
export function AnamnesisTab({ patientId }: { patientId: number }) {
  const { data, isLoading, error, refetch } = useMedicalRecord(patientId);
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;
  return <AnamnesisForm patientId={patientId} record={data ?? null} />;
}

function AnamnesisForm({ patientId, record: data }: { patientId: number; record: MedicalRecord | null }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(() => ({
    chiefComplaint: data?.chiefComplaint ?? '',
    personalHistory: data?.personalHistory ?? '',
    familyHistory: data?.familyHistory ?? '',
    therapeuticObjectives: data?.therapeuticObjectives ?? '',
  }));
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: (v: Values) =>
      api(`/api/patients/${patientId}/medical-record`, {
        method: 'POST',
        body: { ...v, currentMedications: data?.currentMedications ?? false, medicationDetails: data?.medicationDetails ?? null },
      }),
    onSuccess: () => {
      setSavedAt(new Date());
      queryClient.invalidateQueries({ queryKey: patientKeys.record(patientId) });
    },
    onError: () => toast.error('Erro ao salvar', 'Não foi possível salvar a anamnese.'),
  });

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const update = (key: Key, text: string) => {
    const next = { ...values, [key]: text };
    setValues(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save.mutate(next), 1200);
  };

  const p = progress(values);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Badge label={p.label} tone={p.tone} />
        <AppText variant="caption" tone="subtle">
          {save.isPending ? 'Salvando...' : savedAt ? `Salvo às ${format(savedAt, 'HH:mm')}` : ''}
        </AppText>
      </View>
      {sections.map((s) => (
        <Card key={s.key}>
          <TextField
            label={s.title}
            multiline
            placeholder={s.placeholder}
            value={values[s.key]}
            onChangeText={(t) => update(s.key, t)}
          />
        </Card>
      ))}
      <Button
        title="Salvar anamnese"
        loading={save.isPending}
        onPress={() => {
          if (timer.current) clearTimeout(timer.current);
          save.mutate(values, { onSuccess: () => toast.success('Anamnese salva') });
        }}
      />
    </View>
  );
}
