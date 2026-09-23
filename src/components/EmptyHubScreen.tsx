// Honest placeholder for a nav tab whose underlying features (Food Court,
// Medical, Copy Center, Stationery Store, House, Transport/Hostel oversight
// for a class teacher, etc.) have no backend or route built yet -- shows
// nothing fake to tap rather than a dead link. Swap tiles in here as each
// feature actually gets built.

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { facultyColors } from '@/lib/theme';

export function EmptyHubScreen({
  title,
  onBack,
  message = 'Nothing here yet -- check back soon.',
}: {
  title: string;
  onBack: () => void;
  message?: string;
}) {
  return (
    <View style={styles.flex}>
      <AppHeader title={title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.message}>{message}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  message: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: facultyColors.muted,
    textAlign: 'center',
  },
});
