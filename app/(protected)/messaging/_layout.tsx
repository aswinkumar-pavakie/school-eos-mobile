import { Stack } from 'expo-router';

// Nested inside this tab's own Stack -- pushing to a conversation stays within
// wherever the user entered from, so router.back() correctly returns to the
// Messages list (same cross-tab back-navigation fix as my-class/_layout.tsx and
// academics/online-classes/_layout.tsx). Every screen here renders its own
// GradientHeader, so the native stack header is fully suppressed.
export default function MessagingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
