// Parent-Teacher Meeting call for Expo Go (and any build without the native
// WebRTC module): same token flow and roles as MeetingCallScreen.tsx, but the
// room runs in a WebView (see features/call-webview). Reached through
// LazyCallScreen's fallback -- the native screen is still used whenever it
// can load.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { ApiError } from '@/lib/api';
import {
  requestFacultyCallToken,
  requestParentCallToken,
  type MeetingCallCredentials,
} from '@/lib/faculty-parent-meetings-api';
import { parentColors } from '@/lib/theme';
import { WebViewCallRoom } from '@/features/call-webview/WebViewCallRoom';

export function MeetingCallWebScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const { isFaculty: isFacultyRole, isClassTeacherLogin, isLoading: rolesLoading } = useCurrentRoles();
  // A Class Teacher login hosts parent meetings too (the backend's faculty
  // call-token endpoint accepts CLASS_ADVISOR), so it takes the host side.
  const isFaculty = isFacultyRole || isClassTeacherLogin;

  const [credentials, setCredentials] = useState<MeetingCallCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rolesLoading || !bookingId) return;
    let cancelled = false;
    (isFaculty ? requestFacultyCallToken(bookingId) : requestParentCallToken(bookingId))
      .then((creds) => {
        if (!cancelled) setCredentials(creds);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not join the call.');
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, isFaculty, rolesLoading]);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
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

  if (!credentials) {
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
      mode="meeting"
      canModerate={false}
      canRaiseHand={false}
      waitingText="Waiting for the other person to join…"
      onLeave={leave}
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
