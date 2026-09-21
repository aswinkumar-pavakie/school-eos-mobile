import { Stack } from 'expo-router';

// Hidden route -- reachable via a button on DriverHome, not a bottom tab,
// same pattern as driver/students/_layout.tsx / ai-chat/_layout.tsx.
export default function DriverProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
