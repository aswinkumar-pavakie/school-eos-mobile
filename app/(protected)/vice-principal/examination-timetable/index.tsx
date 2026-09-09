// Vice Principal -> Examination Timetable (Phase 10) -- list of real
// examinations (reuses listExaminations from Phase 3's dashboard API rather
// than duplicating it), tap through to each one's real per-subject schedule.
// Guarded by the parent vice-principal/_layout.tsx.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { listExaminations } from '@/lib/vice-principal-exam-timetable-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function examStateMeta(state: string): { label: string; tone: StatusTone } {
  switch (state) {
    case 'PUBLISHED':
    case 'LOCKED':
      return { label: humanize(state), tone: 'positive' };
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral' };
    default:
      return { label: humanize(state), tone: 'warning' };
  }
}

export default function VicePrincipalExamTimetableScreen() {
  const router = useRouter();
  const examsQuery = useQuery({ queryKey: ['vp-exam-timetable', 'exams'], queryFn: () => listExaminations() });
  const exams = examsQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Examination Timetable" subtitle="Scheduled examinations" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {examsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : examsQuery.isError ? (
          <ErrorState
            message={examsQuery.error instanceof ApiError ? examsQuery.error.message : 'Unable to load examinations.'}
            onRetry={() => examsQuery.refetch()}
          />
        ) : exams.length === 0 ? (
          <EmptyState message="No examinations on record." />
        ) : (
          <View style={styles.list}>
            {exams.map((exam, index) => {
              const meta = examStateMeta(exam.state);
              return (
                <Pressable
                  key={exam.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/vice-principal/examination-timetable/${exam.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {exam.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {humanize(exam.examType)}
                      {exam.term ? ` · ${exam.term}` : ''}
                      {exam.academicYearName ? ` · ${exam.academicYearName}` : ''}
                    </Text>
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
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
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
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
