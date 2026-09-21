// Sports Admin -> Calendar. Real listCalendarEvents()/createCalendarEvent()/
// updateCalendarEvent()/deleteCalendarEvent() -- same shared school-calendar
// backend every other role reads. Rebuilt as a real month grid (reusing
// principal/MonthGrid.tsx, the same date-math component School Calendar and
// My Attendance already share) to match the design's own month-grid pattern
// -- was previously a flat "Upcoming" list, a confirmed design mismatch.
// Edit/Delete are ownership-gated (only the creator can modify, enforced by
// the backend itself), same rule the website's own calendar page already
// follows.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader } from '@/components/sports/primitives';
import { MonthGrid } from '@/components/principal/MonthGrid';
import { getCurrentPersonId } from '@/lib/auth';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listAcademicYears,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEvent,
} from '@/lib/sports-api';

function firstOfMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}
function lastOfMonthStr(year: number, month: number): string {
  const last = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

export default function CalendarScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today.toISOString().slice(0, 10));
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const eventsQuery = useQuery({
    queryKey: ['sports-calendar', year, month],
    queryFn: () => listCalendarEvents({ fromDate: firstOfMonthStr(year, month), toDate: lastOfMonthStr(year, month) }),
  });
  const yearsQuery = useQuery({ queryKey: ['sports-academic-years'], queryFn: listAcademicYears, enabled: showAdd });
  const meQuery = useQuery({ queryKey: ['current-person-id'], queryFn: getCurrentPersonId });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of eventsQuery.data ?? []) {
      const list = map.get(e.startDate) ?? [];
      list.push(e);
      map.set(e.startDate, list);
    }
    return map;
  }, [eventsQuery.data]);

  const dayEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  const createMutation = useMutation({
    mutationFn: () => {
      const yr = yearsQuery.data?.find((y) => y.isCurrent) ?? yearsQuery.data?.[0];
      if (!title.trim() || !selectedDate || !yr) throw new Error('Enter a title and pick a date.');
      if (editingId) return updateCalendarEvent(editingId, { title: title.trim() });
      return createCalendarEvent({ academicYearId: yr.id, title: title.trim(), startDate: selectedDate, endDate: selectedDate, eventType: 'COMPETITION' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sports-calendar'] });
      setShowAdd(false);
      setTitle('');
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sports-calendar'] }),
  });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Calendar" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <MonthGrid
          year={year}
          month={month}
          onPrevMonth={() => {
            const d = new Date(year, month - 1, 1);
            setYear(d.getFullYear());
            setMonth(d.getMonth());
          }}
          onNextMonth={() => {
            const d = new Date(year, month + 1, 1);
            setYear(d.getFullYear());
            setMonth(d.getMonth());
          }}
          onSelectDay={setSelectedDate}
          selectedDateStr={selectedDate}
          renderDay={(dateStr) => (eventsByDate.has(dateStr) ? { dotColor: sportsColors.primary } : undefined)}
        />

        <Pressable
          style={styles.addButton}
          onPress={() => {
            setEditingId(null);
            setTitle('');
            setShowAdd((v) => !v);
          }}
        >
          <Text style={styles.addButtonText}>{showAdd ? 'Close' : '+ New event'}</Text>
        </Pressable>
        {showAdd ? (
          <Card style={{ gap: 10 }}>
            <Text style={styles.label}>{selectedDate ? `On ${new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'Pick a date on the grid above'}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={sportsColors.faint} style={styles.input} />
            {createMutation.isError ? <Text style={styles.error}>{(createMutation.error as Error).message}</Text> : null}
            <Pressable style={styles.saveButton} onPress={() => createMutation.mutate()}>
              <Text style={styles.addButtonText}>{createMutation.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Add event'}</Text>
            </Pressable>
          </Card>
        ) : null}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{selectedDate ? new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Events'}</Text>
          <Text style={styles.count}>{dayEvents.length} event{dayEvents.length === 1 ? '' : 's'}</Text>
        </View>
        {dayEvents.length === 0 ? (
          <EmptyPanel label="No events on this day." />
        ) : (
          dayEvents.map((e) => {
            const isMine = meQuery.data && e.createdBy === meQuery.data;
            return (
              <Card key={e.id} style={{ gap: 10 }}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.rowTitle}>{e.title}</Text>
                    <Text style={styles.rowSub}>{e.eventType.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                {e.description ? <Text style={styles.rowSub}>{e.description}</Text> : null}
                {isMine ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      style={styles.smallButton}
                      onPress={() => {
                        setEditingId(e.id);
                        setTitle(e.title);
                        setShowAdd(true);
                      }}
                    >
                      <Text style={styles.smallButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable style={styles.smallButtonDanger} onPress={() => deleteMutation.mutate(e.id)}>
                      <Text style={styles.smallButtonDangerText}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  addButton: { backgroundColor: sportsColors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  saveButton: { backgroundColor: sportsColors.primary, borderRadius: 11, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  label: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1, color: sportsColors.tertiary },
  input: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13.5, color: sportsColors.ink },
  error: { fontSize: 12.5, color: sportsColors.red },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingTop: 2 },
  title: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  count: { fontSize: 11.5, color: sportsColors.tertiary },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, lineHeight: 19 },
  rowSub: { fontSize: 12.5, color: sportsColors.mutedStrong },
  smallButton: { flex: 1, borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  smallButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong },
  smallButtonDanger: { flex: 1, borderWidth: 1, borderColor: sportsColors.red, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  smallButtonDangerText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.red },
});
