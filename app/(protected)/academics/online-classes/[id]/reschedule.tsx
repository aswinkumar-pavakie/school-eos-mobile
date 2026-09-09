import { useLocalSearchParams } from 'expo-router';
import { RescheduleOnlineClassScreen } from '@/features/online-classes/screens/RescheduleOnlineClassScreen';

export default function AcademicsRescheduleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RescheduleOnlineClassScreen id={id} />;
}
