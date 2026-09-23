// Faculty "Hostel" tab -- only shown for a faculty member who actually
// resides in the hostel (staff.is_hosteller, see query.md's own migration).
// No staff-hostel-accommodation feature exists yet -- honestly empty rather
// than a dead-tap tile, same treatment as Campus. Add real content here once
// that feature is built.

import { useRouter } from 'expo-router';
import { EmptyHubScreen } from '@/components/EmptyHubScreen';

export default function FacultyHostelHub() {
  const router = useRouter();
  return <EmptyHubScreen title="Hostel" onBack={() => router.replace('/')} />;
}
