// Sports Admin -> Profile. Real name/email/roles from useMe(), real
// designation/employee no/join date from getMyStaffProfile() (GET
// /staff/me), real school info from getSchoolInfo() (GET /school) -- the
// exact same three real endpoints Principal/Vice Principal's own Profile
// screens already use. Read-only: no self-service edit path exists in the
// real backend for any role.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/Avatar';
import { ErrorState } from '@/components/ScreenStates';
import { SportsSubHeader, StatusPill } from '@/components/sports/primitives';
import { useMe } from '@/hooks/useMe';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { sportsColors } from '@/lib/theme';
import { getMyStaffProfile, getSchoolInfo } from '@/lib/sports-profile-api';

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

export default function SportsProfileScreen() {
  const router = useRouter();
  const meQuery = useMe();
  const staffQuery = useQuery({ queryKey: ['sports-profile', 'staff'], queryFn: getMyStaffProfile });
  const schoolQuery = useQuery({ queryKey: ['sports-profile', 'school'], queryFn: getSchoolInfo });

  const isLoading = meQuery.isLoading || staffQuery.isLoading;

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <SportsSubHeader title="Profile" onBack={() => router.back()} />
        <ActivityIndicator color={sportsColors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (meQuery.isError || staffQuery.isError || !meQuery.data || !staffQuery.data) {
    const error = meQuery.error ?? staffQuery.error;
    return (
      <View style={styles.flex}>
        <SportsSubHeader title="Profile" onBack={() => router.back()} />
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

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Avatar firstName={person.firstName} lastName={person.lastName} photoUrl={staff.photoUrl} size={64} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{person.firstName} {person.lastName ?? ''}</Text>
            <Text style={styles.designation} numberOfLines={1}>{staff.designation ?? 'Sports Admin'}</Text>
          </View>
          <StatusPill label={staff.status === 'ACTIVE' ? 'active' : 'inactive'} />
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
        </View>

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
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32 },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: sportsColors.border, borderRadius: 16, padding: 18 },
  name: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  designation: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: sportsColors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink, marginTop: 18, marginBottom: 10 },
  listCard: { borderWidth: 1, borderColor: sportsColors.border, borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: sportsColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: sportsColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.ink, textAlign: 'right', flexShrink: 1 },
  infoValueWrap: { flex: 1 },
});
