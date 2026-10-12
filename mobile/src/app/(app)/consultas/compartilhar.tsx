import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { MessageCircle } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { Screen } from '@/components/ui/Screen';
import { SelectField } from '@/components/ui/SelectField';
import { TextField } from '@/components/ui/TextField';
import { api } from '@/api/client';
import { usePsychologists } from '@/api/queries';
import { useMyPsychologist } from '@/hooks/useMyPsychologist';
import { toDateKey } from '@/utils/format';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

/** Generates the WhatsApp message with free slots (POST /api/share/whatsapp) and opens WhatsApp. */
export default function ShareAvailabilityScreen() {
  const psychologists = usePsychologists();
  const { psychologist: me, isPsychologist } = useMyPsychologist();
  const [pickedId, setPickedId] = useState<number | null>(null);
  // Psychologists always share their own agenda
  const psychologistId = isPsychologist ? me?.id ?? null : pickedId;
  const [startDate, setStartDate] = useState(toDateKey());
  const [endDate, setEndDate] = useState(toDateKey(addDays(new Date(), 7)));
  const [message, setMessage] = useState('');

  const share = useMutation({
    mutationFn: () =>
      api<{ link: string; message: string }>('/api/share/whatsapp', {
        method: 'POST',
        body: { psychologistId, startDate, endDate, message },
      }),
    onSuccess: async ({ link }) => {
      await Linking.openURL(link);
      router.back();
    },
    onError: (e: Error) => toast.error('Erro ao gerar link', e.message),
  });

  const invalid = !psychologistId || !startDate || !endDate || endDate < startDate;

  return (
    <>
      <Stack.Screen options={{ title: 'Compartilhar horários' }} />
      <Screen
        footer={
          <Button
            title="Abrir no WhatsApp"
            icon={<MessageCircle size={18} color={colors.onPrimary} />}
            disabled={invalid}
            loading={share.isPending}
            onPress={() => share.mutate()}
          />
        }>
        <AppText tone="muted">
          Gera uma mensagem com os horários livres no período e abre o WhatsApp para você escolher o contato.
        </AppText>
        <Card style={{ gap: 14 }}>
          {!isPsychologist && (
            <SelectField
              label="Psicóloga"
              value={psychologistId}
              options={(psychologists.data ?? []).map((p) => ({ label: p.user?.fullName ?? `#${p.id}`, value: p.id }))}
              onChange={setPickedId}
            />
          )}
          <View style={styles.row}>
            <DateTimeField label="De" mode="date" value={startDate} onChange={setStartDate} />
            <DateTimeField
              label="Até"
              mode="date"
              value={endDate}
              onChange={setEndDate}
              error={endDate < startDate ? 'Data final antes da inicial' : undefined}
            />
          </View>
          <TextField
            label="Mensagem (opcional)"
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Ex.: Olá! Seguem meus horários disponíveis."
          />
        </Card>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12 } });
