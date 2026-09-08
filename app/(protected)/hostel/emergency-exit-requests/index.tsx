import { ParentOutingRequestScreen } from '@/components/ParentOutingRequestScreen';
import { createEmergencyExitRequest, listMyEmergencyExitRequests } from '@/lib/parent-hostel-api';

// Separate from Gate Pass Requests on purpose -- same shared screen body, but a
// distinct route/title/copy so the two domains stay visually and semantically
// distinct to the parent, matching the Warden side's own "do not merge" rule.
export default function ParentEmergencyExitRequestsScreen() {
  return (
    <ParentOutingRequestScreen
      title="Emergency Exit Requests"
      subtitle="Request an emergency exit for your child"
      queryKey="emergency-exit-requests"
      listFn={listMyEmergencyExitRequests}
      createFn={createEmergencyExitRequest}
      showDestination={false}
      emptyMessage="No emergency exit requests yet."
    />
  );
}
