import { Stack } from 'expo-router';

// Hidden route -- reachable via "Join call" on an APPROVED booking, not a
// bottom tab, same pattern as driver/students/_layout.tsx / ai-chat/_layout.tsx.
// Full-screen call UI draws its own leave control -- no header chrome here.
export default function MeetingCallLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
