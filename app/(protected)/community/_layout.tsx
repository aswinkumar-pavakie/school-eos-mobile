// Route-layer role guard for the entire Community subtree -- a non-Community
// login must never reach any screen under here through navigation, not just
// have buttons hidden. Exact mirror of hostel-warden/_layout.tsx's own
// pattern (loading state, then a Redirect), scoped to this one role instead.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { parentColors } from '@/lib/theme';

export default function CommunityLayout() {
  const { isCommunity, isLoading } = useCurrentRoles();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }

  if (!isCommunity) {
    return <Redirect href="/(protected)" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background },
});
