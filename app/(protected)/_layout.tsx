import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/lib/auth';
import { hasRole, useMe } from '@/hooks/useMe';
import { colors, fonts } from '@/lib/theme';

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
} as const;

// Gate on stored-refresh-token presence (see useSession) -- a signed-out visitor
// (or a cold-launch race before app/index.tsx's own redirect fires) never reaches a
// screen under this group. Expiry itself is handled per-request by authedRequest.
export default function ProtectedLayout() {
  const { status } = useSession();
  const me = useMe();

  if (status === 'loading' || (status === 'signedIn' && me.isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href="/(auth)/login" />;
  }

  const isParent = hasRole(me.data?.roles, 'PARENT');
  const isFaculty = hasRole(me.data?.roles, 'FACULTY');

  // Parent gets the bottom-tab shell (Home/My class/Academics/My Bus) matching the
  // provided design. "My class" now holds the real Parent<->Faculty Messages
  // feature (see src/features/messaging) -- both roles need it, so Faculty gets it
  // too; "My Bus" stays a Parent/Student-only concept with no Faculty meaning.
  // Every other role keeps the existing plain Stack, unchanged.
  if (isParent) {
    return (
      <Tabs screenOptions={tabScreenOptions}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="my-class"
          options={{ title: 'My class', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="academics"
          options={{ title: 'Academics', tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="my-bus"
          options={{ title: 'My Bus', tabBarIcon: ({ color, size }) => <Ionicons name="bus-outline" color={color} size={size} /> }}
        />
        {/* Faculty-only Stack routes -- hidden from the Parent tab bar, kept mounted so
            the URLs still resolve if ever navigated to directly. */}
        <Tabs.Screen name="online-classes" options={{ href: null }} />
      </Tabs>
    );
  }

  if (isFaculty) {
    return (
      <Tabs screenOptions={tabScreenOptions}>
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="my-class"
          options={{ title: 'My class', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" color={color} size={size} /> }}
        />
        <Tabs.Screen
          name="academics"
          options={{ title: 'Academics', tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" color={color} size={size} /> }}
        />
        {/* Parent-only tab and the Faculty detail/schedule/reschedule stack routes --
            hidden from Faculty's tab bar, still reachable via router.push. */}
        <Tabs.Screen name="my-bus" options={{ href: null }} />
        <Tabs.Screen name="online-classes" options={{ href: null }} />
      </Tabs>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
