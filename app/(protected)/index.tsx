// Home tab -- deliberately simple per plan (only My class + Fees are pixel-built
// and fully wired). Real signed-in person + real linked-children names; no fake
// attendance/fee/homework summary cards invented here.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AuthExpiredError, authedRequest, logout, type PersonSummary, type RoleSummary } from '@/lib/auth';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { parentColors } from '@/lib/theme';

interface MeResponse {
  data: { person: PersonSummary; roles: RoleSummary[] };
}

export default function ProtectedHome() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { children, selected } = useSelectedChild();

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
          <ActivityIndicator color={parentColors.blue} />
        ) : (
          <>
            <Text style={styles.title}>Hi, {me.person.firstName}</Text>
            {selected ? (
              <Text style={styles.subtitle}>
                {selected.studentName} · {[selected.gradeName, selected.sectionName].filter(Boolean).join(' ')}
              </Text>
            ) : null}
            {children.length > 1 ? (
              <Text style={styles.hint}>{children.length} children linked to your account.</Text>
            ) : null}
            <Text style={styles.hint}>Open &ldquo;My class&rdquo; below for Fees and other services.</Text>
          </>
        )}

        <Pressable onPress={handleSignOut} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: parentColors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
  title: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 24, color: parentColors.ink },
  subtitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: parentColors.muted },
  hint: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: parentColors.muted, textAlign: 'center' },
  button: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: parentColors.ink },
});
