// Vice Principal -> Examination detail (Phase 11) -- view-only, real backend
// data only. No create/edit/publish/marks-entry actions -- exams.controller.ts
// only grants VICE_PRINCIPAL the read methods this screen calls; every write
// method stays ADMIN-only, enforced server-side. No results/marks section --
// this backend has no Marks/Results model at all (confirmed by inspection),
// so none was invented. "Applicable classes & subjects" is derived from the
// same real schedule data Phase 10 uses -- "View full schedule" links
// straight into that existing screen rather than rebuilding it here.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getExamCoverage, getExamination } from '@/lib/vice-principal-examinations-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

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

export default function VicePrincipalExaminationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const examQuery = useQuery({ queryKey: ['vp-examinations', 'detail', id], queryFn: () => getExamination(id) });
  const coverageQuery = useQuery({ queryKey: ['vp-examinations', 'coverage', id], queryFn: () => getExamCoverage(id) });

  if (examQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Examination" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (examQuery.isError || !examQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Examination" onBack={() => router.back()} />
        <ErrorState
          message={examQuery.error instanceof ApiError ? examQuery.error.message : "Couldn't load this examination."}
          onRetry={() => examQuery.refetch()}
        />
      </View>
    );
  }

  const exam = examQuery.data;
  const meta = examStateMeta(exam.state);
  const coverage = coverageQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title={exam.name} subtitle={exam.academicYearName} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.infoValue}>{humanize(exam.examType)}</Text>
            <Text style={styles.infoMeta}>{exam.term ?? 'No term set'}</Text>
          </View>
          <StatusBadge {...meta} />
        </View>

        <Text style={styles.sectionTitle}>Examination information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grade scale</Text>
            <Text style={styles.infoValue}>{exam.gradeScaleName ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Marks entry opens</Text>
            <Text style={styles.infoValue}>{exam.marksEntryOpensAt ? formatDate(exam.marksEntryOpensAt) : '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Marks entry closes</Text>
            <Text style={styles.infoValue}>{exam.marksEntryClosesAt ? formatDate(exam.marksEntryClosesAt) : '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Published</Text>
            <Text style={styles.infoValue}>{exam.publishedAt ? formatDate(exam.publishedAt) : 'Not yet published'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Applicable classes</Text>
        {coverageQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : !coverage || coverage.classes.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No classes scheduled for this examination yet.</Text>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.infoValue}>{coverage.classes.join(', ')}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Subjects</Text>
        {coverageQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : !coverage || coverage.subjects.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No subjects scheduled for this examination yet.</Text>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.infoValue}>{coverage.subjects.join(', ')}</Text>
          </View>
        )}

        <Pressable
          style={styles.linkButton}
          onPress={() => router.push(`/(protected)/vice-principal/examination-timetable/${exam.id}` as never)}
        >
          <Text style={styles.linkButtonText}>View full schedule</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, lineHeight: 20 },
  infoMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  standaloneValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  linkButton: { alignItems: 'center', paddingVertical: 16, marginTop: 10 },
  linkButtonText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blue },
});
