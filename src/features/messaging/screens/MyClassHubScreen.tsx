// "My class" tab landing screen -- mirrors AcademicsHubScreen's icon-grid pattern
// for consistency. Message and Permissions both live here; if this tab grows more
// features, they'd join the same way.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { accent, colors, fonts } from '@/lib/theme';

export function MyClassHubScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      {/* "My class" is a tab, not a stack push -- "back" means "go to Home". */}
      <GradientHeader title="My class" onBack={() => router.push('/(protected)')} />

      <View style={styles.grid}>
        <Pressable onPress={() => router.push('/(protected)/my-class/messages')} style={styles.tile}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.white} />
          </View>
          <Text style={styles.tileLabel}>Message</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/(protected)/my-class/permissions')} style={styles.tile}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={24} color={colors.white} />
          </View>
          <Text style={styles.tileLabel}>Permissions</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  tile: { width: '22%', alignItems: 'center', gap: 8 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: accent.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.text, textAlign: 'center' },
});
