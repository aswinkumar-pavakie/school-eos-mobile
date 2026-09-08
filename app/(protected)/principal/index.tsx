// Principal's operational home -- reached via the shared bottom tab bar's ERP tab
// (see erp/index.tsx's redirect and BottomTabBar.tsx's per-role tab labels), not a
// standalone login-time landing page. Deliberately minimal -- messaging is the
// only Principal feature built so far; no dashboard/analytics invented here.

import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { ServiceIcon } from '@/components/ServiceIcon';
import { parentColors } from '@/lib/theme';

export default function PrincipalScreen() {
  const router = useRouter();

  return (
    <View style={styles.flex}>
      <AppHeader title="Principal" subtitle="School administration" onBack={() => router.replace('/')} />
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>COMMUNICATION</Text>
        <Pressable
          style={styles.tile}
          onPress={() => router.push('/(protected)/my-class/messages' as never)}
        >
          <View style={styles.iconCircle}>
            <ServiceIcon name="messages" color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tileLabel}>Messages</Text>
            <Text style={styles.tileSubtitle}>Message any faculty member or student&apos;s family</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 18 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.2,
    color: parentColors.muted,
    marginBottom: 14,
  },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: parentColors.background,
    borderRadius: 16,
    padding: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  tileSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  chevron: { fontSize: 26, color: parentColors.mutedLight, fontFamily: 'PlusJakartaSans_400Regular' },
});
