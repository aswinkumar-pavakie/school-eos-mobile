// School calendar -- real calendar_event rows for the student's stage/section
// scope (parent-academic.controller.ts's /calendar route). Fetched once per
// student and paged client-side by month; isHoliday drives the holiday vs.
// other-event styling exactly as in the design reference (holiday: neutral
// pill + ink text, everything else: blue pill + blueDeep text). Pixel
// reference: "School App.dc.html" isCalendar block (lines 883-925).

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { getCalendar, type CalendarEvent } from '@/lib/parent-api';
import { parentColors } from '@/lib/theme';

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DateParts {
  y: number;
  m: number;
  d: number;
}

function parseDateParts(value: string): DateParts {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return { y: y ?? 0, m: (m ?? 1) - 1, d: d ?? 1 };
}

function compareParts(a: DateParts, b: DateParts): number {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

function humanizeEventType(type: string): string {
  return type
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}

function ChevronLeft() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={parentColors.blueDeep} strokeWidth={2.4}>
      <Path d="M14 6l-6 6 6 6" />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={parentColors.blueDeep} strokeWidth={2.4}>
      <Path d="M10 6l6 6-6 6" />
    </Svg>
  );
}

export default function CalendarScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const calendarQuery = useQuery({
    queryKey: ['calendar', studentId],
    queryFn: () => getCalendar(studentId!),
    enabled: !!studentId,
  });

  const events = calendarQuery.data ?? [];

  function eventOnDay(day: number): CalendarEvent | null {
    const target: DateParts = { y: view.year, m: view.month, d: day };
    let fallback: CalendarEvent | null = null;
    for (const e of events) {
      const start = parseDateParts(e.startDate);
      const end = parseDateParts(e.endDate);
      if (compareParts(target, start) >= 0 && compareParts(target, end) <= 0) {
        if (e.isHoliday) return e;
        fallback = fallback ?? e;
      }
    }
    return fallback;
  }

  const firstDow = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: { day: number | null; event: CalendarEvent | null; isSunday: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, event: null, isSunday: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, event: eventOnDay(d), isSunday: new Date(view.year, view.month, d).getDay() === 0 });
  }

  const monthEvents = events
    .filter((e) => {
      const start = parseDateParts(e.startDate);
      return start.y === view.year && start.m === view.month;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  function goPrev() {
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  }
  function goNext() {
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Calendar" onBack={() => router.back()} />
      {!selected || calendarQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={styles.spinner} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.monthCard}>
            <View style={styles.monthHeader}>
              <Pressable style={styles.navButton} onPress={goPrev} hitSlop={8}>
                <ChevronLeft />
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.monthLabel}>
                  {MONTH_LONG[view.month]} {view.year}
                </Text>
                <Text style={styles.monthCount}>
                  {monthEvents.length} EVENT{monthEvents.length === 1 ? '' : 'S'}
                </Text>
              </View>
              <Pressable style={styles.navButton} onPress={goNext} hitSlop={8}>
                <ChevronRight />
              </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LETTERS.map((letter, i) => (
                <Text key={i} style={styles.weekdayLetter}>
                  {letter}
                </Text>
              ))}
            </View>
            <View style={styles.gridRow}>
              {cells.map((cell, i) => {
                const holiday = cell.event?.isHoliday ?? false;
                const hasEvent = !!cell.event;
                return (
                  <View
                    key={i}
                    style={[
                      styles.gridCell,
                      hasEvent && (holiday ? styles.gridCellHoliday : styles.gridCellEvent),
                    ]}
                  >
                    <Text
                      style={[
                        styles.gridCellText,
                        cell.isSunday && !hasEvent && styles.gridCellTextSunday,
                        hasEvent && (holiday ? styles.gridCellTextHoliday : styles.gridCellTextEvent),
                      ]}
                    >
                      {cell.day ?? ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={styles.sectionLabel}>THIS MONTH</Text>
          {monthEvents.length === 0 ? (
            <Text style={styles.emptyText}>No events this month.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {monthEvents.map((event) => {
                const start = parseDateParts(event.startDate);
                const weekday = WEEKDAY_LONG[new Date(start.y, start.m, start.d).getDay()];
                const multiDay = event.startDate.slice(0, 10) !== event.endDate.slice(0, 10);
                const meta = multiDay
                  ? `${weekday} – ${WEEKDAY_LONG[new Date(parseDateParts(event.endDate).y, parseDateParts(event.endDate).m, parseDateParts(event.endDate).d).getDay()]}${event.description ? ' · ' + event.description : ''}`
                  : `${weekday}${event.description ? ' · ' + event.description : ''}`;
                return (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventDayCol}>
                      <Text style={[styles.eventDay, event.isHoliday ? styles.eventDayHoliday : styles.eventDayNormal]}>
                        {start.d}
                      </Text>
                      <Text style={styles.eventMonth}>{MONTH_SHORT[start.m]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventMeta}>{meta}</Text>
                    </View>
                    <View style={[styles.eventTag, event.isHoliday ? styles.eventTagHoliday : styles.eventTagNormal]}>
                      <Text style={[styles.eventTagText, event.isHoliday ? styles.eventTagTextHoliday : styles.eventTagTextNormal]}>
                        {event.isHoliday ? 'Holiday' : humanizeEventType(event.eventType)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  spinner: { marginTop: 24 },
  content: { padding: 16, paddingTop: 14, gap: 14, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 8 },
  monthCard: { backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: parentColors.border },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: parentColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  monthCount: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1, color: parentColors.mutedLight, marginTop: 3 },
  weekdayRow: { flexDirection: 'row', marginTop: 16 },
  weekdayLetter: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: parentColors.mutedLight,
  },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  gridCell: {
    width: `${100 / 7}%`,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellHoliday: { backgroundColor: parentColors.pillNeutralBg },
  gridCellEvent: { backgroundColor: parentColors.pillBlueBg },
  gridCellText: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  gridCellTextSunday: { color: parentColors.checkboxOff },
  gridCellTextHoliday: { fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  gridCellTextEvent: { fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  sectionLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, letterSpacing: 1.4 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 12,
    paddingHorizontal: 16,
  },
  eventDayCol: { alignItems: 'center', width: 38 },
  eventDay: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  eventDayHoliday: { color: parentColors.ink },
  eventDayNormal: { color: parentColors.blueDeep },
  eventMonth: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.mutedLight, letterSpacing: 0.6 },
  eventTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  eventMeta: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  eventTag: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 99 },
  eventTagHoliday: { backgroundColor: parentColors.pillNeutralBg },
  eventTagNormal: { backgroundColor: parentColors.pillBlueBg },
  eventTagText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  eventTagTextHoliday: { color: parentColors.ink },
  eventTagTextNormal: { color: parentColors.blueDeep },
});
