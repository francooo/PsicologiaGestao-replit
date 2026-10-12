import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeftRight, ShieldAlert } from 'lucide-react-native';

import { AnamnesisTab } from '@/components/patient/AnamnesisTab';
import { AssessmentsTab } from '@/components/patient/AssessmentsTab';
import { CareTab } from '@/components/patient/CareTab';
import { DocumentsTab } from '@/components/patient/DocumentsTab';
import { EvolutionsTab } from '@/components/patient/EvolutionsTab';
import { PersonalDataTab } from '@/components/patient/PersonalDataTab';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { ApiError } from '@/api/client';
import { usePatient, usePatientCounts } from '@/api/patients';
import { usePsychologists } from '@/api/queries';
import { useAuth } from '@/auth/AuthProvider';
import { ageFrom, patientStatusBadge } from '@/utils/patient';
import { colors } from '@/theme/tokens';

type Tab = 'details' | 'anamnesis' | 'sessions' | 'documents' | 'cuidados' | 'assessments';
const TAB_KEY = 'prontuario_active_tab';

export default function PatientRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<Tab>('details');

  const patient = usePatient(patientId);
  const counts = usePatientCounts(patientId);
  const psychologists = usePsychologists(isAdmin);

  // Remember the last tab, like the web (localStorage → AsyncStorage)
  useEffect(() => {
    AsyncStorage.getItem(TAB_KEY)
      .then((saved) => saved && setTab(saved as Tab))
      .catch(() => {});
  }, []);
  const changeTab = (t: Tab) => {
    setTab(t);
    AsyncStorage.setItem(TAB_KEY, t).catch(() => {});
  };

  if (patient.isLoading) return <LoadingState />;

  if (patient.error instanceof ApiError && patient.error.status === 403) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Prontuário' }} />
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
          <ShieldAlert size={40} color={colors.danger} />
          <AppText variant="heading" center>
            Acesso negado
          </AppText>
          <AppText tone="muted" center>
            Você não possui permissão para visualizar este prontuário. Este conteúdo é restrito ao psicólogo responsável ou
            ao administrador do sistema.
          </AppText>
          <Button title="Voltar para pacientes" variant="outline" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }
  if (patient.error || !patient.data) {
    return <ErrorState message={patient.error?.message ?? 'Paciente não encontrado'} onRetry={patient.refetch} />;
  }

  const p = patient.data;
  const age = ageFrom(p.birthDate);
  const status = patientStatusBadge(p.status);
  const c = counts.data;
  const withCount = (label: string, n?: number) => (n ? `${label} (${n})` : label);
  const psychologistName = psychologists.data?.find((x) => x.id === p.psychologistId)?.user?.fullName;

  const tabs: { label: string; value: Tab }[] = [
    { label: 'Dados', value: 'details' },
    { label: 'Anamnese', value: 'anamnesis' },
    { label: withCount('Evoluções', c?.sessions), value: 'sessions' },
    { label: withCount('Documentos', c?.documents), value: 'documents' },
    { label: 'Cuidados ♥', value: 'cuidados' },
    { label: withCount('Avaliações', c?.assessments), value: 'assessments' },
  ];

  return (
    <>
      <Stack.Screen options={{ title: 'Prontuário' }} />
      <Screen
        refreshing={patient.isRefetching}
        onRefresh={() => {
          patient.refetch();
          counts.refetch();
        }}>
        <Card style={styles.header}>
          <Avatar name={p.fullName} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="heading">{p.fullName}</AppText>
            <View style={styles.badges}>
              {age !== null && <Badge label={`${age} anos`} tone="lilac" />}
              <Badge label={status.label} tone={status.tone} />
            </View>
            {isAdmin && (
              <AppText variant="caption" tone="muted">
                Psicóloga: {psychologistName ?? 'Não vinculada'}
              </AppText>
            )}
          </View>
        </Card>

        {isAdmin && (
          <Button
            title="Transferir paciente"
            variant="outline"
            icon={<ArrowLeftRight size={18} color={colors.warning} />}
            onPress={() => router.push({ pathname: '/pacientes/[id]/transferir', params: { id } })}
          />
        )}

        <Segmented scrollable segments={tabs} value={tab} onChange={changeTab} />

        {tab === 'details' && <PersonalDataTab patient={p} isAdmin={isAdmin} psychologistName={psychologistName} />}
        {tab === 'anamnesis' && <AnamnesisTab patientId={patientId} />}
        {tab === 'sessions' && <EvolutionsTab patientId={patientId} />}
        {tab === 'documents' && <DocumentsTab patientId={patientId} />}
        {tab === 'cuidados' && <CareTab patient={p} onEditProfile={() => changeTab('details')} />}
        {tab === 'assessments' && <AssessmentsTab patient={p} />}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
});
