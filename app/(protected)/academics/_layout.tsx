import { Stack } from 'expo-router';

// Headers are custom GradientHeader components per-screen, not the native header.
export default function AcademicsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
