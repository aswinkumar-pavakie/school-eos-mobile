import { ActivityIndicator, View } from 'react-native';
import { hasRole, useMe } from '@/hooks/useMe';
import { colors } from '@/lib/theme';
import { FacultyOnlineClassHubScreen } from '@/features/online-classes/screens/FacultyOnlineClassHubScreen';
import { ParentOnlineClassHubScreen } from '@/features/online-classes/screens/ParentOnlineClassHubScreen';

export default function AcademicsOnlineClassRoute() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (hasRole(me.data?.roles, 'FACULTY')) {
    return <FacultyOnlineClassHubScreen />;
  }
  return <ParentOnlineClassHubScreen />;
}
