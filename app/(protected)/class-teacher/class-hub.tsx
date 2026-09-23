// Class Teacher (Advisor) "Class" tab -- tile order matches the product
// notes' own Class-tab list exactly: Student data [batch], Attendance
// class, Time Table, Calendar (events), Exams, Daily Tasks, Parent
// Meetings, Leave, Subject records, Fees. "Notice" is deliberately NOT
// here -- the notes place it under Home, not Class, for this login (see
// ClassTeacherHome.tsx's own Notices carousel).
//
// Reuses the exact same faculty/* routes/screens the Faculty identity
// uses (attendance.tsx, class-results.tsx, etc.). This works because the
// backend controllers those screens call were widened to accept
// CLASS_ADVISOR alongside FACULTY (see faculty-attendance.controller.ts
// and its siblings) -- authorization is re-derived per request from this
// login's own CLASS_ADVISOR role_assignment (scoped to its one section),
// not from anything client-side, so these screens naturally show only
// this login's own advisor section.
//
// "Fees" is real now (class-fees.tsx, backed by faculty-fees.controller.ts
// -- read-only class fee-dues summary, not a payment flow; that stays
// Parent-only). "Daily Tasks" is still left out -- no backend/mobile
// screen exists for it at all yet.
//
// "Subject records" is ALSO left out -- that screen is explicitly
// teaching-offering scoped (subject-records.tsx's own header comment: "not
// advisor"), so a CLASS_ADVISOR-only login (no subject_offering assignments
// of its own) would just see it permanently empty.
//
// "Time Table" points at its OWN screen (class-teacher/timetable.tsx), not
// faculty/timetable.tsx -- that one is teaching-offering scoped too
// (personal "am I free" periods), meaningless for this identity. A real,
// advisor-scoped class timetable now exists instead: GET
// faculty/timetable/section, backed by FacultyTimetableService.
// getForAdvisorSection (reuses AcademicCoordinatorTimetableRepository's own
// findSlotsForSection/findPeriodsForStage read queries against a new
// advisor-aware scope check, FacultyScopeRepository.
// findAdvisorSectionWithStage -- not the Coordinator's grade-coverage one).
//
// "Exams" also points at its OWN screen (class-teacher/exams.tsx), not
// class-results.tsx -- that one aggregates whole-class stats (grade
// distribution/toppers) for one exam at a time, not what was asked for
// here (Upcoming vs Finished, filterable by subject, tap a Finished exam
// for student-wise marks per subject). Backed by the same
// FacultyExamScheduleService.listExamSubjects/getMarksForExamSubject
// Faculty's own new Exams tile uses -- every subject in this login's
// advisor section, not just ones it personally teaches (it teaches none).

import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon, type ServiceIconKey } from '@/components/ServiceIcon';
import { facultyColors } from '@/lib/theme';

interface ServiceItem {
  key: ServiceIconKey;
  label: string;
  href: string;
}

const CLASS_TEACHER_TILES: ServiceItem[] = [
  { key: 'classTeacher', label: 'Student Data', href: '/(protected)/faculty/class-teacher' },
  { key: 'attendance', label: 'Attendance', href: '/(protected)/faculty/attendance' },
  { key: 'timetable', label: 'Time Table', href: '/(protected)/class-teacher/timetable' },
  { key: 'events', label: 'Calendar', href: '/(protected)/faculty/calendar' },
  { key: 'exams', label: 'Exams', href: '/(protected)/class-teacher/exams' },
  { key: 'meetings', label: 'Parent Meetings', href: '/(protected)/faculty/parent-meetings' },
  { key: 'leave', label: 'Leave', href: '/(protected)/faculty/student-leave' },
  { key: 'fees', label: 'Fees', href: '/(protected)/faculty/class-fees' },
];

export default function ClassTeacherClassHub() {
  const router = useRouter();
  return (
    <View style={styles.flex}>
      <AppHeader title="Class" subtitle="Your class advisor tools" onBack={() => router.replace('/')} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {CLASS_TEACHER_TILES.map((item, i) => (
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
