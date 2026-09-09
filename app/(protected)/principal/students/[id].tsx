// Principal -> Student detail -- view-only, real backend data only.
// students.controller.ts's class-level @Roles('ADMIN', 'PRINCIPAL') has NO
// VICE_PRINCIPAL grant, and Enrolments/Transport/Fees/Wallet carry no
// method-level override -- Principal genuinely sees more here than VP,
// confirmed by direct backend audit before writing this screen. No write
// actions anywhere (freeze/unfreeze wallet, section transfer, certificate
// upload, basic-info edit all stay ADMIN-only, enforced server-side, not
// just by this screen omitting buttons).

import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, initialsOf } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import {
  getAttendanceSummary,
  getStudent,
  getStudentFees,
  getStudentTransport,
  getStudentWallet,
  listEnrolments,
  listGuardians,
} from '@/lib/principal-students-api';

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

function feeStatusTone(status: string): StatusTone {
  if (status === 'PAID' || status === 'NO_ASSIGNMENT') return 'positive';
  if (status === 'OVERDUE') return 'negative';
  return 'warning';
}

function paise(v: string | number | null | undefined): string {
  const n = Number(v ?? 0) / 100;
  return `₹${n.toLocaleString('en-IN')}`;
}

export default function PrincipalStudentDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const studentQuery = useQuery({ queryKey: ['principal-students', 'detail', id], queryFn: () => getStudent(id) });
  const attendanceQuery = useQuery({ queryKey: ['principal-students', 'attendance', id], queryFn: () => getAttendanceSummary(id) });
  const guardiansQuery = useQuery({ queryKey: ['principal-students', 'guardians', id], queryFn: () => listGuardians(id) });
  const enrolmentsQuery = useQuery({ queryKey: ['principal-students', 'enrolments', id], queryFn: () => listEnrolments(id) });
  const transportQuery = useQuery({ queryKey: ['principal-students', 'transport', id], queryFn: () => getStudentTransport(id) });
  const feesQuery = useQuery({ queryKey: ['principal-students', 'fees', id], queryFn: () => getStudentFees(id) });
  const walletQuery = useQuery({ queryKey: ['principal-students', 'wallet', id], queryFn: () => getStudentWallet(id) });

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
  const enrolments = enrolmentsQuery.data ?? [];
  const transport = transportQuery.data ?? [];
  const fees = feesQuery.data;
  const wallet = walletQuery.data;

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
            <Text style={styles.infoLabel}>Admitted on</Text>
            <Text style={styles.infoValue}>{formatDate(student.admissionDate)}</Text>
          </View>
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

        <Text style={styles.sectionTitle}>Enrolment history</Text>
        {enrolmentsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : enrolments.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No enrolment history on record.</Text>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            {enrolments.map((e, index) => (
              <View key={e.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoValue}>{e.enrolmentType}{e.rollNo ? ` · Roll ${e.rollNo}` : ''}</Text>
                  <Text style={styles.infoLabel}>Enrolled {formatDate(e.enrolledOn)}</Text>
                </View>
                <StatusBadge label={e.status} tone={e.status === 'ACTIVE' ? 'positive' : 'neutral'} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Fees</Text>
        {feesQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : fees ? (
          <View style={[styles.card, cardShadow]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge label={fees.overallStatus.replace(/_/g, ' ')} tone={feeStatusTone(fees.overallStatus)} />
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Total due</Text>
              <Text style={styles.infoValue}>{paise(fees.totalDuePaise)}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Paid</Text>
              <Text style={styles.infoValue}>{paise(fees.totalPaidPaise)}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Overdue</Text>
              <Text style={styles.infoValue}>{paise(fees.totalOverduePaise)}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No fee assignment on record.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Wallet</Text>
        {walletQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : wallet ? (
          <View style={[styles.card, cardShadow]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Balance</Text>
              <Text style={styles.infoValue}>{paise(wallet.balancePaise)}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Status</Text>
              <StatusBadge label={wallet.status} tone={wallet.status === 'ACTIVE' ? 'positive' : wallet.status === 'FROZEN' ? 'negative' : 'neutral'} />
            </View>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>This student has no wallet on file.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Transport</Text>
        {transportQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : transport.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No transport allocation on record.</Text>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            {transport.map((t, index) => (
              <View key={t.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {t.routeName} · {t.stopName}
                  </Text>
                  <Text style={styles.infoLabel}>
                    {t.direction}
                    {t.vehicleRegistrationNo ? ` · ${t.vehicleRegistrationNo}` : ''}
                    {t.driverName ? ` · ${t.driverName}` : ''}
                  </Text>
                </View>
                <StatusBadge label={t.status} tone={t.status === 'ACTIVE' ? 'positive' : 'neutral'} />
              </View>
            ))}
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
