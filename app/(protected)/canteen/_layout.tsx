// Route-layer role guard for the entire Canteen subtree -- same pattern as
// hostel-warden/_layout.tsx: a non-canteen login must never reach these
// screens through navigation, not just have the tab hidden.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { parentColors } from '@/lib/theme';

export default function CanteenLayout() {
  const { isCanteenVendor, isLoading } = useCurrentRoles();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }

  if (!isCanteenVendor) {
    return <Redirect href="/(protected)" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: parentColors.background },
});
