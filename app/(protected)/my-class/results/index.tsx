// Report card -- exam picker. Pixel replica of the design reference's isReport
// exam slider, split into its own list screen per the app's route-per-step
// convention (fees term picker is a dropdown, this is a full list since exams
// are typically fewer than 4-6 a year and deserve their own row). Real
// GET /parent/students/:id/results/exams -- already published-only, server-side.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { listResultExams } from '@/lib/parent-api';
import { parentColors, cardShadow } from '@/lib/theme';

function ChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={parentColors.muted} strokeWidth={2.2}>
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export default function ReportCardScreen() {
  const router = useRouter();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;

  const examsQuery = useQuery({
    queryKey: ['result-exams', studentId],
    queryFn: () => listResultExams(studentId!),
    enabled: !!studentId,
  });

  if (!selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Report card" onBack={() => router.back()} />
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const subtitle = [selected.gradeName, selected.sectionName ? `Section ${selected.sectionName}` : null]
    .filter(Boolean)
    .join(' · ');
  const exams = examsQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title="Report card" subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={examsQuery.isFetching} onRefresh={() => examsQuery.refetch()} />}
      >
        {examsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : exams.length === 0 ? (
          <Text style={styles.emptyText}>No published results yet.</Text>
        ) : (
          exams.map((exam) => (
            <Pressable
              key={exam.examId}
              style={[styles.card, cardShadow]}
              onPress={() => router.push(`/my-class/results/${exam.examId}` as never)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.examName}>{exam.examName}</Text>
                <Text style={styles.examMeta}>{[exam.examType, exam.term].filter(Boolean).join(' · ')}</Text>
              </View>
              <ChevronRight />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  examName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  examMeta: { fontSize: 12.5, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
});
