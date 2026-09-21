// Principal -> Academic Calendar -- pixel-rebuilt from the design's own
// `isCalendar` screen: month-grid + "this month" event list, replacing the
// previous agenda-list layout. Real backend data only (calendar-events,
// confirmed identical method-level access for PRINCIPAL as VICE_PRINCIPAL by
// direct backend audit -- see principal-academic-calendar-api.ts's own
// comment). Guarded by the parent principal/_layout.tsx.
//
// The backend has no month-oriented endpoint, just fromDate/toDate range
// filtering -- this screen fetches a window covering the visible month
// (1st of month to 1st of next month) and does the month-grid rendering
// entirely client-side over that real, already-bounded data.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { MonthGrid } from '@/components/principal/MonthGrid';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { principalColors } from '@/lib/theme';
import { listAcademicYears } from '@/lib/principal-academics-api';
import { createCalendarEvent, listCalendarEvents, type CalendarEventRow } from '@/lib/principal-academic-calendar-api';

const EVENT_TYPES = ['HOLIDAY', 'TERM_START', 'TERM_END', 'EXAM_WINDOW', 'PTM', 'FUNCTION', 'COMPETITION', 'WORKING_SATURDAY', 'OTHER'] as const;

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function eventTypeMeta(row: CalendarEventRow): { label: string; tone: StatusTone } {
  if (row.isHoliday) return { label: 'Holiday', tone: 'negative' };
  switch (row.eventType) {
    case 'TERM_START':
    case 'TERM_END':
      return { label: humanize(row.eventType), tone: 'positive' };
    case 'EXAM_WINDOW':
      return { label: 'Exam window', tone: 'warning' };
    default:
      return { label: humanize(row.eventType), tone: 'neutral' };
  }
}

export default function PrincipalAcademicCalendarScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>('FUNCTION');
  const [isoDate, setIsoDate] = useState('');

  const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const toDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const eventsQuery = useQuery({
    queryKey: ['principal-calendar', 'month', year, month],
    queryFn: () => listCalendarEvents({ fromDate, toDate }),
  });
  const yearsQuery = useQuery({ queryKey: ['principal-academic-years'], queryFn: listAcademicYears, enabled: showAdd });

  const createMutation = useMutation({
    mutationFn: () => {
      const currentYear = (yearsQuery.data ?? []).find((y) => y.isCurrent) ?? (yearsQuery.data ?? [])[0];
      if (!currentYear) throw new Error('No academic year is set up.');
      if (!title.trim()) throw new Error('Enter a title.');
      if (!isoDate) throw new Error('Pick a date.');
      return createCalendarEvent({ academicYearId: currentYear.id, title: title.trim(), eventType, isoDate });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['principal-calendar'] });
      setShowAdd(false);
      setTitle('');
      setEventType('FUNCTION');
      setIsoDate('');
    },
  });

  const events = eventsQuery.data ?? [];
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventRow[]>();
    for (const e of events) {
      // Mark every day in the event's [startDate, endDate] range that falls
      // within the visible month, not just the start day -- multi-day events
      // (e.g. exam windows) should show on every day they cover.
      const s = e.startDate < fromDate ? fromDate : e.startDate;
      const en = e.endDate > toDate ? toDate : e.endDate;
      for (let d = new Date(s); d <= new Date(en); d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        map.set(key, [...(map.get(key) ?? []), e]);
      }
    }
    return map;
  }, [events, fromDate, toDate]);

  const monthEvents = [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="Academic Calendar" subtitle={`${monthEvents.length} events this month`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.addButton} onPress={() => setShowAdd((v) => !v)}>
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ Add event'}</Text>
        </Pressable>
        {showAdd ? (
          <View style={styles.addCard}>
            <Text style={styles.addLabel}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Annual day" placeholderTextColor={principalColors.tertiary} style={styles.addInput} />
            <Text style={styles.addLabel}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EVENT_TYPES.map((t) => (
                <Pressable key={t} onPress={() => setEventType(t)} style={[styles.chip, eventType === t && styles.chipActive]}>
                  <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{humanize(t)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.addLabel}>Date</Text>
            <TextInput value={isoDate} onChangeText={setIsoDate} placeholder="2026-10-12" placeholderTextColor={principalColors.tertiary} style={styles.addInput} />
            {createMutation.isError ? <Text style={styles.errorText}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : 'Save event'}</Text>
            </Pressable>
          </View>
        ) : null}
        <MonthGrid
          year={year}
          month={month}
          onPrevMonth={() => shiftMonth(-1)}
          onNextMonth={() => shiftMonth(1)}
          renderDay={(dateStr) => {
            const dayEvents = eventsByDay.get(dateStr);
            if (!dayEvents || dayEvents.length === 0) return undefined;
            const hasHoliday = dayEvents.some((e) => e.isHoliday);
            return {
              backgroundColor: principalColors.tint,
              textColor: principalColors.primary,
              dotColor: hasHoliday ? principalColors.red : principalColors.primary,
            };
          }}
        />

        <Text style={styles.sectionTitle}>This month</Text>
        {eventsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : eventsQuery.isError ? (
          <ErrorState
            message={eventsQuery.error instanceof ApiError ? eventsQuery.error.message : 'Unable to load the calendar.'}
            onRetry={() => eventsQuery.refetch()}
          />
        ) : monthEvents.length === 0 ? (
          <EmptyState message="No events this month." />
        ) : (
          <View style={styles.list}>
            {monthEvents.map((event, index) => {
              const meta = eventTypeMeta(event);
              const s = new Date(event.startDate);
              return (
                <Pressable
                  key={event.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/principal/academic-calendar/${event.id}` as never)}
                >
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeDay}>{s.getDate()}</Text>
                    <Text style={styles.dateBadgeMonth}>{s.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {event.title}
                    </Text>
                    {event.endDate !== event.startDate ? (
                      <Text style={styles.rowMeta}>Through {formatDate(event.endDate)}</Text>
                    ) : null}
                  </View>
                  <StatusBadge {...meta} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  addButton: { backgroundColor: principalColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginBottom: 14 },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  addCard: { backgroundColor: principalColors.surface, borderRadius: 14, padding: 16, gap: 10, marginBottom: 16 },
  addLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: principalColors.tertiary },
  addInput: { borderWidth: 1, borderColor: principalColors.border, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: principalColors.ink },
  chip: { borderWidth: 1, borderColor: principalColors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: principalColors.primary, borderColor: principalColors.primary },
  chipText: { fontSize: 12, color: principalColors.ink, fontFamily: 'PlusJakartaSans_600SemiBold' },
  chipTextActive: { color: '#fff' },
  errorText: { fontSize: 12.5, color: principalColors.red },
  saveButton: { backgroundColor: principalColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 20, marginBottom: 10 },
  list: { backgroundColor: principalColors.surface, borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: principalColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  dateBadge: {
    width: 42,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: principalColors.border,
    borderRadius: 10,
    paddingVertical: 6,
  },
  dateBadgeDay: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.primaryDark },
  dateBadgeMonth: { fontSize: 9, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.tertiary, marginTop: 1 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 2 },
});
