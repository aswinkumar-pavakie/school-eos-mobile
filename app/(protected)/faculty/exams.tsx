import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ExamsScreenBody } from '@/components/faculty/ExamsScreenBody';

export default function FacultyExamsScreen() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="Exams" subtitle="Exams for your subjects" onBack={() => router.replace('/faculty/class-hub' as never)} />
      <ExamsScreenBody marksRouteBase="/(protected)/faculty/exam-marks" />
    </View>
  );
}
