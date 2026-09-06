import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';

// Stub tab destination -- no "My Bus"/transport module exists anywhere in this
// project yet. Present as a real tab (matching the design) rather than omitted, but
// honest about not being built.
export default function MyBusRoute() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>My Bus</Text>
        <Text style={styles.subtitle}>This section is not available yet.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 20 },
  title: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
});
