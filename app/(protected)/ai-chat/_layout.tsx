import { Stack } from 'expo-router';

// Hidden route -- reachable via a button elsewhere (not a bottom tab), same
// pattern as messaging/_layout.tsx, my-class/_layout.tsx and
// academics/online-classes/_layout.tsx. Nested inside whichever tab the user
// came from so router.back() returns them there correctly.
export default function AiChatLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
