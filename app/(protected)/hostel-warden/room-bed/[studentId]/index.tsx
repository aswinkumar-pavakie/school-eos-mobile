// Full student profile -- READ ONLY. Room/class/EMIS come from the already-fetched
// Room & Bed list (GET /hostel/room-allocations) -- no second GET
// /hostel/students/:id/room call, since that endpoint returns nothing this list
// doesn't already carry for one student. Guardian info is a separate, dedicated
// call (GET /hostel/students/:id/guardians) since it doesn't belong on the
// allocation list itself (a student can have more than one guardian).

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { ErrorState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { listRoomAllocations, listStudentGuardians } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { parentColors, cardShadow } from '@/lib/theme';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function StudentProfileScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const router = useRouter();
  const allocationsQuery = useQuery({ queryKey: ['hostel-warden', 'room-allocations'], queryFn: listRoomAllocations });
  const guardiansQuery = useQuery({
    queryKey: ['hostel-warden', 'student-guardians', studentId],
    queryFn: () => listStudentGuardians(studentId!),
    enabled: !!studentId,
  });

  const student = (allocationsQuery.data ?? []).find((row) => row.studentId === studentId);

  return (
    <View style={styles.flex}>
      <AppHeader title={student ? fullName(student.studentFirstName, student.studentLastName) : 'Student'} onBack={() => router.back()} />
      {allocationsQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : allocationsQuery.isError ? (
        <ErrorState
          message={allocationsQuery.error instanceof ApiError ? allocationsQuery.error.message : 'Unable to load profile.'}
          onRetry={() => allocationsQuery.refetch()}
        />
      ) : !student ? (
        <ErrorState message="Student not found in your hostel." onRetry={() => allocationsQuery.refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarRow}>
            <Avatar firstName={student.studentFirstName} lastName={student.studentLastName} photoUrl={student.photoUrl} size={88} />
            <Text style={styles.name}>{fullName(student.studentFirstName, student.studentLastName)}</Text>
            <Text style={styles.admissionNo}>{student.admissionNo}</Text>
          </View>

          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionTitle}>ACADEMIC</Text>
            <DetailRow label="Class" value={student.gradeName ? `${student.gradeName}${student.sectionName ? ` · ${student.sectionName}` : ''}` : 'Not enrolled this year'} />
            <DetailRow label="Admission no." value={student.admissionNo} />
            <DetailRow label="EMIS / State student ID" value={student.stateStudentId ?? 'Not on record'} />
          </View>

          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionTitle}>HOSTEL ALLOCATION</Text>
            <DetailRow label="Hostel" value={student.hostelName} />
            <DetailRow label="Block" value={student.blockName} />
            <DetailRow label="Floor" value={`Floor ${student.floorNo}`} />
            <DetailRow label="Room" value={student.roomNo} />
            <DetailRow label="Bed" value={student.bedNo} />
            <DetailRow label="Allocated from" value={formatDate(student.allocatedFrom)} />
          </View>

          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionTitle}>PARENT / GUARDIAN</Text>
            {guardiansQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 8 }} />
            ) : guardiansQuery.isError ? (
              <Text style={styles.noGuardians}>Unable to load guardian details.</Text>
            ) : (guardiansQuery.data ?? []).length === 0 ? (
              <Text style={styles.noGuardians}>No guardian on record.</Text>
            ) : (
              (guardiansQuery.data ?? []).map((guardian, index) => (
                <View key={guardian.personId} style={[styles.guardianRow, index > 0 && styles.guardianRowBorder]}>
                  <Avatar firstName={guardian.firstName} lastName={guardian.lastName} photoUrl={guardian.photoUrl} size={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guardianName}>
                      {fullName(guardian.firstName, guardian.lastName)}
                      {guardian.isPrimaryContact ? ' · Primary' : ''}
                    </Text>
                    <Text style={styles.guardianMeta}>{guardian.relationship}</Text>
                    {guardian.mobile ? <Text style={styles.guardianMeta}>{guardian.mobile}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  avatarRow: { alignItems: 'center', paddingVertical: 16, gap: 4 },
  name: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 10 },
  admissionNo: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted, letterSpacing: 1, marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  detailLabel: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  detailValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  noGuardians: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight },
  guardianRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  guardianRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  guardianName: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  guardianMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
