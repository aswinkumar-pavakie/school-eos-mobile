// Global "Ask AI" entry point -- pixel-matched to the user's own reference
// (a white rounded-square card, bottom-right, floating over content, with a
// purple chat-bubble-and-dots glyph -- not a blue circle/generic Ionicon,
// this exact icon). Mounted once in app/(protected)/_layout.tsx so it
// appears on every screen for every role, replacing the several different
// ad-hoc header icons each Home screen used to render on its own. Hidden
// while already on the ai-chat screen itself. A light press-in scale
// animation is the only motion here -- this is a navigation trigger, not
// the chat surface itself.

import { useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND_PURPLE = '#591BDF';

function ChatBubbleDotsIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5.5 4h13a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9A1.5 1.5 0 0 1 5.5 4z"
        stroke={BRAND_PURPLE}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9} cy={9.4} r={0.9} fill={BRAND_PURPLE} />
      <Circle cx={12} cy={9.4} r={0.9} fill={BRAND_PURPLE} />
      <Circle cx={15} cy={9.4} r={0.9} fill={BRAND_PURPLE} />
    </Svg>
  );
}

export function AskAiFab() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [scale] = useState(() => new Animated.Value(1));

  if (pathname?.startsWith('/ai-chat')) return null;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.9, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 74, transform: [{ scale }] }]}
    >
      <Pressable
        onPress={() => router.push('/(protected)/ai-chat' as never)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Ask the Assistant"
      >
        <ChatBubbleDotsIcon size={24} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, zIndex: 30 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F1B33',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
});
