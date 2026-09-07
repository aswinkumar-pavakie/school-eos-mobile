// Faculty "ERP" services grid -- pixel-matches "ERP screen design choice/Faculty
// Module - 2" (STUDENT / EMPLOYEE sections), same grid pattern my-class/index.tsx
// already uses for the Parent app. "Messages" and "Permissions" point at this
// branch's own Messaging/Permissions modules (not hot-fix-sri's separate, unwired
// Events/Permissions feature -- see app/(protected)/_layout.tsx for why); every
// other tile besides those is visual-only (design complete, feature not yet built).

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { parentColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href?: '/(protected)/my-class/messages' | '/(protected)/my-class/permissions';
}

const SECTIONS: { title: string; items: ServiceItem[] }[] = [
  {
    title: 'Communication',
    items: [
      { key: 'messages', label: 'Messages', href: '/(protected)/my-class/messages' },
      { key: 'consent', label: 'Permissions', href: '/(protected)/my-class/permissions' },
    ],
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
      { key: 'events', label: 'Events' },
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
