// Health In-charge -- "Health" hub tab. Same grouped-tile launcher shape as
// hostel-warden/index.tsx's own GROUPS pattern (a real, already-used
// convention for a compact operational console, not a dashboard -- no
// counts/analytics invented here, those live on the Home tab), grouped by
// this role's own three real workflows: recording/following up visits,
// looking up a student's health record, and logging a parent/doctor
// contact.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { healthInchargeColors } from '@/lib/theme';
import { HealthIcon, type IconKey } from '@/components/health-incharge/icons';
import { HealthSubHeader } from '@/components/health-incharge/primitives';

interface Tile {
  icon: IconKey;
  label: string;
  sub: string;
  href: string;
}
interface Group {
  label: string;
  items: Tile[];
}

const GROUPS: Group[] = [
  {
    label: 'INFIRMARY',
    items: [
      { icon: 'visits', label: 'Record a visit', sub: 'Log a new infirmary visit', href: '/(protected)/health-incharge/visits/create' },
      { icon: 'health', label: 'Visit history', sub: 'All infirmary visits', href: '/(protected)/health-incharge/visits' },
    ],
  },
  {
    label: 'STUDENTS',
    items: [
      { icon: 'students', label: 'Student health', sub: 'Search a student’s record', href: '/(protected)/health-incharge/students' },
    ],
  },
  {
    label: 'CONTACTS',
    items: [
      { icon: 'contact', label: 'Parent & doctor contacts', sub: 'Every escalation logged', href: '/(protected)/health-incharge/escalations' },
    ],
  },
];

export default function HealthInchargeHub() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <HealthSubHeader title="Health & Infirmary" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        {GROUPS.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.grid}>
              {group.items.map((item) => (
                <Pressable key={item.href} style={styles.tile} onPress={() => router.push(item.href as never)}>
                  <View style={styles.iconCircle}>
                    <HealthIcon name={item.icon} color="#fff" size={22} strokeWidth={1.9} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tileLabel}>{item.label}</Text>
                    <Text style={styles.tileSub}>{item.sub}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  content: { padding: 18, paddingBottom: 32, gap: 22 },
  group: { gap: 10 },
  groupLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2, color: healthInchargeColors.tertiary },
  grid: { gap: 10 },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: healthInchargeColors.surface,
    borderWidth: 1,
    borderColor: healthInchargeColors.border,
    borderRadius: 14,
    padding: 14,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: healthInchargeColors.primary, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  tileSub: { fontSize: 12, color: healthInchargeColors.muted, marginTop: 2 },
});
