// Hostel Warden -> Hostel hub. Pixel-matched to Warden App.dc.html's own
// `isGrid` screen (GRID: My blocks / Hostel / Administration groups, same
// order, real SVG icon paths via HostelIcon). One group added beyond the
// literal mock -- "DAILY OPERATIONS" -- covering Night Attendance, Visitors,
// Call requests and Class Absence Alerts: real, already-built, already
// live-tested features from before this rebuild that the mock's own nav
// never reaches (confirmed by direct design-file audit: Night Attendance is
// genuinely orphaned in the mock, and Visitors/Class Absence Alerts have no
// mock screen at all) -- removing them to match the mock literally would
// mean deleting real, working functionality, which the task's own
// instruction #2/#3 (no module left disconnected) rules out.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { hostelWardenColors } from '@/lib/theme';
import { HostelIcon, type IconKey } from '@/components/hostel-warden/icons';
import { WardenSubHeader } from '@/components/hostel-warden/primitives';

interface Tile {
  icon: IconKey;
  label: string;
  href: string;
}
interface Group {
  label: string;
  items: Tile[];
}

const GROUPS: Group[] = [
  {
    label: 'MY BLOCKS',
    items: [
      { icon: 'students', label: 'Students', href: '/(protected)/hostel-warden/room-bed' },
      { icon: 'study', label: 'Study hours', href: '/(protected)/hostel-warden/study-sessions' },
      { icon: 'gatelogOut', label: 'Gate log', href: '/(protected)/hostel-warden/gate-log' },
    ],
  },
  {
    label: 'HOSTEL',
    items: [
      { icon: 'hostel', label: 'Hostel details', href: '/(protected)/hostel-warden/hostels' },
      { icon: 'rooms', label: 'Rooms', href: '/(protected)/hostel-warden/room-details' },
      // Hostel fees IS real -- composed from Finance's own per-student
      // StudentFeesService (GET /hostel/students/:id/fees), the same
      // real endpoint the website's own Hostel Fees page already uses.
      { icon: 'fees', label: 'Hostel fees', href: '/(protected)/hostel-warden/fees' },
      { icon: 'mess', label: 'Mess', href: '/(protected)/hostel-warden/mess' },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { icon: 'issues', label: 'Issues', href: '/(protected)/hostel-warden/complaints' },
      { icon: 'staff', label: 'Warden roster', href: '/(protected)/hostel-warden/staff' },
      // Full feature parity with the website's own reports page -- real
      // occupancy/complaints/gate-movement/fees CSV export, previously
      // website-only (mobile export uses the native Share sheet instead of
      // a browser download).
      { icon: 'rooms', label: 'Reports', href: '/(protected)/hostel-warden/reports' },
    ],
  },
  {
    label: 'DAILY OPERATIONS',
    items: [
      { icon: 'students', label: 'Night attendance', href: '/(protected)/hostel-warden/night-attendance' },
      { icon: 'students', label: 'Visitors', href: '/(protected)/hostel-warden/visitors' },
      { icon: 'gatelogIn', label: 'Call requests', href: '/(protected)/hostel-warden/call-requests' },
      { icon: 'issues', label: 'Class absence', href: '/(protected)/hostel-warden/class-absence-alerts' },
      { icon: 'gatelogOut', label: 'Leave register', href: '/(protected)/hostel-warden/leave' },
      // Full feature parity with the website's own movement-log page --
      // merges Gate Pass/Emergency Exit review with the Warden-authored
      // direct-entry "Record an exit"/"Record return" workflow, previously
      // website-only.
      { icon: 'gatelogIn', label: 'Movement log', href: '/(protected)/hostel-warden/movement-log' },
    ],
  },
];

export default function HostelHubScreen() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Hostel" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        {GROUPS.map((g) => (
          <View key={g.label} style={styles.group}>
            <Text style={styles.groupLabel}>{g.label}</Text>
            <View style={styles.grid}>
              {g.items.map((it) => (
                <Pressable key={it.label} style={styles.item} onPress={() => router.push(it.href as never)}>
                  <View style={styles.iconCircle}>
                    <HostelIcon name={it.icon} color="#fff" size={22} strokeWidth={1.9} />
                  </View>
                  <Text style={styles.itemLabel} numberOfLines={2}>{it.label}</Text>
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
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 22 },
  group: { gap: 14 },
  groupLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2, color: hostelWardenColors.tertiary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18, columnGap: 12 },
  item: { width: '21.5%', alignItems: 'center', gap: 8 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: hostelWardenColors.primary, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: hostelWardenColors.bodyStrong, textAlign: 'center', lineHeight: 15 },
});
