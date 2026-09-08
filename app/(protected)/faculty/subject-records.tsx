// Subject Records -- teaching-offering scoped (subject teacher, not
// advisor). Pixel-matches the design: subject·class switcher, 3 stat cards,
// expandable per-student rows. The design's own fixed "Unit Test 1/2 +
// Assignment" mini-stats are replaced with however many real exams actually
// exist for this offering (dynamic, matching Marks Entry's own convention),
// shown as a wrapping row rather than 3 hardcoded slots.

import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ClassSwitcher } from '@/components/faculty/ClassSwitcher';
import { StatCards } from '@/components/faculty/StatCards';
import { ChevronDownIcon } from '@/components/faculty/icons';
import { listTeachingOfferings } from '@/lib/faculty-scope-api';
import { getSubjectRecords, type SubjectRecordStudent } from '@/lib/faculty-subject-records-api';
import { initialsOf } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

function gradeBadgeColors(grade: string | null) {
  if (grade === 'A+' || grade === 'A') return { bg: '#DCFCE7', fg: facultyColors.greenDark };
  if (grade === 'B') return { bg: facultyColors.blueLight, fg: facultyColors.blueDark };
  if (grade === 'C') return { bg: facultyColors.amberBg, fg: facultyColors.amberDark };
  return { bg: facultyColors.redBg, fg: facultyColors.redDark };
}

export default function SubjectRecordsScreen() {
  const router = useRouter();
  const [offeringOverride, setOfferingOverride] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const offeringsQuery = useQuery({ queryKey: ['faculty-teaching-offerings'], queryFn: listTeachingOfferings });
  const offeringKey = offeringOverride ?? offeringsQuery.data?.[0]?.subjectOfferingId ?? null;

  const options = useMemo(
    () => (offeringsQuery.data ?? []).map((o) => ({ key: o.subjectOfferingId, label: `${o.subjectName} · ${o.gradeName} ${o.sectionName}` })),
    [offeringsQuery.data],
  );

  const recordsQuery = useQuery({
    queryKey: ['faculty-subject-records', offeringKey],
    queryFn: () => getSubjectRecords(offeringKey!),
    enabled: !!offeringKey,
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="Subject Records" subtitle={options.find((o) => o.key === offeringKey)?.label ?? ''} onBack={() => router.replace('/erp' as never)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={recordsQuery.isFetching} onRefresh={() => recordsQuery.refetch()} />}
      >
        {offeringsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : options.length === 0 ? (
          <Text style={styles.emptyText}>You do not teach any subject offerings.</Text>
        ) : (
          <>
            <ClassSwitcher label="SUBJECT · CLASS" options={options} selectedKey={offeringKey} onSelect={setOfferingOverride} />

            {recordsQuery.isLoading ? (
              <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
            ) : recordsQuery.data ? (
              <>
                <StatCards
                  items={[
                    { label: 'STUDENTS', value: String(recordsQuery.data.studentCount) },
                    { label: 'CLASS AVG', value: recordsQuery.data.classAvg !== null ? `${recordsQuery.data.classAvg}%` : '—' },
                    { label: 'HIGHEST', value: recordsQuery.data.highest !== null ? `${recordsQuery.data.highest}%` : '—' },
                  ]}
                />

                <View style={styles.marksHeader}>
                  <Text style={styles.marksLabel}>MARKS</Text>
                </View>

                <View style={{ gap: 8 }}>
                  {recordsQuery.data.students.map((st) => (
                    <StudentRow key={st.studentId} student={st} open={openId === st.studentId} onToggle={() => setOpenId((id) => (id === st.studentId ? null : st.studentId))} />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StudentRow({ student, open, onToggle }: { student: SubjectRecordStudent; open: boolean; onToggle: () => void }) {
  const badge = gradeBadgeColors(student.grade);
  const [first = '', ...rest] = student.studentName.split(' ');
  return (
    <View style={styles.recordCard}>
      <Pressable style={styles.recordTop} onPress={onToggle}>
        <View style={styles.recordAvatar}>
          <Text style={styles.recordInitials}>{initialsOf(first, rest.join(' '))}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.recordName} numberOfLines={1}>{student.studentName}</Text>
          <Text style={styles.recordMeta}>Roll {student.rollNo ?? '—'} · {student.totalObtained}/{student.totalMax}</Text>
        </View>
        {student.grade ? (
          <View style={[styles.gradeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.gradeBadgeText, { color: badge.fg }]}>{student.grade} · {student.percent}%</Text>
          </View>
        ) : (
          <Text style={styles.noData}>No marks yet</Text>
        )}
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.recordDetail}>
          <View style={styles.examRow}>
            {student.exams.map((ex, i) => (
              <View key={i} style={styles.examCard}>
                <Text style={styles.examLabel} numberOfLines={1}>{ex.examName.toUpperCase()}</Text>
                <Text style={styles.examValue}>{ex.isAbsent ? 'Absent' : `${ex.marksObtained}/${ex.maxMarks}`}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.detailLine}>Attendance {student.attendancePercent}%</Text>
          <Text style={styles.detailLine}>Guardian {student.guardianPhone ?? '—'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  marksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginHorizontal: 4 },
  marksLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2 },
  recordCard: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, overflow: 'hidden' },
  recordTop: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: facultyColors.blueLight, alignItems: 'center', justifyContent: 'center' },
  recordInitials: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  recordName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  recordMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  gradeBadge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  gradeBadgeText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  noData: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
  recordDetail: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, backgroundColor: facultyColors.rowBg, padding: 13 },
  examRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  examCard: { flexGrow: 1, minWidth: 90, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.borderSoft, borderRadius: 10, padding: 9 },
  examLabel: { fontSize: 9.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.8 },
  examValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, marginTop: 3 },
  detailLine: { fontSize: 12.5, color: facultyColors.bodyMuted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 11 },
});
