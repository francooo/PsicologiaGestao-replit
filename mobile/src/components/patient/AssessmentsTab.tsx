import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { patientKeys, useAssessments } from '@/api/patients';
import { useMyPsychologist } from '@/hooks/useMyPsychologist';
import { formatDate, toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';
import type { Assessment, PatientDetail } from '@/types/patient';

export function AssessmentsTab({ patient }: { patient: PatientDetail }) {
  const queryClient = useQueryClient();
  const { psychologist: me } = useMyPsychologist();
  const { data = [], isLoading, error, refetch } = useAssessments(patient.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(toDateKey());
  const [results, setResults] = useState('');
  const [observations, setObservations] = useState('');

  // Grouped by instrument, newest first (as in the web)
  const groups = useMemo(() => {
    const map = new Map<string, Assessment[]>();
    data.forEach((a) => map.set(a.assessmentName, [...(map.get(a.assessmentName) ?? []), a]));
    return [...map.entries()].map(([title, items]) => ({
      title,
      items: items.sort((a, b) => b.assessmentDate.localeCompare(a.assessmentDate)),
    }));
  }, [data]);

  // The web sent psychologistId: 1; use the logged psychologist or the patient's own
  const psychologistId = me?.id ?? patient.psychologistId;

  const create = useMutation({
    mutationFn: () =>
      api(`/api/patients/${patient.id}/assessments`, {
        method: 'POST',
        body: { assessmentName: name.trim(), assessmentDate: date, results, observations, psychologistId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.assessments(patient.id) });
      queryClient.invalidateQueries({ queryKey: patientKeys.counts(patient.id) });
      toast.success('Avaliação criada', 'Avaliação registrada com sucesso.');
      setOpen(false);
      setName('');
      setResults('');
      setObservations('');
      setDate(toDateKey());
    },
    onError: () => toast.error('Erro', 'Não foi possível criar a avaliação.'),
  });

  return (
    <View style={{ gap: 12 }}>
      <Button title="Nova avaliação" icon={<Plus size={18} color={colors.onPrimary} />} onPress={() => setOpen(true)} />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Nenhuma avaliação registrada"
          description="Adicione instrumentos de avaliação psicológica"
          icon={ClipboardList}
        />
      ) : (
        groups.map((g) => (
          <Card key={g.title} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <AppText variant="subtitle" style={{ flex: 1 }}>
                {g.title}
              </AppText>
              <Badge label={`${g.items.length} ${g.items.length === 1 ? 'aplicação' : 'aplicações'}`} tone="lilac" />
            </View>
            {g.items.map((a, i) => (
              <View key={a.id} style={{ gap: 4, paddingTop: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }}>
                <AppText variant="caption" tone="muted">
                  #{g.items.length - i} · {formatDate(a.assessmentDate, "dd 'de' MMM 'de' yyyy")}
                </AppText>
                {!!a.results && (
                  <View style={{ backgroundColor: colors.primarySoft, borderRadius: 10, padding: 10 }}>
                    <AppText variant="overline" tone="primary">
                      Resultado
                    </AppText>
                    <AppText>{a.results}</AppText>
                  </View>
                )}
                {!!a.observations && <AppText tone="muted">{a.observations}</AppText>}
              </View>
            ))}
          </Card>
        ))
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Nova avaliação psicológica"
        footer={
          <Button
            title="Registrar"
            disabled={!name.trim() || !date || !psychologistId}
            loading={create.isPending}
            onPress={() => create.mutate()}
          />
        }>
        {!psychologistId && (
          <AppText variant="caption" tone="danger">
            Vincule uma psicóloga ao paciente antes de registrar avaliações.
          </AppText>
        )}
        <TextField label="Nome do instrumento *" placeholder="Ex.: BDI-II, WAIS, HTP..." value={name} onChangeText={setName} />
        <DateTimeField label="Data da aplicação *" mode="date" value={date} onChange={setDate} />
        <TextField
          label="Resultado principal"
          placeholder="Ex.: Depressão grave (escore: 38)"
          value={results}
          onChangeText={setResults}
        />
        <TextField
          label="Observações"
          multiline
          placeholder="Notas clínicas sobre a aplicação..."
          value={observations}
          onChangeText={setObservations}
        />
      </Sheet>
    </View>
  );
}
