import { Stack } from 'expo-router';

// Placeholder protected route group layout. Session-based guarding is not implemented yet.
export default function ProtectedLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
