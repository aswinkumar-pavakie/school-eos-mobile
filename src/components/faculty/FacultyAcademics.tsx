// Faculty's own Academics hub -- Current Term (LMS), Timetable, Academic
// Calendar. A separate component from the Parent-only AcademicsHubScreen
// (never touched) -- the shared /academics route branches to this one for a
// FACULTY caller only.

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon } from '@/components/ServiceIcon';
import { facultyColors } from '@/lib/theme';

const TILES = [
  { key: 'records' as const, label: 'Current Term', href: '/(protected)/faculty/lms' },
  { key: 'attendance' as const, label: 'Timetable', href: '/(protected)/faculty/timetable' },
  { key: 'meetings' as const, label: 'Calendar', href: '/(protected)/faculty/calendar' },
];

export function FacultyAcademics() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <AppHeader title="Academics" subtitle="Current term, timetable & calendar" onBack={() => router.replace('/' as never)} />
      <View style={styles.grid}>
        {TILES.map((tile) => (
          <Pressable key={tile.key} style={styles.tile} onPress={() => router.push(tile.href as never)}>
            <View style={styles.iconCircle}>
              <ServiceIcon name={tile.key} color="#fff" size={24} />
            </View>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  tile: { width: '25%', alignItems: 'center', gap: 8 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: facultyColors.blueTile, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.ink, textAlign: 'center' },
});
