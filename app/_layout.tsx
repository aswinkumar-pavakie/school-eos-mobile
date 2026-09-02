import { Stack } from 'expo-router';

// Placeholder root layout. Providers/composition are not implemented yet - see src/context.
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
