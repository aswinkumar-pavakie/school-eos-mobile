// Route-layer role guard for the entire Vice Principal subtree -- a
// non-Vice-Principal login must never reach any screen under here through
// navigation, not just have buttons hidden. Exact mirror of
// community/_layout.tsx's own pattern (loading state, then a Redirect),
// scoped to this one role instead. Covers every screen under this
// directory automatically (index.tsx's shell + every placeholder in
// [section].tsx) -- no per-screen role check needed, this one guard is the
// single authorization point for the whole subtree.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { parentColors } from '@/lib/theme';

export default function VicePrincipalLayout() {
  const { isVicePrincipal, isLoading } = useCurrentRoles();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }

  if (!isVicePrincipal) {
    return <Redirect href="/(protected)" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background },
});
