// Vice Principal -> Profile (Phase 25) -- read-only, real backend data only.
// Name/email/roles from the existing, shared useMe() hook; designation/
// employee no/photo/join date from the new self-scoped GET /staff/me;
// school name/board/address/contact from the newly VICE_PRINCIPAL-granted
// GET /school. No edit action anywhere -- see vice-principal-profile-api.ts's
// own comment for why (no self-service write path exists in the real
// backend for any role). Guarded by the parent vice-principal/_layout.tsx.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { useMe } from '@/hooks/useMe';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getMyStaffProfile, getSchoolInfo } from '@/lib/vice-principal-profile-api';

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

function statusTone(status: string): StatusTone {
  if (status === 'ACTIVE') return 'positive';
  if (status === 'EXITED') return 'negative';
  return 'neutral';
}

function joinAddress(parts: (string | null)[]): string | null {
  const filled = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return filled.length > 0 ? filled.join(', ') : null;
}

export default function VicePrincipalProfileScreen() {
  const router = useRouter();
  const meQuery = useMe();
  const staffQuery = useQuery({ queryKey: ['vp-profile', 'staff'], queryFn: getMyStaffProfile });
  const schoolQuery = useQuery({ queryKey: ['vp-profile', 'school'], queryFn: getSchoolInfo });

  const isLoading = meQuery.isLoading || staffQuery.isLoading;

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Profile" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
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

  return (
    <View style={styles.flex}>
      <AppHeader title="Profile" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerCard]}>
          <Avatar firstName={person.firstName} lastName={person.lastName} photoUrl={staff.photoUrl} size={64} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {person.firstName} {person.lastName ?? ''}
            </Text>
            <Text style={styles.designation} numberOfLines={1}>
              {staff.designation ?? 'Vice Principal'}
            </Text>
          </View>
          <StatusBadge label={humanize(staff.status)} tone={statusTone(staff.status)} />
        </View>

        <Text style={styles.sectionTitle}>Personal information</Text>
        <View style={[styles.listCard, cardShadow]}>
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
        <View style={[styles.listCard, cardShadow]}>
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
          {staff.teacherCategory ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Teacher category</Text>
              <Text style={styles.infoValue}>{staff.teacherCategory}</Text>
            </View>
          ) : null}
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Teaching role</Text>
            <Text style={styles.infoValue}>{staff.isTeaching ? 'Yes' : 'No'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Date of joining</Text>
            <Text style={styles.infoValue}>{formatDate(staff.dateOfJoining)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Roles</Text>
        <View style={[styles.listCard, cardShadow]}>
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
            <View style={[styles.listCard, cardShadow]}>
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
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  designation: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, textAlign: 'right', flexShrink: 1 },
  infoValueWrap: { flex: 1 },
});
