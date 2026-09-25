// Route-layer role guard for the entire Health In-charge subtree -- a non-Health
// In-charge login must never reach any screen under here through navigation, not
// just have buttons hidden. Exact mirror of hostel-warden/_layout.tsx's own
// pattern (loading state, then a Redirect), scoped to this one role instead.

import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { healthInchargeColors } from '@/lib/theme';

export default function HealthInchargeLayout() {
  const { isHealthIncharge, isLoading } = useCurrentRoles();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={healthInchargeColors.primary} />
      </View>
    );
  }

  if (!isHealthIncharge) {
    return <Redirect href="/(protected)" />;
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: healthInchargeColors.background },
});
