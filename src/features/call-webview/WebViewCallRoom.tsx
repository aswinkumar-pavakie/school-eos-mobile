// Runs the call-room page (callRoomHtml.ts) inside a WebView and turns its
// messages into app actions. This is what makes Online Class and Parent
// Meeting calls work in Expo Go: the native call screens need
// @livekit/react-native (a native WebRTC module Expo Go doesn't have), but a
// WebView's own browser engine does WebRTC natively -- no custom build, no
// Android SDK on the developer's machine.

import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { buildCallRoomHtml, type CallRoomMode } from './callRoomHtml';

type CallMessage =
  | { type: 'connected' }
  | { type: 'leave' }
  | { type: 'end' }
  | { type: 'disconnected'; reason: string | null }
  | { type: 'log'; message: string }
  | { type: 'mute'; identity: string; muted: boolean }
  | { type: 'error'; message: string };

function parseMessage(raw: string): CallMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const m = parsed as Record<string, unknown>;
    switch (m.type) {
      case 'connected':
      case 'leave':
      case 'end':
        return { type: m.type };
      case 'disconnected':
        return { type: 'disconnected', reason: typeof m.reason === 'string' ? m.reason : null };
      case 'log':
        return { type: 'log', message: typeof m.message === 'string' ? m.message : '' };
      case 'mute':
        return typeof m.identity === 'string' && typeof m.muted === 'boolean'
          ? { type: 'mute', identity: m.identity, muted: m.muted }
          : null;
      case 'error':
        return { type: 'error', message: typeof m.message === 'string' ? m.message : 'Something went wrong.' };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function WebViewCallRoom({
  url,
  token,
  mode,
  canModerate,
  canRaiseHand,
  waitingText,
  onLeave,
  onEnd,
  onMute,
  onError,
}: {
  url: string;
  token: string;
  mode: CallRoomMode;
  canModerate: boolean;
  canRaiseHand: boolean;
  waitingText: string;
  /** The user left, or the server ended the call. */
  onLeave: () => void;
  /** Teacher pressed "End class" -- end it for everyone, then leave. */
  onEnd?: () => void;
  onMute?: (identity: string, muted: boolean) => void;
  onError: (message: string) => void;
}) {
  const handled = useRef(false);
  const [endedReason, setEndedReason] = useState<string | null | undefined>(undefined);

  // Rebuilt only if the credentials or role change -- never on a re-render,
  // which would reload the page and drop the user from the call.
  const html = useMemo(
    () => buildCallRoomHtml({ url, token, mode, canModerate, canRaiseHand, waitingText }),
    [url, token, mode, canModerate, canRaiseHand, waitingText],
  );

  // getUserMedia only works in a secure context. https is one; so is
  // http://localhost, which is what a plain-ws:// (LAN/dev) LiveKit server
  // needs since an https page can't open an insecure ws:// socket.
  const baseUrl = url.startsWith('ws://') ? 'http://localhost' : 'https://localhost';

  function finish(action: () => void) {
    if (handled.current) return;
    handled.current = true;
    action();
  }

  function onMessage(event: WebViewMessageEvent) {
    const message = parseMessage(event.nativeEvent.data);
    if (!message) return;
    switch (message.type) {
      case 'leave':
        finish(onLeave);
        break;
      case 'disconnected':
        // Stay on screen and say why, instead of silently navigating away --
        // a call that drops right after connecting is otherwise invisible.
        handled.current = true;
        setEndedReason(message.reason);
        break;
      case 'log':
        console.log('[call-webview]', message.message);
        break;
      case 'end':
        finish(onEnd ?? onLeave);
        break;
      case 'mute':
        onMute?.(message.identity, message.muted);
        break;
      case 'error':
        finish(() => onError(message.message));
        break;
      default:
        break;
    }
  }

  if (endedReason !== undefined) {
    return (
      <View style={styles.ended}>
        <Text style={styles.endedTitle}>The call has ended</Text>
        <Text style={styles.endedReason}>
          {endedReason === 'ROOM_DELETED' || endedReason === 'CLIENT_INITIATED'
            ? 'The host ended it.'
            : `Reason: ${endedReason ?? 'connection lost'}`}
        </Text>
        <Pressable style={styles.endedButton} onPress={onLeave}>
          <Text style={styles.endedButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <WebView
        style={styles.flex}
        source={{ html, baseUrl }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsFullscreenVideo
        setSupportMultipleWindows={false}
        androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
        onMessage={onMessage}
        onError={() => finish(() => onError('Could not open the call. Check your connection and try again.'))}
        onHttpError={() => finish(() => onError('Could not load the video engine. Check your connection and try again.'))}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color="#fff" size="large" />
            <Text style={styles.loadingText}>Connecting…</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0B1220' },
  loading: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#0B1220' },
  loadingText: { color: '#fff', fontSize: 14 },
  ended: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28, backgroundColor: '#0B1220' },
  endedTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  endedReason: { color: '#8494AB', fontSize: 14, textAlign: 'center' },
  endedButton: { marginTop: 8, backgroundColor: '#2A62F0', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 26 },
  endedButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
