// Vice Principal -> Student detail (Phase 4) -- view-only, real backend data
// only. No edit/delete/promote/transfer/archive actions -- students.controller.ts
// only grants VICE_PRINCIPAL the four read methods this screen calls; every
// write method on that controller stays ADMIN-only, enforced server-side, not
// just by this screen omitting buttons. Deliberately shows no Transport/Fees/
// Wallet (Finance/Operations, out of this phase's scope) and no enrolment
// history (current grade/section already comes off the student row itself).

import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, initialsOf } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getAttendanceSummary, getStudent, listGuardians } from '@/lib/vice-principal-students-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function statusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', tone: 'positive' };
    case 'LEFT':
      return { label: 'Left', tone: 'negative' };
    case 'TC_ISSUED':
      return { label: 'TC issued', tone: 'warning' };
    default:
      return { label: 'Archived', tone: 'neutral' };
  }
}

export default function VicePrincipalStudentDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const studentQuery = useQuery({ queryKey: ['vp-students', 'detail', id], queryFn: () => getStudent(id) });
  const attendanceQuery = useQuery({ queryKey: ['vp-students', 'attendance', id], queryFn: () => getAttendanceSummary(id) });
  const guardiansQuery = useQuery({ queryKey: ['vp-students', 'guardians', id], queryFn: () => listGuardians(id) });

  if (studentQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Student" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (studentQuery.isError || !studentQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Student" onBack={() => router.back()} />
        <ErrorState
          message={studentQuery.error instanceof ApiError ? studentQuery.error.message : "Couldn't load this student."}
          onRetry={() => studentQuery.refetch()}
        />
      </View>
    );
  }

  const student = studentQuery.data;
  const meta = statusMeta(student.status);
  const attendance = attendanceQuery.data;
  const guardians = guardiansQuery.data ?? [];

  return (
    <View style={styles.flex}>
      <AppHeader title={`${student.firstName} ${student.lastName ?? ''}`} subtitle={student.admissionNo} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.identityCard, cardShadow]}>
          {student.photoUrl ? (
            <Image source={{ uri: student.photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initialsOf(student.firstName, student.lastName)}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.identityName} numberOfLines={1}>
              {student.firstName} {student.lastName ?? ''}
            </Text>
            <Text style={styles.identityMeta}>{student.admissionNo}</Text>
          </View>
          <StatusBadge {...meta} />
        </View>

        <Text style={styles.sectionTitle}>Academic</Text>
        <View style={[styles.card, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grade</Text>
            <Text style={styles.infoValue}>{student.gradeName ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Section</Text>
            <Text style={styles.infoValue}>{student.sectionName ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Roll no.</Text>
            <Text style={styles.infoValue}>{student.rollNo ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Admitted on</Text>
            <Text style={styles.infoValue}>{formatDate(student.admissionDate)}</Text>
          </View>
          {student.dateOfLeaving ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Left on</Text>
              <Text style={styles.infoValue}>{formatDate(student.dateOfLeaving)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Attendance</Text>
        {attendanceQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : attendance && attendance.totalCount > 0 ? (
          <View style={[styles.card, cardShadow, styles.attendanceRow]}>
            <View style={styles.attendanceStat}>
              <Text style={styles.attendanceValue}>{attendance.percentage}%</Text>
              <Text style={styles.infoLabel}>Attendance</Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={styles.attendanceValue}>{attendance.presentCount}</Text>
              <Text style={styles.infoLabel}>Present</Text>
            </View>
            <View style={styles.attendanceStat}>
              <Text style={styles.attendanceValue}>{attendance.totalCount}</Text>
              <Text style={styles.infoLabel}>Total sessions</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No attendance records yet.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Parent / guardian</Text>
        {guardiansQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : guardians.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No linked guardian on record.</Text>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            {guardians.map((guardian, index) => (
              <View key={guardian.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {guardian.firstName} {guardian.lastName ?? ''}
                  </Text>
                  <Text style={styles.infoLabel}>
                    {guardian.relationship}
                    {guardian.isPrimaryContact ? ' · Primary contact' : ''}
                    {guardian.isAuthorisedPickup ? ' · Authorised pickup' : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  identityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  avatarImage: { width: 54, height: 54, borderRadius: 27, backgroundColor: parentColors.borderSoft },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  identityName: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  identityMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  standaloneValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, paddingVertical: 14 },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  attendanceStat: { alignItems: 'center', gap: 4 },
  attendanceValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
});
