// "All services" -- pixel replica of the design reference's isServices block: 4
// titled sections, 3-column grid, 58px circular blue icon buttons. Fees and
// Messages are this branch's own modules; Permissions is hot-fix-sri's own
// Events-consent feature (this branch's own Permissions module was removed in
// favor of it -- one real consent flow, not two).

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { parentColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href?:
    | '/fees'
    | '/(protected)/my-class/messages'
    | '/permissions'
    | '/(protected)/hostel/gate-pass-requests'
    | '/(protected)/hostel/emergency-exit-requests'
    | '/(protected)/hostel/call-requests';
}

const SECTIONS: { title: string; items: ServiceItem[] }[] = [
  {
    title: 'Academics',
    items: [
      { key: 'report', label: 'Results' },
      { key: 'homework', label: 'Homework' },
      { key: 'exams', label: 'Exams' },
    ],
  },
  {
    title: 'School life',
    items: [
      { key: 'attendance', label: 'Attendance' },
      { key: 'leave', label: 'Leave' },
      { key: 'library', label: 'Library' },
      { key: 'health', label: 'Health room' },
      { key: 'meetings', label: 'Meetings' },
      { key: 'feedback', label: 'Feedback' },
    ],
  },
  {
    title: 'Money',
    items: [
      { key: 'fees', label: 'Fees', href: '/fees' },
      { key: 'canteen', label: 'Canteen' },
      { key: 'certificates', label: 'Documents' },
    ],
  },
  {
    title: 'Family',
    items: [
      { key: 'messages', label: 'Messages', href: '/(protected)/my-class/messages' },
      { key: 'consent', label: 'Permissions', href: '/permissions' },
      { key: 'settings', label: 'Settings' },
    ],
  },
  // Only meaningful for a hostel-boarder child -- the backend itself rejects a
  // request for a student with no active hostel allocation (clear error message),
  // so these tiles aren't hidden for a non-boarder rather than needing a second
  // "is this child a hosteller" check the Parent app doesn't otherwise carry.
  {
    title: 'Hostel',
    items: [
      { key: 'gatePass', label: 'Gate Pass', href: '/(protected)/hostel/gate-pass-requests' },
      { key: 'emergencyExit', label: 'Emergency Exit', href: '/(protected)/hostel/emergency-exit-requests' },
      { key: 'callRequest', label: 'Call Request', href: '/(protected)/hostel/call-requests' },
    ],
  },
];

export default function MyClassScreen() {
  const router = useRouter();
  const { selected, isLoading } = useSelectedChild();

  const subtitle = selected
    ? [selected.gradeName, selected.sectionName ? `Section ${selected.sectionName}` : null].filter(Boolean).join(' · ')
    : undefined;

  return (
    <View style={styles.flex}>
      <AppHeader title="All services" subtitle={subtitle} onBack={() => router.replace('/')} />
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              <View style={styles.grid}>
                {section.items.map((item) => (
                  <Pressable
                    key={item.key}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
