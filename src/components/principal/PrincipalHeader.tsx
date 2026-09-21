// Principal module's own inner-page header -- pixel-matched to the design's
// `isInner` header block: solid #2F5FF4 (no gradient -- confirmed absent
// from the whole design file, unlike Parent's own gradient header), back
// chevron, title/subtitle. Kept separate from the shared AppHeader (which is
// hardcoded to parentColors' gradient) for the same token-isolation reason
// principalColors itself is separate.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { principalColors } from '@/lib/theme';
import { ChevronLeftIcon } from './icons';

export function PrincipalHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <SafeAreaView edges={['top']}>
        <View style={styles.row}>
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
            <ChevronLeftIcon color="#fff" size={20} />
          </Pressable>
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: principalColors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
});
