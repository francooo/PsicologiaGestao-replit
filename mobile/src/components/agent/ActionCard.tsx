import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { Building2, CalendarCheck, CalendarX, Clock, UserRound } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AgentAction } from '@/api/agent';
import { colors, radius } from '@/theme/tokens';

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  confirmed: { label: 'Feito', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  expired: { label: 'Expirado', tone: 'neutral' },
  failed: { label: 'Não concluído', tone: 'danger' },
  processing: { label: 'Processando', tone: 'primary' },
};

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

/** The assistant's proposal: nothing is written until the user taps Confirmar. Same card as the web. */
export function ActionCard({
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  action: AgentAction;
  busy: 'confirm' | 'cancel' | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isCancel = action.type === 'room_booking.cancel';
  const p = action.payload;
  const Icon = isCancel ? CalendarX : CalendarCheck;
  const status = STATUS[action.status];

  return (
    <Card style={{ gap: 10, marginTop: 8 }}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: isCancel ? colors.dangerSoft : colors.sageSoft }]}>
          <Icon size={18} color={isCancel ? colors.danger : colors.sageInk} />
        </View>
        <AppText variant="label" weight="semibold" style={{ flex: 1 }}>
          {isCancel ? 'Cancelar reserva de sala' : 'Reserva de sala'}
        </AppText>
        {status && <Badge label={status.label} tone={status.tone} />}
      </View>
      <Row icon={Building2} value={p.roomName} />
      <Row icon={UserRound} value={p.psychologistName} />
      <Row icon={Clock} value={`${longDate(p.date)}, ${p.startTime.slice(0, 5)}–${p.endTime.slice(0, 5)}`} />
      {p.purpose ? <Row icon={CalendarCheck} value={p.purpose} /> : null}
      {action.status === 'failed' && action.result?.error ? (
        <AppText variant="caption" tone="danger">
          {action.result.error}
        </AppText>
      ) : null}
      {action.status === 'pending' && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title={isCancel ? 'Manter' : 'Cancelar'}
            size="sm"
            variant="outline"
            style={{ flex: 1 }}
            loading={busy === 'cancel'}
            disabled={!!busy}
            onPress={onCancel}
          />
          <Button
            title={isCancel ? 'Cancelar reserva' : 'Confirmar'}
            size="sm"
            variant={isCancel ? 'danger' : 'primary'}
            style={{ flex: 1 }}
            loading={busy === 'confirm'}
            disabled={!!busy}
            onPress={onConfirm}
          />
        </View>
      )}
    </Card>
  );
}

function Row({ icon: Icon, value }: { icon: ComponentType<{ size?: number; color?: string }>; value: string }) {
  return (
    <View style={styles.row}>
      <Icon size={14} color={colors.textMuted} />
      <AppText variant="caption" style={{ flex: 1, color: colors.ink }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
