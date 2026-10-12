import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { toDateKey } from '@/utils/format';
import { colors, fonts, radius } from '@/theme/tokens';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Compact month grid (port of client/src/components/calendar.tsx) with event dots. */
export const MonthCalendar = memo(function MonthCalendar({
  month,
  selected,
  onSelect,
  onMonthChange,
  counts,
}: {
  month: Date;
  selected: Date;
  onSelect: (date: Date) => void;
  onMonthChange: (month: Date) => void;
  /** yyyy-MM-dd -> number of events */
  counts: Record<string, number>;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, -1))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          style={styles.nav}>
          <ChevronLeft size={20} color={colors.ink} />
        </Pressable>
        <AppText variant="subtitle" style={{ textTransform: 'capitalize' }}>
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </AppText>
        <Pressable
          onPress={() => onMonthChange(addMonths(month, 1))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          style={styles.nav}>
          <ChevronRight size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <AppText key={i} variant="caption" tone="subtle" style={styles.weekday}>
            {d}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const key = toDateKey(day);
          const inMonth = isSameMonth(day, month);
          const isSelected = isSameDay(day, selected);
          const count = counts[key] ?? 0;
          return (
            <Pressable
              key={key}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${format(day, "d 'de' MMMM", { locale: ptBR })}${count ? `, ${count} consulta${count > 1 ? 's' : ''}` : ''}`}
              style={styles.cell}>
              <View style={[styles.day, isToday(day) && styles.today, isSelected && styles.selected]}>
                <AppText
                  style={[
                    styles.dayText,
                    !inMonth && { color: colors.textSubtle, opacity: 0.5 },
                    isSelected && { color: colors.onPrimary, fontFamily: fonts.semibold },
                  ]}>
                  {format(day, 'd')}
                </AppText>
              </View>
              <View style={[styles.dot, { opacity: count > 0 ? 1 : 0 }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1, borderColor: colors.primary },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 2 },
});
