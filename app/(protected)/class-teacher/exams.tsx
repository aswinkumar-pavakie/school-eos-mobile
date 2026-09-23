// Class Teacher's own Exams -- every subject in their advisor section (not
// just ones they'd personally teach, since a Class Teacher doesn't
// necessarily teach any -- see FacultyExamScheduleService.listExamSubjects
// unioning advisor sections in too), Upcoming/Finished tabs + per-subject
// filter, tap a Finished row for student-wise marks.

import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ExamsScreenBody } from '@/components/faculty/ExamsScreenBody';

export default function ClassTeacherExamsScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Exams" subtitle="Your class's exams, every subject" onBack={() => router.replace('/class-teacher/class-hub' as never)} />
      <ExamsScreenBody marksRouteBase="/(protected)/faculty/exam-marks" />
    </View>
  );
}
