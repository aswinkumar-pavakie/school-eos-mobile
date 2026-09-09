import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { StaffLeaveScreenBody } from '@/components/faculty/StaffLeaveScreenBody';

export default function StaffOdScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="OD" subtitle="On-duty requests" onBack={() => router.replace('/erp' as never)} />
      <StaffLeaveScreenBody mode="OD" />
    </View>
  );
}
