// Principal's ERP shell -- pixel-rebuilt from the design's own `isSchool`
// icon-grid screen (brain/SIS Principal - App/Principal App.dc.html): same
// circular-icon-in-tinted-circle grid, principalColors, own icon set
// (src/components/principal/icons.tsx) instead of the generic ServiceIcon.
//
// Real capability preserved 1:1 from the pre-rebuild version -- nothing
// removed. The design's own School grid only covers People/Academics/
// Operations/Administration/Employee; several real, already-working
// Principal capabilities have no equivalent in the mock at all (Parents,
// Inventory, Finance, Communities, Reports, Audit Log, My Day, Notifications,
// Profile, Settings) -- kept in their own sections below rather than dropped,
// same "MORE group" precedent already used for the Faculty Portal rebuild
// when a design mock covered a narrower surface than the real shipped app.
//
// Sports is a real, backend-supported oversight capability
// (sports-admin-overview.controller.ts, @Roles PRINCIPAL) that has no mobile
// screen or API client yet -- deliberately not linked here until that screen
// is actually built (a later phase), so this never ships a dead nav item.

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { principalColors } from '@/lib/theme';
import {
  PeopleIcon,
  TeacherIcon,
  AttendanceIcon,
  AcademicCapIcon,
  TimetableIcon,
  CalendarIcon,
  BusIcon,
  HostelIcon,
  LibraryIcon,
  RepairIcon,
  ApprovalIcon,
  NoticeIcon,
  ChatIcon,
  LeaveIcon,
  ODIcon,
  HRIcon,
  PayslipIcon,
  AppraisalIcon,
  SportsIcon,
} from '@/components/principal/icons';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';

type IconRenderer = (props: { color: string; size: number }) => React.ReactElement;

interface NavItem {
  label: string;
  slug: string;
  href?: string;
  icon?: IconRenderer;
  fallbackKey?: ServiceIconKey;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'PEOPLE',
    items: [
      { label: 'Students', slug: 'students', icon: (p) => <PeopleIcon {...p} /> },
      { label: 'Faculty', slug: 'faculty', icon: (p) => <TeacherIcon {...p} /> },
      { label: 'Parents', slug: 'parents', fallbackKey: 'parents' },
      { label: 'Staff attendance', slug: 'attendance', icon: (p) => <AttendanceIcon {...p} /> },
    ],
  },
  {
    title: 'ACADEMICS',
    items: [
      { label: 'Academic structure', slug: 'academics', icon: (p) => <AcademicCapIcon {...p} /> },
      { label: 'Class timetable', slug: 'class-timetable', icon: (p) => <TimetableIcon {...p} /> },
      { label: 'Academic calendar', slug: 'academic-calendar', icon: (p) => <CalendarIcon {...p} /> },
      // Class-level attendance oversight -- distinct from "Staff
      // attendance" above -- full feature parity with the website's own
      // /principal/attendance-sessions page, previously mobile-missing.
      { label: 'Attendance sessions', slug: 'attendance-sessions', icon: (p) => <AttendanceIcon {...p} /> },
      { label: 'Attendance diary', slug: 'attendance-diary', icon: (p) => <AttendanceIcon {...p} /> },
      // Full feature parity with the website's own subject-mapping page,
      // previously mobile-missing.
      { label: 'Subjects & mapping', slug: 'subject-mapping', icon: (p) => <AcademicCapIcon {...p} /> },
      // Full feature parity with the website's own examination-timetable
      // page, previously mobile-missing.
      { label: 'Examination timetable', slug: 'examination-timetable', icon: (p) => <CalendarIcon {...p} /> },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Transport', slug: 'transport', icon: (p) => <BusIcon {...p} /> },
      { label: 'Hostel', slug: 'hostel', icon: (p) => <HostelIcon {...p} /> },
      { label: 'Inventory', slug: 'inventory', fallbackKey: 'inventory' },
      { label: 'Library', slug: 'library', icon: (p) => <LibraryIcon {...p} /> },
      { label: 'Sports', slug: 'sports', icon: (p) => <SportsIcon {...p} /> },
      { label: 'Repairs', slug: 'maintenance', icon: (p) => <RepairIcon {...p} /> },
      // Full feature parity with the website's own Health & Infirmary
      // page, previously mobile-missing.
      { label: 'Health & Infirmary', slug: 'health', fallbackKey: 'health' },
    ],
  },
  {
    title: 'FINANCE',
    items: [{ label: 'Finance', slug: 'finance', fallbackKey: 'fees' }],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Communities', slug: 'communities', fallbackKey: 'communityProfile' },
      { label: 'Notices', slug: 'announcements', icon: (p) => <NoticeIcon {...p} /> },
      { label: 'Messages', slug: 'messages', href: '/(protected)/messaging', icon: (p) => <ChatIcon {...p} /> },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { label: 'Approvals', slug: 'requests-approvals', icon: (p) => <ApprovalIcon {...p} /> },
      { label: 'Reports', slug: 'reports', fallbackKey: 'report' },
      { label: 'Audit log', slug: 'audit-log', fallbackKey: 'records' },
    ],
  },
  {
    title: 'EMPLOYEE',
    items: [
      { label: 'My day', slug: 'my-day', fallbackKey: 'myDay' },
      { label: 'My attendance', slug: 'my-attendance', icon: (p) => <AttendanceIcon {...p} /> },
      { label: 'My leave', slug: 'my-leave', icon: (p) => <LeaveIcon {...p} /> },
      { label: 'OD', slug: 'my-od', icon: (p) => <ODIcon {...p} /> },
      { label: 'HR payroll', slug: 'hr-payroll', icon: (p) => <HRIcon {...p} /> },
      { label: 'Payslip', slug: 'payslip', icon: (p) => <PayslipIcon {...p} /> },
      { label: 'Appraisal', slug: 'appraisal', icon: (p) => <AppraisalIcon {...p} /> },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Notifications', slug: 'notifications', fallbackKey: 'notifications' },
      { label: 'Profile', slug: 'profile', fallbackKey: 'profile' },
      { label: 'Settings', slug: 'settings', fallbackKey: 'settings' },
    ],
  },
];

export default function PrincipalShell() {
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Principal</Text>
        <Text style={styles.headerSubtitle}>School administration</Text>
      </View>
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
                    {item.icon ? item.icon({ color: '#fff', size: 24 }) : <ServiceIcon name={item.fallbackKey!} color="#fff" />}
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
  flex: { flex: 1, backgroundColor: principalColors.background },
  header: { backgroundColor: principalColors.primary, paddingHorizontal: 18, paddingTop: 54, paddingBottom: 18 },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  content: { padding: 18, paddingBottom: 32 },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.2,
    color: principalColors.tertiary,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 20,
  },
  gridItem: {
    width: '25%',
    alignItems: 'center',
    gap: 9,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: principalColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemLabel: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: principalColors.ink,
    textAlign: 'center',
    lineHeight: 15,
  },
});
