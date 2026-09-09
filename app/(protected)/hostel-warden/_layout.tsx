// Route-layer role guard for the entire Hostel Warden subtree -- a non-Warden must
// never reach any screen under here through navigation, not just have buttons
// hidden. Mirrors (protected)/_layout.tsx's own session-gating pattern (loading
// state, then a Redirect), but scoped to this one role instead of session presence.
//
// This is a real gap the rest of the app doesn't otherwise have (e.g. /erp has no
// FACULTY check at all) -- added here because the task explicitly requires it for
// this role, not extended to other features.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { parentColors } from '@/lib/theme';

export default function HostelWardenLayout() {
  const { isHostelWarden, isLoading } = useCurrentRoles();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }

  if (!isHostelWarden) {
    return <Redirect href="/(protected)" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background },
});
