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

import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/lib/theme';

export function LazyCallScreen({
  load,
}: {
  load: () => Promise<{ default: ComponentType }>;
}) {
  const router = useRouter();
  const [Comp, setComp] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((mod) => {
        if (!cancelled) setComp(() => mod.default);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Video calling needs the full app build with native video support -- it isn’t available in this preview.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

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
