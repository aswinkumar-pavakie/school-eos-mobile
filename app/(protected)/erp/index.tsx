// Faculty "ERP" services grid -- pixel-matches "ERP screen design choice/Faculty
// Module - 2" (STUDENT / EMPLOYEE sections), same grid pattern my-class/index.tsx
// already uses for the Parent app. "Messages" is this branch's own Messaging
// module; "Events" is hot-fix-sri's own Events/consent feature (this branch's own
// Permissions module was removed in favor of it -- one real consent flow, not
// two). Every other tile is visual-only (design complete, feature not yet built).

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { parentColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href?: '/(protected)/my-class/messages' | '/events';
}

const SECTIONS: { title: string; items: ServiceItem[] }[] = [
  {
    title: 'Communication',
    items: [{ key: 'messages', label: 'Messages', href: '/(protected)/my-class/messages' }],
  },
  {
    title: 'Student',
    items: [
      { key: 'attendance', label: 'Student Attendance' },
      { key: 'leave', label: 'Leave' },
      { key: 'records', label: 'Subject Records' },
      { key: 'marksEntry', label: 'Marks Entry' },
      { key: 'announcements', label: 'Announcements' },
      { key: 'report', label: 'Class Results' },
      { key: 'homework', label: 'Homework' },
      { key: 'classTeacher', label: 'Class Teacher' },
      { key: 'meetings', label: 'Parent Meetings' },
      { key: 'events', label: 'Events', href: '/events' },
    ],
  },
  {
    title: 'Employee',
    items: [
      { key: 'attendance', label: 'Attendance' },
      { key: 'leave', label: 'Leave' },
      { key: 'od', label: 'OD' },
      { key: 'venue', label: 'Venue' },
      { key: 'payroll', label: 'HR Payroll' },
      { key: 'payslip', label: 'Payslip' },
      { key: 'appraisal', label: 'Appraisal' },
      { key: 'library', label: 'Library' },
    ],
  },
];

export default function ErpScreen() {
  const router = useRouter();
  const { isHostelWarden, isPrincipal } = useCurrentRoles();

  // The ERP tab is Hostel Warden's own operational home for that role -- see
  // hostel-warden/index.tsx -- rather than the Faculty services grid below.
  if (isHostelWarden) {
    return <Redirect href={'/(protected)/hostel-warden' as never} />;
  }
  // Same pattern for Principal -- see principal/index.tsx.
  if (isPrincipal) {
    return <Redirect href={'/(protected)/principal' as never} />;
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="ERP" subtitle="Faculty services" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.grid}>
              {section.items.map((item, i) => (
                <Pressable
                  key={`${item.key}-${i}`}
                  style={styles.item}
                  onPress={item.href ? () => router.push(item.href! as never) : undefined}
                >
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
