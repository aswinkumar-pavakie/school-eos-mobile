// Parent-only launcher hub, matching the provided design exactly: a gradient header
// plus a 4-icon grid. Only "Online class" is a real, backed feature -- the other
// three tiles (Current term, Timetable, Calendar) have no backend/module anywhere
// in this project yet (see src/features/academics/README.md), so they render for
// visual fidelity but show a "Coming soon" notice instead of a fabricated screen.

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { accent, colors, fonts } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface HubTile {
  key: string;
  label: string;
  icon: IconName;
  enabled: boolean;
}

const TILES: HubTile[] = [
  { key: 'current-term', label: 'Current term', icon: 'reader-outline', enabled: false },
  { key: 'timetable', label: 'Timetable', icon: 'time-outline', enabled: false },
  { key: 'online-class', label: 'Online class', icon: 'play-outline', enabled: true },
  { key: 'calendar', label: 'Calendar', icon: 'calendar-outline', enabled: false },
];

export function AcademicsHubScreen() {
  const router = useRouter();
  const [comingSoon, setComingSoon] = useState<string | null>(null);

  // No backend endpoint exposes a ward's class/section as standalone context (only
  // indirectly, per online class, via ParentOnlineClass.gradeName/sectionName) --
  // rather than fabricate a "Class 8-B" subtitle, this header simply omits one.
  function handleTilePress(tile: HubTile) {
    if (!tile.enabled) {
      setComingSoon(tile.label);
      return;
    }
    router.push('/(protected)/academics/online-class');
  }

  return (
    <View style={styles.screen}>
      {/* Academics is a tab, not a stack push -- "back" means "go to Home", not pop. */}
      <GradientHeader title="Academics" onBack={() => router.push('/(protected)')} />

      <View style={styles.grid}>
        {TILES.map((tile) => (
          <Pressable key={tile.key} onPress={() => handleTilePress(tile)} style={styles.tile}>
            <View style={[styles.iconCircle, !tile.enabled && styles.iconCircleDisabled]}>
              <Ionicons name={tile.icon} size={24} color={colors.white} />
            </View>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={!!comingSoon} transparent animationType="fade" onRequestClose={() => setComingSoon(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setComingSoon(null)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{comingSoon}</Text>
            <Text style={styles.modalBody}>This section is not available yet.</Text>
          </View>
        </Pressable>
      </Modal>
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
  iconCircleDisabled: { opacity: 0.55 },
  tileLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.text, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 6, width: '75%' },
  modalTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  modalBody: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
});
