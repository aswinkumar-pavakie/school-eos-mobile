import { ParentOutingRequestScreen } from '@/components/ParentOutingRequestScreen';
import { createGatePassRequest, listMyGatePassRequests } from '@/lib/parent-hostel-api';

export default function ParentGatePassRequestsScreen() {
  return (
    <ParentOutingRequestScreen
      title="Gate Pass Requests"
      subtitle="Request an outing for your child"
      queryKey="gate-pass-requests"
      listFn={listMyGatePassRequests}
      createFn={createGatePassRequest}
      showDestination
      emptyMessage="No gate pass requests yet."
    />
  );
}
