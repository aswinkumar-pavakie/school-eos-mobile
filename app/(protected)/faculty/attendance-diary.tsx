// Attendance Diary for Faculty, Class Advisor and Academic Coordinator logins (one screen: the
// backend scopes it to the classes this exact login teaches / advises / coordinates, and only an
// Academic Coordinator gets the Employees toggle). See src/features/attendance-diary.
import { useRouter } from 'expo-router';
import { AttendanceDiaryScreen } from '@/features/attendance-diary/AttendanceDiaryScreen';

export default function FacultyAttendanceDiary() {
  const router = useRouter();
  return (
    <AttendanceDiaryScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/' as never))}
      // Everyone (Faculty, Class Advisor, Academic Coordinator) opens the same limited,
      // attendance-only profile -- the backend scopes it, so a subject-teaching (non-advisor)
      // faculty member never hits the old advisor-only student-detail screen's 403.
      onOpenStudent={(id) => router.push(`/(protected)/faculty/attendance-diary-student/${id}` as never)}
    />
  );
}
