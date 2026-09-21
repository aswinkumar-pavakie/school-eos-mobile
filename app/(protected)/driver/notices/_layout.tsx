import { Stack } from 'expo-router';

// Hidden route -- reachable via Home's "View All" on the Notice section, not
// a bottom tab, same pattern as driver/students/_layout.tsx.
export default function DriverNoticesLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
