import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { StaffLeaveScreenBody } from '@/components/faculty/StaffLeaveScreenBody';

export default function StaffLeaveScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Leave" subtitle="My leave requests" onBack={() => router.replace('/erp' as never)} />
      <StaffLeaveScreenBody mode="LEAVE" />
    </View>
  );
}
