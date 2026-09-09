// Class Results -- class-advisor only, whole-class results across every
// subject for one real exam. Pixel-matches the design's stat-card + grade-
// distribution + toppers structure, populated with real aggregated data
// (see faculty-class-results-api.ts).

import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { StatCards } from '@/components/faculty/StatCards';
import { ChevronDownIcon } from '@/components/faculty/icons';
import { listAdvisorSections } from '@/lib/faculty-scope-api';
import { listExamsForSection, getClassResults, type TopperEntry } from '@/lib/faculty-class-results-api';
import { facultyColors } from '@/lib/theme';

export default function ClassResultsScreen() {
  const router = useRouter();
  const [sectionOverride, setSectionOverride] = useState<string | null>(null);
  // Keyed to the section it was picked under -- a section change naturally
  // "resets" the exam pick, no separate reset-effect needed.
  const [examOverride, setExamOverride] = useState<{ sectionKey: string; examId: string } | null>(null);
  const [openBand, setOpenBand] = useState<string | null>(null);
  const [openTopper, setOpenTopper] = useState<string | null>(null);

  const sectionsQuery = useQuery({ queryKey: ['faculty-advisor-sections'], queryFn: listAdvisorSections });
  const sectionKey = sectionOverride ?? sectionsQuery.data?.[0]?.sectionId ?? null;
  const options = useMemo(
    () => (sectionsQuery.data ?? []).map((s) => ({ key: s.sectionId, label: `${s.gradeName} - ${s.sectionName}` })),
    [sectionsQuery.data],
  );

  const examsQuery = useQuery({
    queryKey: ['faculty-class-results-exams', sectionKey],
    queryFn: () => listExamsForSection(sectionKey!),
    enabled: !!sectionKey,
  });
  const examId = (examOverride?.sectionKey === sectionKey ? examOverride.examId : null) ?? examsQuery.data?.[0]?.examId ?? null;

  const resultsQuery = useQuery({
    queryKey: ['faculty-class-results', sectionKey, examId],
    queryFn: () => getClassResults(sectionKey!, examId!),
    enabled: !!sectionKey && !!examId,
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="Class Results" subtitle={options.find((o) => o.key === sectionKey)?.label ?? ''} onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={resultsQuery.isFetching} onRefresh={() => resultsQuery.refetch()} />}
      >
        {sectionsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : options.length === 0 ? (
          <Text style={styles.emptyText}>You are not the class advisor for any section.</Text>
        ) : (
          <>
            <ClassSwitcher options={options} selectedKey={sectionKey} onSelect={setSectionOverride} />

            {examsQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
            ) : (examsQuery.data ?? []).length === 0 ? (
              <Text style={styles.emptyText}>No published exams for this class yet.</Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examTabRow}>
                  {(examsQuery.data ?? []).map((ex) => {
                    const active = ex.examId === examId;
                    return (
                      <Pressable key={ex.examId} style={[styles.examTab, active && styles.examTabActive]} onPress={() => sectionKey && setExamOverride({ sectionKey, examId: ex.examId })}>
                        <Text style={[styles.examTabText, active && styles.examTabTextActive]} numberOfLines={1}>{ex.examName}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {resultsQuery.isLoading ? (
                  <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
                ) : resultsQuery.data ? (
                  <>
                    <StatCards
                      items={[
                        { label: 'CLASS AVG', value: resultsQuery.data.classAvg !== null ? `${resultsQuery.data.classAvg}%` : '—' },
                        { label: 'PASS', value: `${resultsQuery.data.pass.count}/${resultsQuery.data.pass.total}` },
                        { label: 'TOPPER', value: resultsQuery.data.topper !== null ? `${resultsQuery.data.topper}%` : '—' },
                      ]}
                    />

                    <Text style={styles.sectionLabel}>GRADE DISTRIBUTION</Text>
                    <View style={{ gap: 8 }}>
                      {resultsQuery.data.gradeDistribution.map((band) => {
                        const open = openBand === band.grade;
                        return (
                          <View key={band.grade} style={styles.rowCard}>
                            <Pressable style={styles.rowTop} onPress={() => setOpenBand(open ? null : band.grade)}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.rowTitle}>{band.label}</Text>
                                <Text style={styles.rowMeta}>{band.count} students</Text>
                              </View>
                              <Text style={styles.rowRight}>{band.percentOfClass}%</Text>
                              <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                                <ChevronDownIcon />
                              </View>
                            </Pressable>
                            {open && band.students.length > 0 ? (
                              <View style={styles.rowDetail}>
                                {band.students.map((st, i) => (
                                  <Text key={i} style={styles.listLine}>{st.studentName} · {st.percent}%</Text>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>

                    <Text style={styles.sectionLabel}>TOPPERS</Text>
                    <View style={{ gap: 8 }}>
                      {resultsQuery.data.toppers.map((t) => (
                        <TopperRow key={t.studentId} topper={t} open={openTopper === t.studentId} onToggle={() => setOpenTopper((id) => (id === t.studentId ? null : t.studentId))} />
                      ))}
                    </View>
                  </>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TopperRow({ topper, open, onToggle }: { topper: TopperEntry; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.rowCard}>
      <Pressable style={styles.rowTop} onPress={onToggle}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle}>{topper.studentName} · Roll {topper.rollNo ?? '—'}</Text>
          <Text style={styles.rowMeta}>Total {topper.totalObtained}/{topper.totalMax}</Text>
        </View>
        <Text style={styles.rowRight}>{topper.percent}%</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.rowDetail}>
          {topper.subjects.map((s, i) => (
            <View key={i} style={styles.detailLine}>
              <Text style={styles.detailLabel}>{s.subjectName}</Text>
              <Text style={styles.detailValue}>{s.isAbsent ? 'Absent' : `${s.marksObtained}/${s.maxMarks}`}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  examTabRow: { flexDirection: 'row', gap: 6, backgroundColor: facultyColors.chipTrack, borderRadius: 12, padding: 4 },
  examTab: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9 },
  examTabActive: { backgroundColor: facultyColors.blue },
  examTabText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.bodyMuted },
  examTabTextActive: { color: '#fff' },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  rowCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, overflow: 'hidden' },
  rowTop: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  rowRight: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.bodyMuted },
  rowDetail: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, backgroundColor: facultyColors.rowBg, padding: 12, gap: 6 },
  listLine: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.ink },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.bodyMuted },
  detailValue: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
});
