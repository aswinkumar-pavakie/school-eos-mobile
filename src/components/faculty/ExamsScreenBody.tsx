// Shared Exams body for both Faculty ("subjects I teach") and Class
// Teacher ("my whole advisor section, every subject") -- same backend
// endpoint, same UI: Upcoming/Finished tabs (bucketed client-side off each
// row's own real examDate, never a server guess at "now"), a per-subject
// filter chip row, and for Finished exams, tap through to student-wise
// marks.

import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listExamSubjects, type ExamSubjectRow } from '@/lib/faculty-exams-api';
import { formatDate } from '@/lib/format';
import { facultyColors, parentColors } from '@/lib/theme';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExamsScreenBody({ marksRouteBase }: { marksRouteBase: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'finished'>('upcoming');
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['faculty-exam-subjects'], queryFn: listExamSubjects });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const today = todayIso();

  const subjects = useMemo(
    () => [...new Map(rows.map((r) => [r.subjectName, r.subjectName])).values()].sort(),
    [rows],
  );

  const bucketed = useMemo(() => {
    const upcoming: ExamSubjectRow[] = [];
    const finished: ExamSubjectRow[] = [];
    for (const r of rows) {
      // No date set yet -- treat as upcoming (not yet happened), never
      // silently dropped from either list.
      if (r.examDate && r.examDate < today) finished.push(r);
      else upcoming.push(r);
    }
    upcoming.sort((a, b) => (a.examDate ?? '9999-99-99').localeCompare(b.examDate ?? '9999-99-99'));
    finished.sort((a, b) => (b.examDate ?? '').localeCompare(a.examDate ?? ''));
    return { upcoming, finished };
  }, [rows, today]);

  const active = (tab === 'upcoming' ? bucketed.upcoming : bucketed.finished).filter(
    (r) => !subjectFilter || r.subjectName === subjectFilter,
  );

  return (
    <View style={styles.flex}>
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabPill, tab === 'upcoming' && styles.tabPillActive]} onPress={() => setTab('upcoming')}>
          <Text style={[styles.tabPillText, tab === 'upcoming' && styles.tabPillTextActive]}>Upcoming ({bucketed.upcoming.length})</Text>
        </Pressable>
        <Pressable style={[styles.tabPill, tab === 'finished' && styles.tabPillActive]} onPress={() => setTab('finished')}>
          <Text style={[styles.tabPillText, tab === 'finished' && styles.tabPillTextActive]}>Finished ({bucketed.finished.length})</Text>
        </Pressable>
      </View>

      {subjects.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable style={[styles.chip, !subjectFilter && styles.chipActive]} onPress={() => setSubjectFilter(null)}>
            <Text style={[styles.chipText, !subjectFilter && styles.chipTextActive]}>All Subjects</Text>
          </Pressable>
          {subjects.map((s) => (
            <Pressable key={s} style={[styles.chip, subjectFilter === s && styles.chipActive]} onPress={() => setSubjectFilter(s)}>
              <Text style={[styles.chipText, subjectFilter === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
      >
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : active.length === 0 ? (
          <Text style={styles.emptyText}>{tab === 'upcoming' ? 'No upcoming exams.' : 'No finished exams yet.'}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {active.map((r) => (
              <Pressable
                key={`${r.examId}-${r.subjectOfferingId}`}
                style={styles.row}
                disabled={tab === 'upcoming'}
                onPress={() => router.push(`${marksRouteBase}/${r.subjectOfferingId}/${r.examId}` as never)}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle}>{r.subjectName} · {r.examName}</Text>
                  <Text style={styles.rowMeta}>
                    {r.gradeName} {r.sectionName}{r.examDate ? ` · ${formatDate(r.examDate)}` : ''}{r.startTime ? ` · ${r.startTime.slice(0, 5)}` : ''}
                  </Text>
                </View>
                {tab === 'finished' ? (
                  <View style={styles.viewBadge}>
                    <Text style={styles.viewBadgeText}>View marks</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  tabPill: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border },
  tabPillActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  tabPillText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  tabPillTextActive: { color: '#fff' },
  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderLight },
  chipActive: { backgroundColor: facultyColors.blueLight, borderColor: facultyColors.blue },
  chipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  chipTextActive: { color: facultyColors.blueDark },
  content: { padding: 16, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 13 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  viewBadge: { backgroundColor: facultyColors.blueLight, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  viewBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blueDark },
});
