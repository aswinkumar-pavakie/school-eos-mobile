// Placeholder tab -- no "My Bus"/transport module exists anywhere in this project
// yet. Present as a real tab (matching the design) rather than omitted, but honest
// about not being built.
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { parentColors } from '@/lib/theme';

export default function MyBusScreen() {
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: parentColors.muted },
});
