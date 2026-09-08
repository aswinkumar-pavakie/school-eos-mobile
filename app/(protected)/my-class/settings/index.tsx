// Settings -- pixel-matched to "ERP screen design choice/School App.dc.html"'s
// own isSettings block (Currency, Language, Privacy and data). This app only ever
// deals in INR (no real multi-currency backend concept) and there's no real i18n
// system, so both cards render as static, honest display copy rather than working
// switchers. A Sign out card is added beyond the mockup: after a recent Home-screen
// change there is no other reachable sign-out control for a Parent, so this is the
// only place left to end a session from -- same logout() + redirect pattern as
// app/(protected)/index.tsx's own handleSignOut.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { logout } from '@/lib/auth';
import { parentColors } from '@/lib/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Settings" subtitle="Language, currency and privacy" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Currency</Text>
          <Text style={styles.cardSubtitle}>Fees, receipts and the canteen wallet</Text>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>INR (₹)</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Language</Text>
          <Text style={styles.cardSubtitle}>English (UK) · more languages coming</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy and data</Text>
          <Text style={styles.paragraph}>
            Records are processed under the school&rsquo;s GDPR notice. You can request an export or erasure of your
            child&rsquo;s data from the school office.
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable style={styles.signOutButton} onPress={handleSignOut} disabled={signingOut}>
            {signingOut ? (
              <ActivityIndicator color={parentColors.redDark} />
            ) : (
              <Text style={styles.signOutText}>Sign out</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: {
    backgroundColor: parentColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 16,
  },
  cardTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  cardSubtitle: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  paragraph: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.bodyMuted, marginTop: 8, lineHeight: 21 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: parentColors.pillBlueBg,
    borderWidth: 1.5,
    borderColor: parentColors.blueDeep,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  signOutButton: {
    backgroundColor: parentColors.redBg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.redDark },
});
