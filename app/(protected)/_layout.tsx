import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useSession } from '@/lib/auth';
import { useMe } from '@/hooks/useMe';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { useRegisterPushToken } from '@/services/notifications/push-token';
import { useE2eeBootstrap } from '@/services/messaging/bootstrap';
import { useMessagingSocket } from '@/services/messaging/socket';
import { BottomTabBar } from '@/components/BottomTabBar';
import { AskAiFab } from '@/components/ai-chat/AskAiFab';
import { parentColors } from '@/lib/theme';

// Real navigation shell: whichever screen matched (Home/My class-or-ERP/Academics/
// My Bus/Fees) fills the content area; the bottom tab bar is persistent chrome
// rendered once here, not per-screen (see BottomTabBar.tsx for the tab set and its
// per-role "My class" vs "ERP" swap -- Hostel Warden gets the same 4-tab bar as
// everyone else, with its own operational home behind the ERP tab).
//
// Session gating (kept from this branch's own layout, not hot-fix-sri's): a
// signed-out visitor never reaches a screen under this group. Gate on stored-
// refresh-token presence (see useSession) -- expiry itself is handled per-request
// by authedRequest.
// Home is the default screen of this group: with no deeper path, the navigator
// opens on `index` (Home), never on a feature screen.
export const unstable_settings = { initialRouteName: 'index' };

export default function ProtectedLayout() {
  const { status } = useSession();
  const me = useMe();
  // AI chat is a real, person-directed assistant (school records, policies,
  // "anything else") -- Driver is the one MOBILE_ALLOWED_ROLES role this
  // doesn't apply to (a device-credential-style operational login, no
  // person-facing school-records assistant use case, matching Canteen
  // Vendor/Bus Attendant's exclusion on the website side -- neither of
  // those two even has mobile access at all, per MOBILE_ALLOWED_ROLES, so
  // Driver is the only real exclusion left to enforce here).
  const { isDriver } = useCurrentRoles();
  // The single real "every login" hook -- fires once a real session is
  // confirmed, for every role that reaches this layout at all, whether that
  // just happened via the login form or via a persisted session on app
  // reopen (functionally, still "how they got in this time").
  useRegisterPushToken(status);
  // Real E2EE messaging: generates/registers this device's MLS identity and
  // keeps its KeyPackage pool replenished (bootstrap), then connects the
  // realtime channel (socket) -- same "every login, every role, no role
  // check" posture as push registration above.
  useE2eeBootstrap(status);
  useMessagingSocket(status);

  if (status === 'loading' || (status === 'signedIn' && me.isLoading)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>
      {!isDriver && <AskAiFab />}
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background },
  root: { flex: 1, backgroundColor: parentColors.background },
  content: { flex: 1 },
});
