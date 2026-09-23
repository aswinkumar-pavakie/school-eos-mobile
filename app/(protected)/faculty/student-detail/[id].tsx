// One student's own real data -- guardians, attendance summary, fee
// status -- reached by tapping a row in the class roster (class-teacher.tsx).
// Real backend call only (faculty/students/:studentId), already scoped
// server-side to "a student in a class you are the class advisor of" --
// nothing client-side decides what this screen can show.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { getStudentDetail } from '@/lib/faculty-student-detail-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

function formatPaise(paise: string): string {
  return `₹${Math.round(Number(paise) / 100).toLocaleString('en-IN')}`;
}

export default function StudentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['faculty-student-detail', id],
    queryFn: () => getStudentDetail(id),
    enabled: !!id,
  });

  const data = query.data;
  const fullName = data ? `${data.student.firstName}${data.student.lastName ? ` ${data.student.lastName}` : ''}` : '';
  const classLabel = data?.student.gradeName && data?.student.sectionName ? `${data.student.gradeName} - ${data.student.sectionName}` : '';

  return (
    <View style={styles.flex}>
      <AppHeader title={fullName || 'Student'} subtitle={classLabel} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : query.isError ? (
          <Text style={styles.emptyText}>Could not load this student.</Text>
        ) : data ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>PROFILE</Text>
              <DetailLine label="Admission No" value={data.student.admissionNo} />
              <DetailLine label="Roll No" value={data.student.rollNo !== null ? String(data.student.rollNo) : '—'} />
              <DetailLine label="Date of Birth" value={data.student.dateOfBirth ? formatDate(data.student.dateOfBirth) : '—'} />
              <DetailLine label="Gender" value={data.student.gender ?? '—'} />
              <DetailLine label="Blood Group" value={data.student.bloodGroup ?? '—'} />
              <DetailLine label="Commute" value={data.student.isHosteller ? 'Hostel' : data.student.usesSchoolTransport ? 'School Transport' : 'Self'} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>ATTENDANCE</Text>
              <DetailLine label="Present" value={`${data.attendance.presentCount} / ${data.attendance.totalCount}`} />
              <DetailLine label="Percentage" value={data.attendance.percentage !== null ? `${data.attendance.percentage}%` : '—'} />
              {/* This is daily, whole-class attendance -- the schema marks
                  attendance once per day, not per period/subject, so there
                  is no real subject-wise number to show here yet. Shown
                  honestly rather than repeating this same figure under a
                  fake per-subject breakdown. */}
              <Text style={styles.attendanceNote}>Daily class attendance -- not tracked per subject/period yet.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>FEES</Text>
              <DetailLine label="Status" value={data.fees.overallStatus.replace(/_/g, ' ')} />
              <DetailLine label="Paid" value={formatPaise(data.fees.totalPaidPaise)} />
              <DetailLine label="Pending" value={formatPaise(data.fees.totalPendingPaise)} />
              {Number(data.fees.totalOverduePaise) > 0 ? (
                <DetailLine label="Overdue" value={formatPaise(data.fees.totalOverduePaise)} />
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>GUARDIANS</Text>
              {data.guardians.length === 0 ? (
                <Text style={styles.emptyText}>No guardian on record.</Text>
              ) : (
                data.guardians.map((g) => (
                  <View key={g.id} style={styles.guardianRow}>
                    <Text style={styles.guardianName}>
                      {g.firstName}{g.lastName ? ` ${g.lastName}` : ''} · {g.relationship}{g.isPrimaryContact ? ' (Primary)' : ''}
                    </Text>
                    {g.occupation ? <Text style={styles.guardianMeta}>{g.occupation}</Text> : null}
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 8 },
  card: { backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 14, gap: 8 },
  sectionLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginBottom: 2 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.bodyMuted },
  detailValue: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  guardianRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: facultyColors.borderSoft },
  guardianName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  guardianMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  attendanceNote: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: facultyColors.muted, marginTop: 4, fontStyle: 'italic' },
});
