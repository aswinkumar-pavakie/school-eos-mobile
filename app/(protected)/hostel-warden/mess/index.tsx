// Hostel Warden -> Mess register. No real mess/meal-menu backend exists
// (confirmed by backend audit -- hostel.module.ts's own header comment
// explicitly names "mess attendance" as a later, unbuilt phase). Honest gap
// notice rather than fabricated menu data.

import { useRouter } from 'expo-router';
import { GapScreen } from '@/components/hostel-warden/primitives';

export default function MessScreen() {
  const router = useRouter();
  return (
    <GapScreen
      title="Mess register"
      message="The mess menu register isn't built in the school system yet. This screen will connect once that backend exists."
      onBack={() => router.back()}
    />
  );
}
