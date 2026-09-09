// Vice Principal -> Academic Calendar (Phase 12) -- school-level oversight,
// real backend data only (calendar-events, already fully authorized for
// VICE_PRINCIPAL since Phase 6's own bugfix -- zero backend changes needed
// this phase). Guarded by the parent vice-principal/_layout.tsx.
//
// Agenda/list view (grouped by real date), not a month grid -- the backend
// has no month-oriented endpoint, just fromDate/toDate range filtering, so a
// date-range agenda is the real subset of "month/agenda/upcoming/date-
// specific" this phase's own instructions say to implement when the backend
// only supports a subset. Event-type chips filter the already-loaded,
// already date-bounded set client-side -- there is no backend eventType
// filter param, so this is never presented as a server call.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { DateSelectorPill } from '@/components/DateSelectorPill';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listCalendarEvents, type CalendarEventRow } from '@/lib/vice-principal-academic-calendar-api';
import { listAcademicYears } from '@/lib/vice-principal-academics-api';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

function groupByDate(rows: CalendarEventRow[]): { date: string; rows: CalendarEventRow[] }[] {
  const map = new Map<string, CalendarEventRow[]>();
  for (const row of rows) {
    const list = map.get(row.startDate) ?? [];
    list.push(row);
    map.set(row.startDate, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, groupRows]) => ({ date, rows: groupRows }));
}

export default function VicePrincipalAcademicCalendarScreen() {
  const router = useRouter();
  const [date, setDate] = useState(todayIso());
  const [yearName, setYearName] = useState<string | null>(null);
  const [eventType, setEventType] = useState<string | null>(null);

  const yearsQuery = useQuery({ queryKey: ['vp-calendar', 'years'], queryFn: listAcademicYears });
  const year = useMemo(() => yearsQuery.data?.find((y) => y.name === yearName) ?? null, [yearsQuery.data, yearName]);
  const currentYear = yearsQuery.data?.find((y) => y.isCurrent);

  const eventsQuery = useQuery({
    queryKey: ['vp-calendar', 'events', date, year?.id],
    queryFn: () => listCalendarEvents({ fromDate: date, academicYearId: year?.id }),
  });

  const allEvents = eventsQuery.data ?? [];
  const eventTypes = Array.from(new Set(allEvents.map((e) => e.eventType)));
  const events = eventType ? allEvents.filter((e) => e.eventType === eventType) : allEvents;
  const groups = groupByDate(events);

  return (
    <View style={styles.flex}>
      <AppHeader title="Academic Calendar" subtitle="Upcoming academic events" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {currentYear ? (
          <View style={styles.yearCard}>
            <Text style={styles.yearLabel}>Current academic year</Text>
            <Text style={styles.yearValue}>{currentYear.name}</Text>
          </View>
        ) : null}

        <DateSelectorPill date={date} onChange={setDate} containerStyle={{ paddingHorizontal: 0, paddingTop: 0, marginBottom: 14 }} />

        <View style={{ marginBottom: 12 }}>
          <SelectField
            label="Academic year filter"
            value={yearName}
            placeholder={yearsQuery.isLoading ? 'Loading…' : 'Current + all years'}
            options={(yearsQuery.data ?? []).map((y) => y.name)}
            onSelect={setYearName}
            disabled={yearsQuery.isLoading}
          />
        </View>

        {eventTypes.length > 0 ? (
          <View style={styles.chipRow}>
            <Pressable onPress={() => setEventType(null)} style={[styles.chip, eventType === null && styles.chipActive]}>
              <Text style={[styles.chipText, eventType === null && styles.chipTextActive]}>All</Text>
            </Pressable>
            {eventTypes.map((t) => (
              <Pressable key={t} onPress={() => setEventType(t)} style={[styles.chip, eventType === t && styles.chipActive]}>
                <Text style={[styles.chipText, eventType === t && styles.chipTextActive]}>{humanize(t)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {eventsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : eventsQuery.isError ? (
          <ErrorState
            message={eventsQuery.error instanceof ApiError ? eventsQuery.error.message : 'Unable to load the calendar.'}
            onRetry={() => eventsQuery.refetch()}
          />
        ) : groups.length === 0 ? (
          <EmptyState message="No academic events found from this date onward." />
        ) : (
          groups.map((group) => (
            <View key={group.date} style={{ marginBottom: 16 }}>
              <Text style={styles.dateHeading}>{formatDate(group.date)}</Text>
              <View style={styles.list}>
                {group.rows.map((event, index) => {
                  const meta = eventTypeMeta(event);
                  return (
                    <Pressable
                      key={event.id}
                      style={[styles.row, index === 0 && styles.rowFirst]}
                      onPress={() => router.push(`/(protected)/vice-principal/academic-calendar/${event.id}` as never)}
                    >
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
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  yearCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 16 },
  yearLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  yearValue: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  chipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  chipTextActive: { color: '#fff' },
  dateHeading: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.muted, marginBottom: 8 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
