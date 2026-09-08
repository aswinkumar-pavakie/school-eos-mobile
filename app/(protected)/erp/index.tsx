// Faculty "ERP" services grid -- pixel-matches "ERP screen design choice/Faculty
// Module - 2" exactly: STUDENT/EMPLOYEE section labels, 4-column grid, 56x56
// #2f6ae0 icon circles, exact tile order from the design's own STUDENT_TILES/
// EMPLOYEE_TILES arrays. Venue is removed entirely (no tile, no backend --
// explicit instruction). Messages/Events are this app's own already-built
// features, not present in the static design at all -- appended at the end of
// the STUDENT group (their hrefs preserved untouched) rather than invented as
// a third section header, since the design itself only ever shows two.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { getCoordinatorMe } from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href?: string;
}

const STUDENT_TILES: ServiceItem[] = [
  { key: 'attendance', label: 'Student Attendance', href: '/(protected)/faculty/attendance' },
  { key: 'leave', label: 'Leave', href: '/(protected)/faculty/student-leave' },
  { key: 'records', label: 'Subject Records', href: '/(protected)/faculty/subject-records' },
  { key: 'marksEntry', label: 'Marks Entry', href: '/(protected)/faculty/marks-entry' },
  { key: 'announcements', label: 'Announcements', href: '/(protected)/faculty/announcements' },
  { key: 'report', label: 'Class Results', href: '/(protected)/faculty/class-results' },
  { key: 'homework', label: 'Homework', href: '/(protected)/faculty/homework' },
  { key: 'classTeacher', label: 'Class Teacher', href: '/(protected)/faculty/class-teacher' },
  { key: 'meetings', label: 'Parent Meetings', href: '/(protected)/faculty/parent-meetings' },
  { key: 'messages', label: 'Messages', href: '/(protected)/my-class/messages' },
  { key: 'events', label: 'Events', href: '/events' },
];

const EMPLOYEE_TILES: ServiceItem[] = [
  { key: 'attendance', label: 'Attendance', href: '/(protected)/faculty/my-attendance' },
  { key: 'leave', label: 'Leave', href: '/(protected)/faculty/staff-leave' },
  { key: 'od', label: 'OD', href: '/(protected)/faculty/staff-od' },
  { key: 'payroll', label: 'HR Payroll', href: '/(protected)/faculty/hr-requests' },
  { key: 'payslip', label: 'Payslip', href: '/(protected)/faculty/payslip' },
  { key: 'appraisal', label: 'Appraisal', href: '/(protected)/faculty/appraisal' },
  { key: 'library', label: 'Library', href: '/(protected)/faculty/library' },
];

function TileGrid({ items, router }: { items: ServiceItem[]; router: ReturnType<typeof useRouter> }) {
  return (
    <View style={styles.grid}>
      {items.map((item, i) => (
        <Pressable
          key={`${item.key}-${i}`}
          style={styles.item}
          onPress={item.href ? () => router.push(item.href as never) : undefined}
        >
          <View style={styles.iconCircle}>
            <ServiceIcon name={item.key} color="#fff" size={26} />
          </View>
          <Text style={styles.itemLabel} numberOfLines={2}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ErpScreen() {
  const router = useRouter();
  const { isHostelWarden, isPrincipal, isVicePrincipal, isCommunity } = useCurrentRoles();
  // Academic Coordinator has no design reference at all (a role-conditional
  // feature, not part of the static Faculty Module design) -- its own tile
  // only ever appears for a real, currently-active coordinator, checked live
  // on every load, never assumed from a cached flag. Called unconditionally
  // (Rules of Hooks) even though a Hostel Warden/Principal redirects away
  // below before ever rendering anything that uses it.
  const meQuery = useQuery({ queryKey: ['faculty-academic-coordinator-me'], queryFn: getCoordinatorMe });

  // The ERP tab is Hostel Warden's own operational home for that role -- see
  // hostel-warden/index.tsx -- rather than the Faculty services grid below.
  if (isHostelWarden) {
    return <Redirect href={'/(protected)/hostel-warden' as never} />;
  }
  // Same pattern for Principal -- see principal/index.tsx.
  if (isPrincipal) {
    return <Redirect href={'/(protected)/principal' as never} />;
  }
  // Vice Principal -- Phase 1 only (login/auth/role-boundary): a minimal
  // protected entry point, not the real module set Principal gets. See
  // vice-principal/index.tsx and vice-principal/_layout.tsx.
  if (isVicePrincipal) {
    return <Redirect href={'/(protected)/vice-principal' as never} />;
  }
  // Same pattern for the standalone Community login -- see community/index.tsx.
  if (isCommunity) {
    return <Redirect href={'/(protected)/community' as never} />;
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="ERP" subtitle="Faculty services" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STUDENT</Text>
          <TileGrid items={STUDENT_TILES} router={router} />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EMPLOYEE</Text>
          <TileGrid items={EMPLOYEE_TILES} router={router} />
        </View>
        {meQuery.data?.isCoordinator ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACADEMIC COORDINATOR</Text>
            <TileGrid
              items={[{ key: 'coordinator', label: 'Coordinator Hub', href: '/(protected)/faculty/coordinator' }]}
              router={router}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginTop: 12 },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 1.2,
    color: facultyColors.muted,
    marginBottom: 14,
    marginLeft: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
  },
  item: {
    width: '25%',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 3,
  },
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
