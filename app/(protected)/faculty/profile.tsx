// Faculty -> Profile (tap the Home greeting card's avatar). Real name/
// email/roles from useMe(), real designation/employee no/join date/
// qualifications/training from getMyStaffProfile() (GET /staff/me, now
// granted to FACULTY -- see staff.controller.ts's own comment), real
// school info from getSchoolInfo() (GET /school) -- the same three real
// endpoints Principal/Vice Principal/Sports Admin's own Profile screens
// already use. Read-only: no self-service edit path exists in the real
// backend for any role.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { useMe } from '@/hooks/useMe';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';
import { getMyStaffProfile, getSchoolInfo } from '@/lib/faculty-profile-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function joinAddress(parts: (string | null)[]): string | null {
  const filled = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return filled.length > 0 ? filled.join(', ') : null;
}

export default function FacultyProfileScreen() {
  const router = useRouter();
  const meQuery = useMe();
  const staffQuery = useQuery({ queryKey: ['faculty-profile', 'staff'], queryFn: getMyStaffProfile });
  const schoolQuery = useQuery({ queryKey: ['faculty-profile', 'school'], queryFn: getSchoolInfo });

  const isLoading = meQuery.isLoading || staffQuery.isLoading;

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Profile" onBack={() => router.back()} />
        <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (meQuery.isError || staffQuery.isError || !meQuery.data || !staffQuery.data) {
    const error = meQuery.error ?? staffQuery.error;
    return (
      <View style={styles.flex}>
        <AppHeader title="Profile" onBack={() => router.back()} />
        <ErrorState
          message={error instanceof ApiError ? error.message : "Couldn't load your profile."}
          onRetry={() => {
            meQuery.refetch();
            staffQuery.refetch();
          }}
        />
      </View>
    );
  }

  const { person, roles } = meQuery.data;
  const staff = staffQuery.data;
  const school = schoolQuery.data;
  const staffAddress = joinAddress([staff.addressLine1, staff.addressLine2, staff.city, staff.state, staff.pincode]);
  const schoolAddress = school
    ? joinAddress([school.addressLine1, school.addressLine2, school.city, school.district, school.state, school.pincode])
    : null;
  const hasQualifications =
    staff.highestQualification || staff.specialization || staff.university || staff.yearOfGraduation !== null || staff.tetNetCleared !== null;
  const hasRecognition = staff.areasOfExpertise || staff.certifications || staff.workshopsTraining || staff.achievementsAwards;

  return (
    <View style={styles.flex}>
      <AppHeader title="Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Avatar firstName={person.firstName} lastName={person.lastName} photoUrl={staff.photoUrl} size={64} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {person.firstName} {person.lastName ?? ''}
            </Text>
            <Text style={styles.designation} numberOfLines={1}>
              {staff.designation ?? 'Faculty'}
            </Text>
          </View>
          <View style={[styles.statusPill, staff.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, staff.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextInactive]}>
              {staff.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.listCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{person.email ?? '—'}</Text>
          </View>
          {staffAddress ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={[styles.infoValue, styles.infoValueWrap]}>{staffAddress}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Professional information</Text>
        <View style={styles.listCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Designation</Text>
            <Text style={styles.infoValue}>{staff.designation ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Employee no.</Text>
            <Text style={styles.infoValue}>{staff.employeeNo}</Text>
          </View>
          {staff.postType ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Post type</Text>
              <Text style={styles.infoValue}>{humanize(staff.postType)}</Text>
            </View>
          ) : null}
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Date of joining</Text>
            <Text style={styles.infoValue}>{formatDate(staff.dateOfJoining)}</Text>
          </View>
          {staff.experienceYears !== null ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Experience</Text>
              <Text style={styles.infoValue}>{staff.experienceYears} year{staff.experienceYears === 1 ? '' : 's'}</Text>
            </View>
          ) : null}
          {staff.staffRoom ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Staff room</Text>
              <Text style={styles.infoValue}>{staff.staffRoom}</Text>
            </View>
          ) : null}
        </View>

        {hasQualifications ? (
          <>
            <Text style={styles.sectionTitle}>Qualifications</Text>
            <View style={styles.listCard}>
              {staff.highestQualification ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Highest qualification</Text>
                  <Text style={styles.infoValue}>{staff.highestQualification}</Text>
                </View>
              ) : null}
              {staff.specialization ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Specialization</Text>
                  <Text style={styles.infoValue}>{staff.specialization}</Text>
                </View>
              ) : null}
              {staff.university ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>University</Text>
                  <Text style={[styles.infoValue, styles.infoValueWrap]}>{staff.university}</Text>
                </View>
              ) : null}
              {staff.yearOfGraduation !== null ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Year of graduation</Text>
                  <Text style={styles.infoValue}>{staff.yearOfGraduation}</Text>
                </View>
              ) : null}
              {staff.tetNetCleared !== null ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>TET/NET cleared</Text>
                  <Text style={styles.infoValue}>{staff.tetNetCleared ? 'Yes' : 'No'}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {hasRecognition ? (
          <>
            <Text style={styles.sectionTitle}>Recognition &amp; training</Text>
            <View style={styles.listCard}>
              {staff.areasOfExpertise ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Areas of expertise</Text>
                  <Text style={[styles.infoValue, styles.infoValueWrap]}>{staff.areasOfExpertise}</Text>
                </View>
              ) : null}
              {staff.certifications ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Certifications</Text>
                  <Text style={[styles.infoValue, styles.infoValueWrap]}>{staff.certifications}</Text>
                </View>
              ) : null}
              {staff.workshopsTraining ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Workshops &amp; training</Text>
                  <Text style={[styles.infoValue, styles.infoValueWrap]}>{staff.workshopsTraining}</Text>
                </View>
              ) : null}
              {staff.achievementsAwards ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Achievements &amp; awards</Text>
                  <Text style={[styles.infoValue, styles.infoValueWrap]}>{staff.achievementsAwards}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Roles</Text>
        <View style={styles.listCard}>
          {roles.map((role, index) => (
            <View key={`${role.role_code}-${role.scope_type}`} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
              <Text style={styles.infoValue}>{humanize(role.role_code)}</Text>
              <Text style={styles.infoLabel}>{humanize(role.scope_type)}-wide</Text>
            </View>
          ))}
        </View>

        {school ? (
          <>
            <Text style={styles.sectionTitle}>School information</Text>
            <View style={styles.listCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>School</Text>
                <Text style={[styles.infoValue, styles.infoValueWrap]}>{school.name}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Board</Text>
                <Text style={[styles.infoValue, styles.infoValueWrap]}>{school.board}</Text>
              </View>
              {schoolAddress ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={[styles.infoValue, styles.infoValueWrap]}>{schoolAddress}</Text>
                </View>
              ) : null}
              {school.contactPhone ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{school.contactPhone}</Text>
                </View>
              ) : null}
              {school.contactEmail ? (
                <View style={[styles.infoRow, styles.infoRowBorder]}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{school.contactEmail}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.surface },
  content: { padding: 16, paddingBottom: 32 },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 18 },
  name: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  designation: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusActive: { backgroundColor: facultyColors.greenBg },
  statusInactive: { backgroundColor: facultyColors.redBg },
  statusText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  statusTextActive: { color: facultyColors.greenDark },
  statusTextInactive: { color: facultyColors.redDark },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, marginTop: 18, marginBottom: 10 },
  listCard: { borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink, textAlign: 'right', flexShrink: 1 },
  infoValueWrap: { flex: 1 },
});
