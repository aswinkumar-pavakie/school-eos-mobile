// Home tab -- real signed-in person, role-branched. Faculty gets its own real
// Home screen (see FacultyHome.tsx), pixel-matched to "ERP screen choice/
// Faculty Module - 2"'s own Home screen. Community gets its own real Home
// screen (see CommunityHome.tsx), resolved from the COMMUNITY-scoped role
// assignment's own scope_id. Vice Principal gets its own real Home screen
// (see VicePrincipalHome.tsx) -- the exact same leadership-dashboard content
// that used to sit behind the ERP menu's own "Dashboard" tile, now shown
// directly here instead (that tile was removed from vice-principal/index.tsx
// since it would just duplicate this). Parent gets its own real Home screen
// (see ParentHome.tsx), pixel-matched to "ERP screen design choice/School
// App.dc.html"'s own HOME section -- child switcher, real Announcements, real
// Media Room posts (ParentHome resolves the selected child itself via
// useSelectedChild).
//
// Hostel Warden is the only role left on this plain fallback Home tab -- its
// own operational launcher lives behind the ERP tab instead (see
// hostel-warden/index.tsx), so Home just shows a plain greeting + sign out.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AuthExpiredError, authedRequest, logout, type PersonSummary, type RoleSummary } from '@/lib/auth';
import { hasRole } from '@/hooks/useMe';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { FacultyHome } from '@/components/faculty/FacultyHome';
import { CommunityHome } from '@/components/community/CommunityHome';
import { VicePrincipalHome } from '@/components/vice-principal/VicePrincipalHome';
import { ParentHome } from '@/components/parent/ParentHome';
import { parentColors } from '@/lib/theme';

interface MeResponse {
  data: { person: PersonSummary; roles: RoleSummary[] };
}

export default function ProtectedHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [me, setMe] = useState<MeResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isHostelWarden, isVicePrincipal, isCommunity } = useCurrentRoles();

  useEffect(() => {
    authedRequest<MeResponse>('/auth/me')
      .then((res) => setMe(res.data))
      .catch((err) => {
        if (err instanceof AuthExpiredError) {
          router.replace('/(auth)/login');
          return;
        }
        setError('Unable to load your account.');
      });
  }, [router]);

  async function handleSignOut() {
    await logout();
    // Same reasoning as LoginForm.tsx's clear() on login -- the next sign-in
    // on this device must never see this account's cached ['me'] or business
    // data.
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  if (me && hasRole(me.roles, 'FACULTY')) {
    return <FacultyHome facultyName={me.person.firstName} facultyMeta={me.roles.map((r) => r.role_code).join(', ')} />;
  }

  if (me && isCommunity) {
    const communityRole = me.roles.find((r) => r.role_code === 'COMMUNITY' && r.scope_type === 'COMMUNITY');
    if (communityRole?.scope_id) {
      return <CommunityHome personName={me.person.firstName} communityId={communityRole.scope_id} />;
    }
  }

  if (me && isVicePrincipal) {
    return <VicePrincipalHome personName={me.person.firstName} />;
  }

  // Community and Vice Principal are both handled above (returns early);
  // everyone else who isn't Hostel Warden is Parent.
  if (me && !isHostelWarden) {
    return <ParentHome />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {error ? (
          <Text style={styles.subtitle}>{error}</Text>
        ) : !me ? (
          <ActivityIndicator color={parentColors.blue} />
        ) : (
          <>
            <Text style={styles.title}>Hi, {me.person.firstName}</Text>
            <Text style={styles.hint}>Open &ldquo;ERP&rdquo; below for your daily hostel operations.</Text>
          </>
        )}

        <Pressable onPress={handleSignOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: parentColors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: parentColors.ink },
  subtitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: parentColors.muted },
  hint: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: parentColors.muted, textAlign: 'center' },
  button: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: parentColors.ink },
});
