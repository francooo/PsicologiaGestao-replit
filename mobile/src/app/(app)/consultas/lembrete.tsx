import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, MessageCircle, Phone } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { TextField } from '@/components/ui/TextField';
import { WhatsAppEditor, WhatsAppPreview } from '@/components/whatsapp/WhatsAppMessage';
import { PHONE_ISSUE_TEXT, useAppointmentReminder, useMarkReminderSent, type ReminderItem } from '@/api/whatsapp';
import { formatDate } from '@/utils/format';
import { MESSAGE_MAX_LENGTH, toWhatsAppNumber, whatsappLink } from '@/utils/whatsapp';
import { toast } from '@/utils/toast';
import { colors } from '@/theme/tokens';

/** "Lembrar pelo WhatsApp": the clinic's text filled for this appointment, opened in this phone's WhatsApp. */
export default function ReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useAppointmentReminder(Number(id));

  return (
    <>
      <Stack.Screen options={{ title: 'Lembrar pelo WhatsApp' }} />
      {isLoading ? <LoadingState /> : error || !data ? <ErrorState message={error?.message} onRetry={refetch} /> : <Reminder item={data} />}
    </>
  );
}

function Reminder({ item }: { item: ReminderItem }) {
  const [phone, setPhone] = useState(item.phoneDisplay ?? '');
  const [message, setMessage] = useState(item.message);
  const markSent = useMarkReminderSent(item.appointmentId);

  const number = phone.trim() ? toWhatsAppNumber(phone) : null;
  const phoneInvalid = !!phone.trim() && !number;

  const open = async () => {
    try {
      await Linking.openURL(whatsappLink(number, message));
    } catch {
      toast.error('Não foi possível abrir o WhatsApp', 'Confira se o WhatsApp está instalado neste celular.');
      return;
    }
    markSent.mutate(undefined, {
      onError: (e: Error) => toast.error('O lembrete não foi marcado como enviado', e.message),
    });
    router.back();
  };

  const sent = item.reminderSentAt
    ? `Enviado em ${formatDate(item.reminderSentAt, "dd/MM 'às' HH:mm")}${item.reminderSentByName ? ` por ${item.reminderSentByName}` : ''}`
    : null;

  return (
    <Screen
      footer={
        <Button
          title="Abrir no WhatsApp"
          icon={<MessageCircle size={18} color={colors.onPrimary} />}
          disabled={phoneInvalid || !message.trim() || message.length > MESSAGE_MAX_LENGTH}
          onPress={open}
        />
      }>
      <Card style={{ gap: 4 }}>
        <AppText variant="subtitle">{item.patientName}</AppText>
        <AppText tone="muted" style={{ textTransform: 'capitalize' }}>
          {formatDate(item.date, 'EEEE, dd/MM')} às {item.startTime}
          {item.psychologistName ? ` · ${item.psychologistName}` : ''}
        </AppText>
        {sent && (
          <View style={styles.sent}>
            <CheckCircle2 size={16} color={colors.success} />
            <AppText variant="caption" tone="success">
              {sent}
            </AppText>
          </View>
        )}
      </Card>

      <Card style={{ gap: 14 }}>
        <TextField
          label="WhatsApp do paciente"
          icon={Phone}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="DDD + número"
          error={phoneInvalid ? 'Digite o número com DDD, por exemplo (51) 99999-8888.' : undefined}
          hint={
            !phone.trim()
              ? `${item.phoneIssue ? `${PHONE_ISSUE_TEXT[item.phoneIssue]} ` : ''}Digite o número ou deixe em branco para escolher o contato no WhatsApp.`
              : undefined
          }
        />
        <WhatsAppEditor value={message} onChange={setMessage} maxLength={MESSAGE_MAX_LENGTH} />
        <AppText variant="caption" tone="subtle">
          Os ajustes valem só para esta mensagem.
        </AppText>
      </Card>

      <View style={{ gap: 8 }}>
        <AppText variant="label">Como vai aparecer</AppText>
        <WhatsAppPreview text={message} />
      </View>

      <AppText variant="caption" tone="muted" center>
        Abre o WhatsApp deste celular, já na conversa com o paciente: a mensagem sai do seu número. Confira e toque em enviar.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sent: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
});
