// Faculty "Campus" tab -- real tiles (Food Court, Medical, Feedback, House,
// Library), each backed by a real endpoint (see campus.controller.ts /
// database/migrations/0028_campus_features.sql). Copy Center and Stationery
// Store were unlinked from this hub per explicit request -- their screens
// and backend endpoints still exist, just not tiled here.
// Same tile-grid visual pattern as class-hub.tsx/progress-hub.tsx.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { facultyColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href: string;
}

const CAMPUS_TILES: ServiceItem[] = [
  { key: 'canteen', label: 'Food Court', href: '/(protected)/faculty/campus-food-court' },
  { key: 'health', label: 'Medical', href: '/(protected)/faculty/campus-medical' },
  { key: 'records', label: 'Feedback', href: '/(protected)/faculty/campus-feedback' },
  { key: 'communityProfile', label: 'House', href: '/(protected)/faculty/campus-house' },
  { key: 'library', label: 'Library', href: '/(protected)/faculty/library' },
];

export default function FacultyCampusHub() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <AppHeader title="Campus" subtitle="Food, medical & campus services" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {CAMPUS_TILES.map((item, i) => (
            <Pressable key={`${item.label}-${i}`} style={styles.item} onPress={() => router.push(item.href as never)}>
              <View style={styles.iconCircle}>
                <ServiceIcon name={item.key} color="#fff" size={26} />
              </View>
              <Text style={styles.itemLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  item: { width: '25%', alignItems: 'center', gap: 8, paddingHorizontal: 3 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: facultyColors.blueTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: facultyColors.ink,
    textAlign: 'center',
    lineHeight: 15,
  },
});
