import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSession } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function Index() {
  const { status } = useSession();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return status === 'signedIn' ? <Redirect href="/(protected)" /> : <Redirect href="/(auth)/login" />;
}
