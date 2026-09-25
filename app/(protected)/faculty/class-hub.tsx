// Faculty "Class" tab -- the real Class-tab destination in the 5-tab bar
// (Home/Class/Progress/Campus/My Bus). Carries forward every real, already-
// built Faculty student-facing feature from the old single-page /erp grid
// (STUDENT_TILES there), minus "Class Teacher" (that duty now lives behind
// the Faculty<->Class Teacher account switch, not a tile inside Faculty's
// own Class tab -- a faculty member reaches it by switching identity, not
// by peeking through this tile), plus Timetable/Calendar/LMS/Online Class,
// which existed as real routes but had no tile pointing at them anywhere.
// Venue Booking stays excluded (see /erp's own header note: no backend).

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { getCoordinatorMe } from '@/lib/faculty-academic-coordinator-api';
import { facultyColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href: string;
}

const CLASS_TILES: ServiceItem[] = [
  { key: 'attendance', label: 'Student Attendance', href: '/(protected)/faculty/attendance' },
  { key: 'attendance', label: 'Attendance Diary', href: '/(protected)/faculty/attendance-diary' },
  { key: 'onlineclass', label: 'Online Class', href: '/(protected)/academics/online-class' },
  { key: 'announcements', label: 'Notices', href: '/(protected)/faculty/announcements' },
  { key: 'timetable', label: 'Timetable', href: '/(protected)/faculty/timetable' },
  { key: 'events', label: 'Calendar', href: '/(protected)/faculty/calendar' },
  { key: 'exams', label: 'Exams', href: '/(protected)/faculty/exams' },
  { key: 'marksEntry', label: 'Marks Entry', href: '/(protected)/faculty/marks-entry' },
  { key: 'report', label: 'Class Results', href: '/(protected)/faculty/class-results' },
  { key: 'records', label: 'Subject Records', href: '/(protected)/faculty/subject-records' },
  { key: 'subjects', label: 'LMS', href: '/(protected)/faculty/lms' },
  { key: 'homework', label: 'Homework', href: '/(protected)/faculty/homework' },
  { key: 'leave', label: 'Student Leave', href: '/(protected)/faculty/student-leave' },
  { key: 'meetings', label: 'Parent Meetings', href: '/(protected)/faculty/parent-meetings' },
  { key: 'messages', label: 'Messages', href: '/(protected)/messaging' },
  { key: 'events', label: 'Events', href: '/events' },
];

export default function FacultyClassHub() {
  const router = useRouter();
  // Academic Coordinator has no design reference and no tile of its own
  // here otherwise -- only shown for a real, currently-active coordinator,
  // checked live on every load (same "never assumed from a cached flag"
  // posture the old /erp page used before this tab replaced it).
  const coordinatorMeQuery = useQuery({ queryKey: ['faculty-academic-coordinator-me'], queryFn: getCoordinatorMe });
  const tiles = coordinatorMeQuery.data?.isCoordinator
    ? [...CLASS_TILES, { key: 'coordinator' as ServiceIconKey, label: 'Coordinator Hub', href: '/(protected)/faculty/coordinator' }]
    : CLASS_TILES;

  return (
    <View style={styles.flex}>
      <AppHeader title="Class" subtitle="Your teaching & class tools" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {tiles.map((item, i) => (
            <Pressable key={`${item.label}-${i}`} style={styles.item} onPress={() => router.push(item.href as never)}>
              <View style={styles.iconCircle}>
                <ServiceIcon name={item.key} color="#fff" size={26} />
              </View>
              <Text style={styles.itemLabel} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  item: { width: '25%', alignItems: 'center', gap: 8, paddingHorizontal: 3 },
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
