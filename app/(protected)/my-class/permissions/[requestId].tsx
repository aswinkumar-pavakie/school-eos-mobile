import { useLocalSearchParams } from 'expo-router';
import { PermissionRequestDetailScreen } from '@/features/permissions/screens/PermissionRequestDetailScreen';

export default function PermissionRequestDetailRoute() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  return <PermissionRequestDetailScreen requestId={requestId} />;
}
