import { useLocalSearchParams } from 'expo-router';
import { OnlineClassDetailScreen } from '@/features/online-classes/screens/OnlineClassDetailScreen';

export default function AcademicsOnlineClassDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OnlineClassDetailScreen id={id} basePath="/(protected)/academics/online-classes" />;
}
