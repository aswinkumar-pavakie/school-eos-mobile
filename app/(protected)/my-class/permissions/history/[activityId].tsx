import { useLocalSearchParams } from 'expo-router';
import { PermissionActivityHistoryScreen } from '@/features/permissions/screens/PermissionActivityHistoryScreen';

export default function PermissionActivityHistoryRoute() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  return <PermissionActivityHistoryScreen activityId={activityId} />;
}
