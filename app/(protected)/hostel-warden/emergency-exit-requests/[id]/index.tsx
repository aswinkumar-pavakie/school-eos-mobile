import { useLocalSearchParams } from 'expo-router';
import { OutingRequestDetailScreen } from '@/components/OutingRequestDetailScreen';
import {
  approveEmergencyExitRequest,
  getEmergencyExitRequest,
  rejectEmergencyExitRequest,
} from '@/lib/hostel-warden-api';

export default function EmergencyExitRequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return (
    <OutingRequestDetailScreen
      id={id}
      title="Emergency Exit Request"
      listQueryKey="emergency-exit-requests"
      getFn={getEmergencyExitRequest}
      approveFn={approveEmergencyExitRequest}
      rejectFn={rejectEmergencyExitRequest}
      approveConfirmTitle="Approve Emergency Exit?"
    />
  );
}
