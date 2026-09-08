// Route-layer role guard for the entire Principal subtree -- a non-Principal must
// never reach any screen under here through navigation, not just have buttons
// hidden. Mirrors hostel-warden/_layout.tsx's exact same pattern (loading state,
// then a Redirect) for the identical reason.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { parentColors } from '@/lib/theme';

export default function PrincipalLayout() {
  const { isPrincipal, isLoading } = useCurrentRoles();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }

  if (!isPrincipal) {
    return <Redirect href="/(protected)" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background },
});
