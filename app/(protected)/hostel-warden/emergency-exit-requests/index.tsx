import { OutingRequestListScreen } from '@/components/OutingRequestListScreen';
import { approveEmergencyExitRequest, listEmergencyExitRequests, rejectEmergencyExitRequest } from '@/lib/hostel-warden-api';

// Separate from Gate Pass -- same underlying mechanics, but a distinct domain the
// Warden must never confuse with a routine outing (see the backend's own emphasis
// on strong audit logging for this one).
export default function EmergencyExitRequestsScreen() {
  return (
    <OutingRequestListScreen
      title="Emergency Exit Approval"
      subtitle="Parent-initiated emergency requests"
      emptyMessage="No decided emergency exit requests yet."
      queryKey="emergency-exit-requests"
      listFn={listEmergencyExitRequests}
      detailHref={(id) => `/(protected)/hostel-warden/emergency-exit-requests/${id}`}
      approveFn={approveEmergencyExitRequest}
      rejectFn={rejectEmergencyExitRequest}
      approveConfirmTitle="Approve this emergency exit?"
    />
  );
}
