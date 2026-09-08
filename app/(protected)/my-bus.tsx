// Role-branched: Faculty gets a real Bus screen (their own driver/attendant
// duty, if any); Parent keeps the exact existing placeholder, untouched (no
// student-transport module exists yet).

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { AppHeader } from '@/components/AppHeader';
import FacultyBusScreen from './faculty/bus';
import { parentColors } from '@/lib/theme';

function ParentMyBusScreen() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <AppHeader title="My Bus" onBack={() => router.replace('/')} />
      <View style={styles.body}>
        <Text style={styles.text}>Coming soon.</Text>
      </View>
    </View>
  );
}

export default function MyBusRoute() {
  const { isFaculty, isLoading } = useCurrentRoles();
  if (isLoading) {
    return (
      <View style={[styles.flex, styles.body]}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }
  return isFaculty ? <FacultyBusScreen /> : <ParentMyBusScreen />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: parentColors.muted },
});
