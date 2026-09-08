import { OutingRequestListScreen } from '@/components/OutingRequestListScreen';
import { approveGatePassRequest, listGatePassRequests, rejectGatePassRequest } from '@/lib/hostel-warden-api';

export default function GatePassRequestsScreen() {
  return (
    <OutingRequestListScreen
      title="Gate Pass Approval"
      subtitle="Parent-initiated outing requests"
      emptyMessage="No decided gate pass requests yet."
      queryKey="gate-pass-requests"
      listFn={listGatePassRequests}
      detailHref={(id) => `/(protected)/hostel-warden/gate-pass-requests/${id}`}
      approveFn={approveGatePassRequest}
      rejectFn={rejectGatePassRequest}
      approveConfirmTitle="Approve this gate pass?"
    />
  );
}
