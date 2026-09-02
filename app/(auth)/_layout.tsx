import { Stack } from 'expo-router';

// Placeholder auth route group layout. Session-based guarding is not implemented yet.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
