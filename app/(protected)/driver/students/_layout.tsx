import { Stack } from 'expo-router';

// Hidden route -- reachable via a button on DriverHome, not a bottom tab,
// same pattern as ai-chat/_layout.tsx / messaging/_layout.tsx.
export default function DriverStudentsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
