import { Stack } from 'expo-router';

// Nested inside this tab's own Stack -- pushing to a conversation stays within the
// "My class" tab, so router.back() correctly returns to the Messages list (see the
// same fix applied to academics/online-classes for the same reason).
export default function MyClassLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
