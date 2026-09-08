import { useLocalSearchParams } from 'expo-router';
import { OutingRequestDetailScreen } from '@/components/OutingRequestDetailScreen';
import { approveGatePassRequest, getGatePassRequest, rejectGatePassRequest } from '@/lib/hostel-warden-api';

export default function GatePassRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return (
    <OutingRequestDetailScreen
      id={id}
      title="Gate Pass Request"
      listQueryKey="gate-pass-requests"
      getFn={getGatePassRequest}
      approveFn={approveGatePassRequest}
      rejectFn={rejectGatePassRequest}
      approveConfirmTitle="Approve Gate Pass?"
    />
  );
}
