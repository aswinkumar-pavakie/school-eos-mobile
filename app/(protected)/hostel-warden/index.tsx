// Hostel Warden's operational home -- reached via the shared bottom tab bar's ERP
// tab (see erp/index.tsx's redirect and BottomTabBar.tsx's per-role tab labels),
// not a standalone login-time landing page. A simple feature launcher grouped into
// sections, NOT a dashboard -- no analytics/charts/counts invented here. Sign out
// lives on the Home tab like every other role, not on this screen.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { listRoomAllocations } from '@/lib/hostel-warden-api';
import { parentColors } from '@/lib/theme';

interface FeatureItem {
  key: ServiceIconKey;
  label: string;
  href: string;
}

const SECTIONS: { title: string; items: FeatureItem[] }[] = [
  {
    title: 'Daily operations',
    items: [
      { key: 'nightAttendance', label: 'Night attendance', href: '/(protected)/hostel-warden/night-attendance' },
      { key: 'studyAttendance', label: 'Study attendance', href: '/(protected)/hostel-warden/study-sessions' },
      { key: 'gatePass', label: 'Gate pass approval', href: '/(protected)/hostel-warden/gate-pass-requests' },
      { key: 'callRequest', label: 'Parent call approval', href: '/(protected)/hostel-warden/call-requests' },
      { key: 'visitorLog', label: 'Visitor log', href: '/(protected)/hostel-warden/visitors' },
      { key: 'emergencyExit', label: 'Emergency exit approval', href: '/(protected)/hostel-warden/emergency-exit-requests' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { key: 'classAbsence', label: 'Class absence alerts', href: '/(protected)/hostel-warden/class-absence-alerts' },
      { key: 'roomBed', label: 'Students', href: '/(protected)/hostel-warden/room-bed' },
      { key: 'roomDetails', label: 'Room details', href: '/(protected)/hostel-warden/room-details' },
    ],
  },
  {
    title: 'Maintenance',
    items: [{ key: 'complaints', label: 'Hostel complaints', href: '/(protected)/hostel-warden/complaints' }],
  },
];

// Best-effort "which hostel am I warden of" label for the header subtitle -- no
// backend endpoint returns a warden's own hostel/block/year summary directly, so
// this reads it off the first row of the Warden's own (already-scoped) room
// allocations rather than inventing a new endpoint just for a header label. Shows
// nothing extra (never a fabricated block/year) if that list is empty or still
// loading.
function useHostelSubtitle(): string | undefined {
  const query = useQuery({
    queryKey: ['hostel-warden', 'room-allocations'],
    queryFn: () => listRoomAllocations(),
    staleTime: 5 * 60_000,
  });
  return query.data?.[0]?.hostelName;
}

export default function HostelWardenHome() {
  const router = useRouter();
  const subtitle = useHostelSubtitle();

  return (
    <View style={styles.flex}>
      <AppHeader title="Hostel Warden" subtitle={subtitle} onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.grid}>
              {section.items.map((item) => (
                <Pressable key={item.key} style={styles.item} onPress={() => router.push(item.href as never)}>
                  <View style={styles.iconCircle}>
                    <ServiceIcon name={item.key} color="#fff" />
                  </View>
                  <Text style={styles.itemLabel}>{item.label}</Text>
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
  flex: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 18, paddingBottom: 24, gap: 24 },
  section: {},
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.2,
    color: parentColors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    rowGap: 20,
  },
  item: {
    width: '33.33%',
    alignItems: 'center',
    gap: 9,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    textAlign: 'center',
    lineHeight: 16,
  },
});
