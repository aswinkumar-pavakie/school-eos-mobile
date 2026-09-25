// Vice Principal -> Attendance Diary (students + employees, whole school). Scope is enforced by
// the backend from this login's own role mappings; see src/features/attendance-diary.
import { useRouter } from 'expo-router';
import { AttendanceDiaryScreen } from '@/features/attendance-diary/AttendanceDiaryScreen';

export default function VicePrincipalAttendanceDiary() {
  const router = useRouter();
  return (
    <AttendanceDiaryScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/vice-principal' as never))}
      onOpenStudent={(id) => router.push(`/(protected)/vice-principal/students/${id}` as never)}
      onOpenEmployee={(id) => router.push(`/(protected)/vice-principal/faculty/${id}` as never)}
    />
  );
}
