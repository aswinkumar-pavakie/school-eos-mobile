// Principal -> Settings -- Principal's own real web Settings page
// (principal/settings/page.tsx) shows exactly one thing: a read-only School
// Profile block via GET /school (broadened to PRINCIPAL specifically for
// this read, confirmed by direct backend audit). It deliberately excludes
// Roles catalog, Document Retention Policies, and Terminal/device
// registration -- all three stay ADMIN-only end-to-end, "no backend
// broadening, no frontend page," per the web page's own header comment,
// because the approved product doc has no leadership callout for these
// areas. This screen adapts that exact real scope -- narrower than Vice
// Principal's own Settings screen in one dimension (VP has none of this
// School Profile section) but real and Principal-specific either way; do
// not add the Roles/Retention/Terminal sections VP doesn't have and
// Principal's own web app deliberately excludes too.
//
// Account section (change password / log out) and About section (app
// version) are the same real, already-existing capabilities every other
// role's Settings screen already uses -- not duplicated, not invented.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { ErrorState } from '@/components/ScreenStates';
import { useMe } from '@/hooks/useMe';
import { ApiError } from '@/lib/api';
import { logout } from '@/lib/auth';
import { parentColors } from '@/lib/theme';
import { getSchoolInfo } from '@/lib/principal-profile-api';

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

function joinAddress(parts: (string | null)[]): string | null {
  const filled = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return filled.length > 0 ? filled.join(', ') : null;
}

function SettingsRow({
  label,
  detail,
  onPress,
  destructive,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={parentColors.muted} />
    </Pressable>
  );
}

export default function PrincipalSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useMe();
  const schoolQuery = useQuery({ queryKey: ['principal-settings', 'school'], queryFn: getSchoolInfo });

  async function handleLogout() {
    await logout();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  const person = meQuery.data?.person;
  const roles = meQuery.data?.roles ?? [];
  const primaryRole = roles.find((r) => r.role_code === 'PRINCIPAL') ?? roles[0];
  const school = schoolQuery.data;
  const schoolAddress = school
    ? joinAddress([school.addressLine1, school.addressLine2, school.city, school.district, school.state, school.pincode])
    : null;

  return (
    <View style={styles.flex}>
      <AppHeader title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {meQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginBottom: 12 }} />
        ) : person ? (
          <Pressable
            style={[styles.card, cardShadow, styles.identityCard]}
            onPress={() => router.push('/(protected)/principal/profile' as never)}
          >
            <Avatar firstName={person.firstName} lastName={person.lastName} size={48} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.identityName} numberOfLines={1}>
                {person.firstName} {person.lastName ?? ''}
              </Text>
              <Text style={styles.identityRole} numberOfLines={1}>
                {primaryRole ? humanize(primaryRole.role_code) : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={parentColors.muted} />
          </Pressable>
        ) : null}

        <Text style={styles.sectionTitle}>School profile</Text>
        {schoolQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginBottom: 12 }} />
        ) : schoolQuery.isError ? (
          <ErrorState
            message={schoolQuery.error instanceof ApiError ? schoolQuery.error.message : 'Unable to load school profile.'}
            onRetry={() => schoolQuery.refetch()}
          />
        ) : school ? (
          <View style={[styles.listCard, cardShadow]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>School</Text>
              <Text style={[styles.infoValue, styles.infoValueWrap]}>{school.name}</Text>
            </View>
            <View style={[styles.infoRow, styles.divider]}>
              <Text style={styles.infoLabel}>Board</Text>
              <Text style={[styles.infoValue, styles.infoValueWrap]}>{school.board}</Text>
            </View>
            {schoolAddress ? (
              <View style={[styles.infoRow, styles.divider]}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={[styles.infoValue, styles.infoValueWrap]}>{schoolAddress}</Text>
              </View>
            ) : null}
            {school.contactPhone ? (
              <View style={[styles.infoRow, styles.divider]}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{school.contactPhone}</Text>
              </View>
            ) : null}
            {school.contactEmail ? (
              <View style={[styles.infoRow, styles.divider]}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{school.contactEmail}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={[styles.listCard, cardShadow]}>
          <SettingsRow
            label="Change password"
            detail="Reset your password by email or phone OTP"
            onPress={() => router.push('/(auth)/forgot-password' as never)}
          />
          <View style={styles.divider} />
          <SettingsRow label="Log out" onPress={handleLogout} destructive />
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App</Text>
            <Text style={styles.infoValue}>{Constants.expoConfig?.name ?? 'School EOS'}</Text>
          </View>
          <View style={[styles.infoRow, styles.divider]}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{Constants.expoConfig?.version ?? '—'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  identityName: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  identityRole: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  row: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowLabelDestructive: { color: '#B33A2E' },
  rowDetail: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  divider: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, textAlign: 'right', flexShrink: 1 },
  infoValueWrap: { flex: 1 },
});
