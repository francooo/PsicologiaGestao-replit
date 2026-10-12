import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { CalendarDays, Clock } from 'lucide-react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { fromDateKey, formatDate, toDateKey } from '@/utils/format';
import { colors, radius } from '@/theme/tokens';

type Mode = 'date' | 'time';

type DateTimeFieldProps = {
  label?: string;
  mode: Mode;
  /** date: "yyyy-MM-dd" — time: "HH:mm" */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  minimumDate?: Date;
  placeholder?: string;
};

function toDate(mode: Mode, value: string) {
  if (!value) return new Date();
  if (mode === 'date') return fromDateKey(value);
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function fromDate(mode: Mode, date: Date) {
  return mode === 'date' ? toDateKey(date) : format(date, 'HH:mm');
}

/** Replaces <input type="date|time">: opens the native picker (dialog on Android, sheet on iOS). */
export function DateTimeField({ label, mode, value, onChange, error, minimumDate, placeholder }: DateTimeFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(toDate(mode, value));
  const Icon = mode === 'date' ? CalendarDays : Clock;
  const display = value ? (mode === 'date' ? formatDate(value) : value.slice(0, 5)) : placeholder ?? 'Selecionar';

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDate(mode, value),
        mode,
        is24Hour: true,
        minimumDate,
        onValueChange: (_e, date) => onChange(fromDate(mode, date)),
      });
    } else {
      setDraft(toDate(mode, value));
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="label" style={{ color: colors.ink }}>
          {label}
        </AppText>
      )}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${display}` : display}
        style={[styles.field, !!error && { borderColor: colors.danger }]}>
        <Icon size={18} color={colors.textMuted} />
        <AppText tone={value ? 'default' : 'subtle'}>{display}</AppText>
      </Pressable>
      {!!error && (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      )}

      {Platform.OS === 'ios' && (
        <Sheet
          visible={iosOpen}
          onClose={() => setIosOpen(false)}
          title={label}
          footer={
            <Button
              title="Confirmar"
              onPress={() => {
                onChange(fromDate(mode, draft));
                setIosOpen(false);
              }}
            />
          }>
          <DateTimePicker
            value={draft}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            locale="pt-BR"
            minimumDate={minimumDate}
            accentColor={colors.primary}
            onValueChange={(_e, date) => setDraft(date)}
            style={{ alignSelf: 'center' }}
          />
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
});
