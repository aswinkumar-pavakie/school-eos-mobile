// Principal's ERP shell -- expanded from its earlier "Messages only" minimal
// state to the real Principal feature set, built entirely against Principal's
// OWN authorization and real web application (a full audit of every route
// under school-eos-website/src/app/(dashboard)/principal/ and its backend
// @Roles was done before writing a single screen here -- see each module's
// own api file comment for its specific evidence). This is NOT a copy of
// Vice Principal's own ERP menu: several items here are broader than VP's
// (Attendance is write-capable staff attendance marking, not VP's read-only
// module; Finance includes raising a Purchase Request, a Principal-exclusive
// backend capability; Announcements includes creating one; Reports and Audit
// Log are full, unredacted Admin-parity views VP has none or a redacted
// version of), and Examination Timetable / Examinations are deliberately
// OMITTED -- both are still <ComingSoon> placeholders even on Principal's own
// web app, Admin-only end to end, not a real Principal capability to adapt.
// Same 3-per-row icon grid launcher pattern as vice-principal/index.tsx.
// Reuse is UI-only, this file grants no permissions of its own; every screen
// it navigates to is gated by this same PRINCIPAL-only layout (see
// principal/_layout.tsx). Dashboard lives on the shared Home tab instead
// (see app/(protected)/index.tsx + PrincipalHome.tsx) -- a tile here would
// just duplicate it.
//
// Messages was the one real feature this shell already had before this
// expansion (a working link into the existing my-class/messages screen) --
// preserved here in COMMUNICATION rather than dropped, per this task's own
// "do not remove existing Principal capabilities" rule.
//
// MY WORKSPACE (added after the first implementation pass, on real evidence
// found on a second, deeper pass over staff.controller.ts): My Day, My
// Attendance, and My Leave are the Principal's OWN self-service records,
// distinct from the institutional Attendance module above (which is the
// Principal marking OTHER staff's attendance, not their own). GET/POST
// /staff/me/attendance-history and /staff/me/leave-requests* all carry
// `@Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL')` -- PRINCIPAL was already
// explicitly granted these, identical to VICE_PRINCIPAL's own self-service
// grant, and this was simply missed the first time these screens were built.
// See principal-my-attendance-api.ts / principal-my-leave-api.ts for the
// full evidence and a disclosed real approval_policy caveat on My Leave.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { parentColors } from '@/lib/theme';

interface NavItem {
  key: ServiceIconKey;
  label: string;
  slug: string;
  href?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'PEOPLE',
    items: [
      { key: 'students', label: 'Students', slug: 'students' },
      { key: 'parents', label: 'Parents', slug: 'parents' },
      { key: 'classTeacher', label: 'Faculty', slug: 'faculty' },
    ],
  },
  {
    title: 'ACADEMICS',
    items: [
      { key: 'academicsSection', label: 'Academics', slug: 'academics' },
      { key: 'timetable', label: 'Class Timetable', slug: 'class-timetable' },
      { key: 'events', label: 'Academic Calendar', slug: 'academic-calendar' },
    ],
  },
  {
    title: 'ATTENDANCE',
    items: [{ key: 'attendance', label: 'Attendance', slug: 'attendance' }],
  },
  {
    title: 'SCHOOL OPERATIONS',
    items: [
      { key: 'transport', label: 'Transport', slug: 'transport' },
      { key: 'roomBed', label: 'Hostel', slug: 'hostel' },
      { key: 'inventory', label: 'Inventory', slug: 'inventory' },
      { key: 'library', label: 'Library', slug: 'library' },
      { key: 'maintenance', label: 'Repair & Maintenance', slug: 'maintenance' },
    ],
  },
  {
    title: 'FINANCE',
    items: [{ key: 'fees', label: 'Finance', slug: 'finance' }],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { key: 'communityProfile', label: 'Communities', slug: 'communities' },
      { key: 'announcements', label: 'Announcements', slug: 'announcements' },
      { key: 'messages', label: 'Messages', slug: 'messages', href: '/(protected)/my-class/messages' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { key: 'report', label: 'Reports', slug: 'reports' },
      { key: 'records', label: 'Audit Log', slug: 'audit-log' },
      { key: 'consent', label: 'Requests & Approvals', slug: 'requests-approvals' },
    ],
  },
  {
    title: 'MY WORKSPACE',
    items: [
      { key: 'myDay', label: 'My Day', slug: 'my-day' },
      { key: 'myAttendance', label: 'My Attendance', slug: 'my-attendance' },
      { key: 'myLeave', label: 'My Leave', slug: 'my-leave' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { key: 'notifications', label: 'Notifications', slug: 'notifications' },
      { key: 'profile', label: 'Profile', slug: 'profile' },
      { key: 'settings', label: 'Settings', slug: 'settings' },
    ],
  },
];

export default function PrincipalShell() {
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <AppHeader title="Principal" subtitle="School administration" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.items.map((item) => (
                <Pressable
                  key={item.slug}
                  style={styles.gridItem}
                  onPress={() =>
                    router.push(
                      (item.href ?? `/(protected)/principal/${item.slug}?title=${encodeURIComponent(item.label)}`) as never,
                    )
                  }
                >
                  <View style={styles.iconCircle}>
                    <ServiceIcon name={item.key} color="#fff" />
                  </View>
                  <Text style={styles.gridItemLabel}>{item.label}</Text>
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
  content: { padding: 18, paddingBottom: 32 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.2,
    color: parentColors.muted,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 20,
  },
  gridItem: {
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
  gridItemLabel: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    textAlign: 'center',
    lineHeight: 16,
  },
});
