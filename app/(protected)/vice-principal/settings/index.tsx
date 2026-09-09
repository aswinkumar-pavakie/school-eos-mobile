// Vice Principal -> Settings (Phase 26) -- deliberately minimal. No
// preference/notification-settings model, no theme/language system, and no
// authenticated "change password while logged in" endpoint exist anywhere
// in the real backend (verified by inspection: zero preference tables, zero
// i18n/theme infrastructure in this app, and identity.controller.ts /
// password-reset.controller.ts together only expose the pre-login OTP-based
// reset flow) -- so none of those were fabricated here, per this phase's
// own instruction not to invent settings the architecture doesn't support.
//
// What IS real and is reused as-is:
//   - Change password -> the existing (auth)/forgot-password screen (same
//     OTP-based reset flow the login screen's own "Forgot password?" link
//     uses) -- not a new authentication system, just a link to it.
//   - Log out -> the existing logout() from src/lib/auth.ts, the exact same
//     function and queryClient-clear/redirect sequence app/(protected)/
//     index.tsx's own handleSignOut() already uses for Faculty/Community.
//   - App version -> the app's own real build config (expo-constants), not
//     invented data.
//
// No account/role/permission/school field is editable here -- there is
// nothing to restrict beyond what already doesn't exist as a capability.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { AppHeader } from '@/components/AppHeader';
import { Avatar } from '@/components/Avatar';
import { useMe } from '@/hooks/useMe';
import { logout } from '@/lib/auth';
import { parentColors } from '@/lib/theme';

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

export default function VicePrincipalSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useMe();

  async function handleLogout() {
    await logout();
    // Same reasoning as app/(protected)/index.tsx's own handleSignOut() --
    // the next sign-in on this device must never see this account's cached
    // ['me'] or business data.
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  const person = meQuery.data?.person;
  const roles = meQuery.data?.roles ?? [];
  const primaryRole = roles.find((r) => r.role_code === 'VICE_PRINCIPAL') ?? roles[0];

  return (
    <View style={styles.flex}>
      <AppHeader title="Settings" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {meQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginBottom: 12 }} />
        ) : person ? (
          <Pressable
            style={[styles.card, cardShadow, styles.identityCard]}
            onPress={() => router.push('/(protected)/vice-principal/profile' as never)}
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
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
});
