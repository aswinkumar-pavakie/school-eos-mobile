// Attendance-only student profile opened from the Attendance Diary (Faculty, Class Advisor and
// Academic Coordinator all land here) -- scope is enforced by the backend.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StudentAttendanceProfileScreen } from '@/features/attendance-diary/StudentAttendanceProfileScreen';

export default function FacultyAttendanceDiaryStudent() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  return (
    <StudentAttendanceProfileScreen
      studentId={studentId}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(protected)/faculty/attendance-diary' as never))}
    />
  );
}
