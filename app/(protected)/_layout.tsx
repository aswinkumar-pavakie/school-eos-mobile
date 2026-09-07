import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useSession } from '@/lib/auth';
import { useMe } from '@/hooks/useMe';
import { BottomTabBar } from '@/components/BottomTabBar';
import { parentColors } from '@/lib/theme';

// Real navigation shell: whichever screen matched (Home/My class-or-ERP/Academics/
// My Bus/Fees) fills the content area; the bottom tab bar is persistent chrome
// rendered once here, not per-screen (see BottomTabBar.tsx for the tab set and its
// per-role "My class" vs "ERP" swap).
//
// Session gating (kept from this branch's own layout, not hot-fix-sri's): a
// signed-out visitor never reaches a screen under this group. Gate on stored-
// refresh-token presence (see useSession) -- expiry itself is handled per-request
// by authedRequest.
export default function ProtectedLayout() {
  const { status } = useSession();
  const me = useMe();

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
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background },
  root: { flex: 1, backgroundColor: parentColors.background },
  content: { flex: 1 },
});
