// Placeholder tab -- not part of this build's scope (only My class + Fees are).
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { parentColors } from '@/lib/theme';

export default function AcademicsScreen() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <AppHeader title="Academics" onBack={() => router.replace('/')} />
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
