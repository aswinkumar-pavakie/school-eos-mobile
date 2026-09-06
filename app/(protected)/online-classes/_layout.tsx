import { Stack } from 'expo-router';
import { colors, fonts } from '@/lib/theme';

export default function OnlineClassesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bold },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="schedule" options={{ title: 'Schedule Class' }} />
      {/* OnlineClassDetailScreen renders its own GradientHeader now -- the native
          header must stay off here or the two stack on top of each other. */}
      <Stack.Screen name="[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]/reschedule" options={{ title: 'Reschedule' }} />
    </Stack>
  );
}
