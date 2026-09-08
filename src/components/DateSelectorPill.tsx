// Compact pill date selector -- pixel-inspired by the provided Class Absence
// Alerts reference (rounded light-blue pill, calendar icon, "Today, 20 Apr 2025"
// label, dropdown chevron). Tapping it reveals a real tap-to-pick month calendar
// grid, built from plain Views/Pressables -- not a native date-picker library, this
// app has none anywhere (see study-sessions/create.tsx's own note on why), and a
// hand-rolled grid is simple enough here not to need one.

import { useMemo, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function labelFor(dateIso: string): string {
  const formatted = formatDate(`${dateIso}T00:00:00`);
  return dateIso === todayIso() ? `Today, ${formatted}` : formatted;
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Mon-first-of-week Sunday=0 layout: how many blank cells precede day 1, and how
 * many days the month has. */
function monthLayout(year: number, month: number): { leadingBlanks: number; daysInMonth: number } {
  const leadingBlanks = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { leadingBlanks, daysInMonth };
}

export function DateSelectorPill({
  date,
  onChange,
  containerStyle,
}: {
  date: string;
  onChange: (date: string) => void;
  /** Overrides the default full-width padded wrapper -- for embedding the pill
   * as one item in a custom row alongside other elements (see
   * class-absence-alerts/index.tsx). */
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const [viewedYear, setViewedYear] = useState(() => Number(date.slice(0, 4)));
  const [viewedMonth, setViewedMonth] = useState(() => Number(date.slice(5, 7)) - 1);

  const { leadingBlanks, daysInMonth } = useMemo(() => monthLayout(viewedYear, viewedMonth), [viewedYear, viewedMonth]);
  const today = todayIso();

  function openCalendar() {
    setViewedYear(Number(date.slice(0, 4)));
    setViewedMonth(Number(date.slice(5, 7)) - 1);
    setOpen((o) => !o);
  }

  function shiftMonth(delta: number) {
    let month = viewedMonth + delta;
    let year = viewedYear;
    if (month < 0) {
      month = 11;
      year -= 1;
    } else if (month > 11) {
      month = 0;
      year += 1;
    }
    setViewedMonth(month);
    setViewedYear(year);
  }

  function pickDay(day: number) {
    onChange(toIso(viewedYear, viewedMonth, day));
    setOpen(false);
  }

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View style={containerStyle ?? styles.wrap}>
      <Pressable style={styles.pill} onPress={openCalendar}>
        <Ionicons name="calendar-outline" size={16} color={parentColors.blueDeep} />
        <Text style={styles.pillText}>{labelFor(date)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={parentColors.blueDeep} />
      </Pressable>

      {open ? (
        <View style={styles.calendar}>
          <View style={styles.calendarHeader}>
            <Pressable style={styles.monthArrow} onPress={() => shiftMonth(-1)} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={parentColors.blueDeep} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[viewedMonth]} {viewedYear}
            </Text>
            <Pressable style={styles.monthArrow} onPress={() => shiftMonth(1)} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={parentColors.blueDeep} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekdayLabel}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`blank-${i}`} style={styles.dayCell} />;
              const iso = toIso(viewedYear, viewedMonth, day);
              const isSelected = iso === date;
              const isToday = iso === today;
              return (
                <Pressable key={iso} style={styles.dayCell} onPress={() => pickDay(day)}>
                  <View style={[styles.dayCircle, isSelected && styles.daySelected, !isSelected && isToday && styles.dayToday]}>
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected, !isSelected && isToday && styles.dayTextToday]}>
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.todayLink} onPress={() => onChange(today)}>
            <Text style={styles.todayLinkText}>Jump to today</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    backgroundColor: parentColors.pillBlueBg,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  pillText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  calendar: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    padding: 14,
    alignSelf: 'flex-start',
    minWidth: CELL_SIZE * 7 + 28,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthArrow: { padding: 6, borderRadius: 8, backgroundColor: parentColors.background },
  monthLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { width: CELL_SIZE, textAlign: 'center', fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.mutedLight },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: parentColors.blue },
  dayToday: { borderWidth: 1.5, borderColor: parentColors.blue },
  dayText: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink },
  dayTextSelected: { color: '#fff', fontFamily: 'PlusJakartaSans_800ExtraBold' },
  dayTextToday: { color: parentColors.blueDeep, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  todayLink: { alignSelf: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 4 },
  todayLinkText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
});
