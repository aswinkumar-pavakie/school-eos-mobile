// Shared wrapper for any route that imports @livekit/react-native at module
// scope (meeting-call, online-class-call) -- see those screens' own comments
// for why registerGlobals() has to live there and not the root layout.
//
// That placement alone isn't enough, though: Expo Router still statically
// imports every route module under app/ to build its route table, which
// means a plain top-level `import` of a LiveKit-dependent screen throws
// during bundle evaluation for EVERY user, in Expo Go too -- not just
// someone who actually opens a call -- exactly the failure mode this file
// exists to prevent. A dynamic `import()` (not `require`) called from
// inside a component, on the other hand, is never eagerly evaluated by
// Metro; the native "WebRTC native module not found" error only surfaces
// as a rejected promise when this component actually mounts, which this
// wrapper catches and turns into an honest, non-crashing message instead
// of taking down the whole app.
//
// `Fallback` is what to show instead when the native screen can't load: a
// WebView-based call room that works in Expo Go (see features/call-webview).
// Without one, the honest "needs the full app build" message is shown.

import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, NativeModules, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/lib/theme';

// Whether this app build actually contains the native WebRTC module. Checked
// BEFORE importing the native call screen: in development, Metro reports a
// module that throws while loading as a fatal error (the red "Uncaught Error"
// screen) even when a promise catch handles it afterwards, so in Expo Go the
// native screen must never be imported at all.
function nativeCallsSupported(): boolean {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  return NativeModules.WebRTCModule != null;
}

export function LazyCallScreen({
  load,
  Fallback,
}: {
  load: () => Promise<{ default: ComponentType }>;
  Fallback?: ComponentType;
}) {
  const router = useRouter();
  const [Comp, setComp] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nativeUnavailable, setNativeUnavailable] = useState(false);
  const skipNative = !!Fallback && !nativeCallsSupported();

  useEffect(() => {
    if (skipNative) return;
    let cancelled = false;
    load()
      .then((mod) => {
        if (!cancelled) setComp(() => mod.default);
      })
      .catch(() => {
        if (cancelled) return;
        if (Fallback) {
          setNativeUnavailable(true);
        } else {
          setError(
            'Video calling needs the full app build with native video support -- it isn’t available in this preview.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [load, Fallback, skipNative]);

  if ((skipNative || nativeUnavailable) && Fallback) return <Fallback />;

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="videocam-off-outline" size={32} color={colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.backLink} onPress={() => router.back()}>
          Go back
        </Text>
      </View>
    );
  }

  if (!Comp) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <Comp />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 28,
    backgroundColor: colors.surface,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  backLink: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
    marginTop: 4,
  },
});
