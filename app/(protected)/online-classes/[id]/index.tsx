import { useLocalSearchParams } from 'expo-router';
import { OnlineClassDetailScreen } from '@/features/online-classes/screens/OnlineClassDetailScreen';

export default function OnlineClassDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OnlineClassDetailScreen id={id} />;
}
