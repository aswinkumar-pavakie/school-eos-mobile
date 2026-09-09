// Vice Principal's shell -- Phase 2 (navigation structure only, no business
// logic). Reached via the shared bottom tab bar's ERP tab (see erp/index.tsx's
// redirect), guarded by _layout.tsx (VICE_PRINCIPAL only -- see Phase 1).
// Each section is a 3-per-row icon grid -- same launcher pattern as
// community/index.tsx and hostel-warden/index.tsx (icon circle + label,
// wrapped 33.33%-width items), not the single-column tile-row style
// principal/index.tsx uses -- matches how every OTHER role's own launcher
// with several items is already built in this app. Reuse is UI-only, this
// file grants no permissions of its own; every screen it navigates to is
// gated by this same VICE_PRINCIPAL-only layout. Every item below is a
// placeholder entry point (see [section].tsx) except Dashboard/Students,
// which now have real screens from Phase 3/4.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { parentColors } from '@/lib/theme';

interface NavItem {
  key: ServiceIconKey;
  label: string;
  slug: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'MAIN',
    items: [{ key: 'dashboard', label: 'Dashboard', slug: 'dashboard' }],
  },
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
      { key: 'timetable', label: 'Examination Timetable', slug: 'examination-timetable' },
      { key: 'exams', label: 'Examinations', slug: 'examinations' },
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
    title: 'SYSTEM',
    items: [
      { key: 'notifications', label: 'Notifications', slug: 'notifications' },
      { key: 'myAttendance', label: 'My Attendance', slug: 'my-attendance' },
      { key: 'myLeave', label: 'My Leave', slug: 'my-leave' },
      { key: 'profile', label: 'Profile', slug: 'profile' },
      { key: 'settings', label: 'Settings', slug: 'settings' },
    ],
  },
];

export default function VicePrincipalShell() {
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <AppHeader title="Vice Principal" subtitle="School administration" onBack={() => router.replace('/')} />
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
                      `/(protected)/vice-principal/${item.slug}?title=${encodeURIComponent(item.label)}` as never,
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
