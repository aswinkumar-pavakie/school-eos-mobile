// Report card -- one exam's marks. Pixel replica of the design reference's
// isReport block (exam node-slider, overall score, subject marks list, remark
// card). Real GET /parent/students/:id/results/exams/:examId.
//
// The design's own copy invents fields the real backend does not return --
// a per-subject teacher name, a letter grade, and a class rank. None of those
// exist on ResultSubjectRow/ResultDetail, so rather than fabricate them this
// screen substitutes real numbers already on hand: max marks per subject (in
// place of teacher), a computed pass/fail-style percent (in place of a letter
// grade), and the real total marks fraction (in place of rank). The "Class
// teacher's remark" card is similarly a client-side label computed from the
// real percent (see remarkFor below) -- never a fake backend remark field.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { getResults, listResultExams, type ResultSubjectRow } from '@/lib/parent-api';
import { parentColors, cardShadow } from '@/lib/theme';

function subjectCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase();
}

function remarkFor(percent: number): { label: string; text: string } {
  if (percent >= 90) return { label: 'Excellent', text: 'Excellent performance across subjects this exam.' };
  if (percent >= 75) return { label: 'Good', text: 'Good performance overall this exam.' };
  if (percent >= 50) return { label: 'Satisfactory', text: 'Satisfactory performance -- there is room to improve.' };
  return { label: 'Needs improvement', text: 'This exam shows scope for improvement -- extra support is recommended.' };
}

export default function ReportCardDetailScreen() {
  const router = useRouter();
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { selected } = useSelectedChild();
  const studentId = selected?.studentId ?? null;

  const examsQuery = useQuery({
    queryKey: ['result-exams', studentId],
    queryFn: () => listResultExams(studentId!),
    enabled: !!studentId,
  });
  const resultsQuery = useQuery({
    queryKey: ['results', studentId, examId],
    queryFn: () => getResults(studentId!, examId),
    enabled: !!studentId && !!examId,
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

  const exams = examsQuery.data ?? [];
  const currentExam = exams.find((e) => e.examId === examId);
  const result = resultsQuery.data;
  const subjects = result?.subjects ?? [];
  const hasMarks = subjects.some((s) => s.marksObtained !== null || s.isAbsent);
  const remark = result?.percent != null ? remarkFor(result.percent) : null;

  return (
    <View style={styles.flex}>
      <AppHeader
        title="Report card"
        subtitle={currentExam ? [currentExam.examType, currentExam.term].filter(Boolean).join(' · ') : undefined}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={resultsQuery.isFetching} onRefresh={() => resultsQuery.refetch()} />}
      >
        {exams.length > 1 ? (
          <View style={[styles.card, cardShadow]}>
            <View style={styles.examHeaderRow}>
              <Text style={styles.className} numberOfLines={1}>
                {[selected.gradeName, selected.sectionName].filter(Boolean).join(' ')}
              </Text>
              <Text style={styles.examWhen} numberOfLines={1}>{currentExam?.examName ?? ''}</Text>
            </View>
            <View style={styles.sliderWrap}>
              <View style={styles.sliderLine} />
              <View style={styles.sliderDotsRow}>
                {exams.map((exam) => (
                  <Pressable
                    key={exam.examId}
                    style={[styles.dot, exam.examId === examId && styles.dotActive]}
                    onPress={() => router.replace(`/my-class/results/${exam.examId}` as never)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.sliderLabelRow}>
              {exams.map((exam) => (
                <Text
                  key={exam.examId}
                  style={[styles.sliderLabel, exam.examId === examId && styles.sliderLabelActive]}
                  numberOfLines={1}
                >
                  {exam.examName}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {resultsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={[styles.card, cardShadow, styles.overallRow]}>
              <View>
                <Text style={styles.overallLabel}>OVERALL</Text>
                <Text style={styles.overallValue}>
                  {result?.percent != null ? Math.round(result.percent) : '—'}
                  {result?.percent != null ? <Text style={styles.overallSuffix}>%</Text> : null}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {remark ? (
                  <View style={styles.gradePill}>
                    <Text style={styles.gradePillText}>{remark.label}</Text>
                  </View>
                ) : null}
                <Text style={styles.overallMarks}>
                  {result ? `${result.totalObtained} / ${result.totalMax} marks` : ''}
                </Text>
              </View>
            </View>

            {!hasMarks ? (
              <View style={[styles.card, cardShadow, styles.emptyCard]}>
                <Text style={styles.emptyTitle}>Marks not published yet</Text>
                <Text style={styles.emptySub}>Subject marks appear here once the exam is evaluated.</Text>
              </View>
            ) : (
              <View style={[styles.card, cardShadow, styles.marksCard]}>
                {subjects.map((s, i) => (
                  <SubjectRow key={s.subjectName} subject={s} isLast={i === subjects.length - 1} />
                ))}
              </View>
            )}

            {remark && hasMarks ? (
              <View style={styles.remarkCard}>
                <Text style={styles.remarkTitle}>Performance summary</Text>
                <Text style={styles.remarkText}>{remark.text}</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SubjectRow({ subject, isLast }: { subject: ResultSubjectRow; isLast: boolean }) {
  const subjectPercent =
    subject.marksObtained != null && subject.maxMarks > 0
      ? Math.round((subject.marksObtained / subject.maxMarks) * 100)
      : null;
  return (
    <View style={[styles.subjectRow, !isLast && styles.subjectRowBorder]}>
      <View style={styles.subjectLeft}>
        <View style={styles.subjectIcon}>
          <Text style={styles.subjectIconText}>{subjectCode(subject.subjectName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName} numberOfLines={1}>{subject.subjectName}</Text>
          <Text style={styles.subjectMax}>Max marks {subject.maxMarks}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {subject.isAbsent ? (
          <Text style={styles.subjectAbsent}>Absent</Text>
        ) : subject.marksObtained == null ? (
          <Text style={styles.subjectPending}>Pending</Text>
        ) : (
          <>
            <Text style={styles.subjectScore}>
              {subject.marksObtained}
              <Text style={styles.subjectScoreMax}>/{subject.maxMarks}</Text>
            </Text>
            {subjectPercent != null ? <Text style={styles.subjectPercent}>{subjectPercent}%</Text> : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  examHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  className: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  examWhen: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginLeft: 8 },
  sliderWrap: { height: 18, marginTop: 20, justifyContent: 'center' },
  sliderLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 3,
    marginTop: -1.5,
    borderRadius: 99,
    backgroundColor: parentColors.fieldBorder,
  },
  sliderDotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2, borderColor: parentColors.fieldBorder },
  dotActive: { backgroundColor: parentColors.blueDeep, borderColor: parentColors.blueDeep },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  sliderLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, flex: 1, textAlign: 'center' },
  sliderLabelActive: { color: parentColors.blueDeep },
  overallRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  overallLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: 1.4, color: parentColors.muted },
  overallValue: { fontSize: 34, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 4, letterSpacing: -0.4 },
  overallSuffix: { fontSize: 16, color: parentColors.muted },
  gradePill: { backgroundColor: parentColors.pillBlueBg, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14 },
  gradePillText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  overallMarks: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 8 },
  emptyCard: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.bodyMuted },
  emptySub: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 6, textAlign: 'center' },
  marksCard: { padding: 0, overflow: 'hidden' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, paddingHorizontal: 16 },
  subjectRowBorder: { borderBottomWidth: 1, borderBottomColor: parentColors.borderSoft },
  subjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  subjectIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: parentColors.dueBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectIconText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  subjectName: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  subjectMax: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  subjectScore: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  subjectScoreMax: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  subjectPercent: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep, marginTop: 2 },
  subjectAbsent: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.redDark },
  subjectPending: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted },
  remarkCard: { backgroundColor: parentColors.pillBlueBg, borderRadius: 16, padding: 18 },
  remarkTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  remarkText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.bodyMuted, marginTop: 8, lineHeight: 20 },
});
