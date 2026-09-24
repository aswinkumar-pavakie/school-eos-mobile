// Online Class call for Expo Go (and any build without the native WebRTC
// module): same token flow, roles and actions as OnlineClassCallScreen.tsx --
// teacher can end the class and mute students, students can raise a hand,
// everyone gets the roster and chat -- but the room runs in a WebView (see
// features/call-webview). Reached through LazyCallScreen's fallback; the
// native screen is still used whenever it can load.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { ApiError } from '@/lib/api';
import {
  endOnlineClassCall,
  muteOnlineClassParticipant,
  requestOnlineClassCallToken,
  type OnlineClassCallCredentials,
} from '@/features/online-classes/api';
import { parentColors } from '@/lib/theme';
import { WebViewCallRoom } from '@/features/call-webview/WebViewCallRoom';

export function OnlineClassCallWebScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFaculty, isLoading: rolesLoading } = useCurrentRoles();

  const [credentials, setCredentials] = useState<OnlineClassCallCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rolesLoading || !id) return;
    let cancelled = false;
    requestOnlineClassCallToken(id)
      .then((creds) => {
        if (!cancelled) setCredentials(creds);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not join this class.');
      });
    return () => {
      cancelled = true;
    };
  }, [id, rolesLoading]);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }

  async function end() {
    try {
      await endOnlineClassCall(id);
    } catch {
      // Still leave even if the state change fails -- never trap the teacher
      // on a call screen they explicitly asked to end.
    }
    leave();
  }

  function mute(identity: string, muted: boolean) {
    // Best-effort, like the native roster: not worth a blocking alert mid-call.
    muteOnlineClassParticipant(id, identity, muted).catch(() => undefined);
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color="#B33A2E" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.button} onPress={leave}>
          <Text style={styles.buttonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!credentials || rolesLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={parentColors.blue} size="large" />
        <Text style={styles.loadingText}>Connecting…</Text>
      </View>
    );
  }

  return (
    <WebViewCallRoom
      url={credentials.url}
      token={credentials.token}
      mode="class"
      canModerate={isFaculty}
      canRaiseHand={!isFaculty}
      waitingText={isFaculty ? 'Waiting for students to join…' : 'Waiting for the teacher…'}
      onLeave={leave}
      onEnd={end}
      onMute={mute}
      onError={setError}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28, backgroundColor: '#fff' },
  errorText: { fontSize: 14, color: '#334155', textAlign: 'center', lineHeight: 20 },
  loadingText: { fontSize: 14, color: '#64748B' },
  button: { marginTop: 4, backgroundColor: parentColors.blue, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 22 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
