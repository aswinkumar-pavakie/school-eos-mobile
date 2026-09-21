// Pure date-math month-grid calendar -- pixel-matches the design's own
// month-grid pattern (used by both School calendar and Employee · My
// Attendance screens). No calendar library -- render-prop shaped so each
// caller supplies its own per-day marker/color from its own already-fetched
// real data; this component only computes the 7-column grid + leading blanks
// + prev/next month navigation.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { principalColors } from '@/lib/theme';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface MonthGridDay {
  day: number;
  dateStr: string; // YYYY-MM-DD
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export function buildMonthDays(year: number, month: number): MonthGridDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return { day, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
  });
}

export function MonthGrid({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  selectedDateStr,
  renderDay,
}: {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay?: (dateStr: string) => void;
  selectedDateStr?: string | null;
  renderDay?: (dateStr: string) => { backgroundColor?: string; textColor?: string; dotColor?: string } | undefined;
}) {
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const days = buildMonthDays(year, month);
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} style={styles.navButton} hitSlop={8}>
          <ChevronLeftIcon color={principalColors.body} size={18} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable onPress={onNextMonth} style={styles.navButton} hitSlop={8}>
          <ChevronRightIcon color={principalColors.body} size={18} />
        </Pressable>
      </View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`${w}${i}`} style={styles.weekdayText}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`b${i}`} style={styles.cell} />
        ))}
        {days.map(({ day, dateStr }) => {
          const custom = renderDay?.(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDateStr;
          return (
            <Pressable
              key={dateStr}
              style={[
                styles.cell,
                styles.dayCell,
                custom?.backgroundColor ? { backgroundColor: custom.backgroundColor } : null,
                isSelected ? styles.dayCellSelected : null,
                isToday && !isSelected ? styles.dayCellToday : null,
              ]}
              onPress={() => onSelectDay?.(dateStr)}
            >
              <Text
                style={[
                  styles.dayText,
                  custom?.textColor ? { color: custom.textColor } : null,
                  isSelected ? styles.dayTextSelected : null,
                ]}
              >
                {day}
              </Text>
              {custom?.dotColor ? <View style={[styles.dot, { backgroundColor: custom.dotColor }]} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: principalColors.surface, borderRadius: 18, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: principalColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  weekdayRow: { flexDirection: 'row', marginTop: 16 },
  weekdayText: {
    flexBasis: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: principalColors.tertiary,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  cell: { flexBasis: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 10 },
  dayCellToday: { borderWidth: 1, borderColor: principalColors.primary },
  dayCellSelected: { backgroundColor: principalColors.primary },
  dayText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.ink },
  dayTextSelected: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  dot: { position: 'absolute', bottom: 5, width: 4, height: 4, borderRadius: 2, backgroundColor: principalColors.primary },
});
