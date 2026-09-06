import { Stack } from 'expo-router';
import { colors, fonts } from '@/lib/theme';

// Nested inside the Academics tab's own Stack -- pushing here stays within the same
// tab, so router.back() correctly returns to the Academics "Online class" hub.
export default function AcademicsOnlineClassesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bold },
        headerShadowVisible: false,
      }}
    >
      {/* OnlineClassDetailScreen renders its own GradientHeader. */}
      <Stack.Screen name="[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/reschedule" options={{ title: 'Reschedule' }} />
    </Stack>
  );
}
