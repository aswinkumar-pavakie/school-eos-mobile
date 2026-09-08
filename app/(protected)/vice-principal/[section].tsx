// Generic placeholder entry screen for every Vice Principal nav item beyond
// the shell itself -- Phase 2 explicitly forbids real business screens per
// item ("Do NOT add mock business data... fake KPIs... fake students,
// attendance, finance, reports"), so instead of ~24 near-identical files,
// one dynamic route renders the tapped item's own title inside the existing
// shell/header + the existing EmptyState component. Real per-module screens
// replace this route (or grow their own) in later phases -- this file's job
// is done once that happens for a given section.

import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ScreenStates';
import { parentColors } from '@/lib/theme';

export default function VicePrincipalSectionPlaceholder() {
  const router = useRouter();
  const { title } = useLocalSearchParams<{ section: string; title?: string }>();
  const label = title ?? 'This section';

  return (
    <View style={styles.flex}>
      <AppHeader title={label} onBack={() => router.back()} />
      <EmptyState message={`${label} is coming in a later phase.`} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
});
