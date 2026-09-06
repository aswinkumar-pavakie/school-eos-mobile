// Minimal placeholder home -- exists only because login needs somewhere real to land.
// Per-role home tabs (Faculty/Parent/Warden/Principal) are each their own feature
// track's job (see each src/features/<domain>/README.md) -- this is not that.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuthExpiredError, authedRequest, logout, type PersonSummary, type RoleSummary } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

interface MeResponse {
  data: { person: PersonSummary; roles: RoleSummary[] };
}

export default function ProtectedHome() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authedRequest<MeResponse>('/auth/me')
      .then((res) => setMe(res.data))
      .catch((err) => {
        if (err instanceof AuthExpiredError) {
          router.replace('/(auth)/login');
          return;
        }
        setError('Unable to load your account.');
      });
  }, [router]);

  async function handleSignOut() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        {error ? (
          <Text style={styles.subtitle}>{error}</Text>
        ) : !me ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Text style={styles.title}>Welcome, {me.person.firstName}</Text>
            <Text style={styles.subtitle}>{me.roles.map((r) => r.role_code).join(', ')}</Text>
          </>
        )}

        {me ? (
          <Pressable onPress={() => router.push('/(protected)/online-classes')} style={styles.button}>
            <Text style={styles.buttonText}>Online Classes</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={handleSignOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 },
  title: { fontFamily: fonts.extraBold, fontSize: 24, color: colors.text },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  button: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
});
