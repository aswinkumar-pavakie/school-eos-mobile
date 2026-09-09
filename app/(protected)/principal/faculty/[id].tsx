// Principal -> Faculty detail -- view-only, real backend data only. No
// edit/create/exit actions -- staff.controller.ts's own read methods are the
// same ones VP calls; every write method stays ADMIN-only, enforced
// server-side. "Roles" is NEW here -- Class Advisor / Academic Coordinator /
// Sports Faculty assignments, from role-assignments.controller.ts, which has
// NO VICE_PRINCIPAL grant at all (confirmed by direct backend audit) --
// Principal genuinely sees more here than VP. "Assignments" is the DISTINCT
// set of classes/sections/subjects derived from real timetable slots -- shown
// as a plain list, never a day/period grid (that's Class Timetable).

import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, initialsOf } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getAttendanceSummary, getFaculty, listRoleAssignments, listTimetableSlots } from '@/lib/principal-faculty-api';

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
    case 'ON_LEAVE':
      return { label: 'On leave', tone: 'warning' };
    default:
      return { label: 'Exited', tone: 'negative' };
  }
}

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PrincipalFacultyDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const facultyQuery = useQuery({ queryKey: ['principal-faculty', 'detail', id], queryFn: () => getFaculty(id) });
  const attendanceQuery = useQuery({ queryKey: ['principal-faculty', 'attendance', id], queryFn: () => getAttendanceSummary(id) });
  const slotsQuery = useQuery({ queryKey: ['principal-faculty', 'timetable', id], queryFn: () => listTimetableSlots(id) });
  const rolesQuery = useQuery({ queryKey: ['principal-faculty', 'roles', id], queryFn: () => listRoleAssignments(id) });

  if (facultyQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Faculty" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (facultyQuery.isError || !facultyQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Faculty" onBack={() => router.back()} />
        <ErrorState
          message={facultyQuery.error instanceof ApiError ? facultyQuery.error.message : "Couldn't load this faculty member."}
          onRetry={() => facultyQuery.refetch()}
        />
      </View>
    );
  }

  const member = facultyQuery.data;
  const meta = statusMeta(member.status);
  const attendance = attendanceQuery.data;
  const roles = (rolesQuery.data ?? []).filter((r) => r.status === 'ACTIVE');

  const assignments = Array.from(
    new Map(
      (slotsQuery.data ?? []).map((slot) => [
        `${slot.gradeName}|${slot.sectionName}|${slot.subjectName}`,
        { gradeName: slot.gradeName, sectionName: slot.sectionName, subjectName: slot.subjectName },
      ]),
    ).values(),
  );

  return (
    <View style={styles.flex}>
      <AppHeader title={`${member.firstName} ${member.lastName ?? ''}`} subtitle={member.employeeNo} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.identityCard, cardShadow]}>
          {member.photoUrl ? (
            <Image source={{ uri: member.photoUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initialsOf(member.firstName, member.lastName)}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.identityName} numberOfLines={1}>
              {member.firstName} {member.lastName ?? ''}
            </Text>
            <Text style={styles.identityMeta}>{member.employeeNo}</Text>
          </View>
          <StatusBadge {...meta} />
        </View>

        <Text style={styles.sectionTitle}>Professional</Text>
        <View style={[styles.card, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Designation</Text>
            <Text style={styles.infoValue}>{member.designation ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoValue}>{member.teacherCategory ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Teaching staff</Text>
            <Text style={styles.infoValue}>{member.isTeaching ? 'Yes' : 'No'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Joined on</Text>
            <Text style={styles.infoValue}>{formatDate(member.dateOfJoining)}</Text>
          </View>
          {member.dateOfExit ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Exited on</Text>
              <Text style={styles.infoValue}>{formatDate(member.dateOfExit)}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Roles</Text>
        {rolesQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : roles.length === 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No additional role assignments on record.</Text>
          </View>
        ) : (
          <View style={[styles.card, cardShadow]}>
            {roles.map((role, index) => (
              <View key={role.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoValue}>{humanize(role.roleCode)}</Text>
                  <Text style={styles.infoLabel} numberOfLines={1}>
                    {role.scopeName ?? role.scopeStage ?? humanize(role.scopeType)}
                    {role.academicYearName ? ` · ${role.academicYearName}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

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

        {member.isTeaching ? (
          <>
            <Text style={styles.sectionTitle}>Assignments</Text>
            {slotsQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
            ) : assignments.length === 0 ? (
              <View style={[styles.card, cardShadow]}>
                <Text style={styles.standaloneValue}>No class assignments on record.</Text>
              </View>
            ) : (
              <View style={[styles.card, cardShadow]}>
                {assignments.map((a, index) => (
                  <View key={`${a.gradeName}-${a.sectionName}-${a.subjectName}`} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                    <Text style={styles.infoValue}>
                      {a.gradeName} {a.sectionName}
                    </Text>
                    <Text style={styles.infoLabel}>{a.subjectName}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
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
