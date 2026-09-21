// Sports Admin app -- shared primitives, pixel-matched to "brain/SIS Sports
// - App/Sports Staff Mobile App.dc.html"'s own repeating patterns (status
// pill colors from its PILL const, icon-circle glyph tiles, card border/
// radius). Own file per the same per-role isolation convention
// principal/faculty/parent components already use.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { sportsColors } from '@/lib/theme';

// ---- Sub-page header -- pixel-matched to the design's own `subHeader`
// block: linear-gradient(115deg,#1E3AD6,#2563EB), 22px 20px 20px padding,
// 36x36 rgba(255,255,255,0.22) back circle, 19px/800/#fff title. Deliberately
// its own component, not the app's shared AppHeader (that one uses a
// different gradient/padding -- reusing it would silently drift pixel
// accuracy for this role).
export function SportsSubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <LinearGradient colors={[sportsColors.headerGradientFrom, sportsColors.headerGradientTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.headerBack} hitSlop={8}>
            <Text style={styles.headerBackGlyph}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---- Status pill --------------------------------------------------------
// Matches the design's own PILL object + pillKey() regex fallback exactly.
const PILL_TONES: Record<string, { bg: string; fg: string }> = {
  selected: { bg: sportsColors.greenBg, fg: sportsColors.green },
  approved: { bg: sportsColors.greenBg, fg: sportsColors.green },
  verified: { bg: sportsColors.greenBg, fg: sportsColors.green },
  completed: { bg: sportsColors.greenBg, fg: sportsColors.green },
  active: { bg: sportsColors.greenBg, fg: sportsColors.green },
  won: { bg: sportsColors.greenBg, fg: sportsColors.green },
  hold: { bg: sportsColors.amberBg, fg: sportsColors.amber },
  pending: { bg: sportsColors.amberBg, fg: sportsColors.amber },
  'under care': { bg: sportsColors.amberBg, fg: sportsColors.amber },
  observation: { bg: sportsColors.amberBg, fg: sportsColors.amber },
  draft: { bg: sportsColors.amberBg, fg: sportsColors.amber },
  forming: { bg: sportsColors.amberBg, fg: sportsColors.amber },
  open: { bg: sportsColors.amberBg, fg: sportsColors.amber },
  rest: { bg: sportsColors.slateBg, fg: sportsColors.slate },
  injured: { bg: sportsColors.redBg, fg: sportsColors.red },
  closed: { bg: sportsColors.slateBg, fg: sportsColors.slate },
  drawn: { bg: sportsColors.slateBg, fg: sportsColors.slate },
  inactive: { bg: sportsColors.slateBg, fg: sportsColors.slate },
  archived: { bg: sportsColors.slateBg, fg: sportsColors.slate },
  upcoming: { bg: sportsColors.infoBg, fg: sportsColors.infoText },
  scheduled: { bg: sportsColors.infoBg, fg: sportsColors.infoText },
  live: { bg: sportsColors.infoBg, fg: sportsColors.infoText },
  lost: { bg: sportsColors.redBg, fg: sportsColors.red },
  rejected: { bg: sportsColors.redBg, fg: sportsColors.red },
};
export function pillTone(status: string): { bg: string; fg: string } {
  const key = status.toLowerCase();
  if (PILL_TONES[key]) return PILL_TONES[key];
  if (key.startsWith('won')) return PILL_TONES.won!;
  if (key.startsWith('lost')) return PILL_TONES.lost!;
  return PILL_TONES.upcoming!;
}

export function StatusPill({ label }: { label: string }) {
  const tone = pillTone(label);
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ---- Icon-circle tile (design uses plain unicode glyphs, not custom SVGs) --
export function IconCircle({ glyph, size = 52, background = sportsColors.primary, color = '#fff' }: { glyph: string; size?: number; background?: string; color?: string }) {
  return (
    <View style={[styles.iconCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}>
      <Text style={[styles.iconGlyph, { color, fontSize: size * 0.4 }]}>{glyph}</Text>
    </View>
  );
}

// ---- Card / section --------------------------------------------------------
export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable style={[styles.card, style]} onPress={onPress}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function EmptyPanel({ label }: { label: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyText}>{label}</Text>
    </View>
  );
}

// ---- Honest gap notice -- same convention as the shared My Bus route's own
// NoBusForRoleScreen: a real, disclosed "not built yet" state rather than
// fabricated data, for design tiles with no matching real backend today.
export function GapScreen({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: sportsColors.surface }}>
      <SportsSubHeader title={title} onBack={onBack} />
      <View style={styles.gapBody}>
        <Text style={styles.gapText}>{message}</Text>
      </View>
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={styles.primaryButton}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerBack: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  headerBackGlyph: { color: '#fff', fontSize: 17 },
  headerTitle: { flex: 1, fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  pill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
  iconCircle: { alignItems: 'center', justifyContent: 'center' },
  iconGlyph: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  card: { borderWidth: 1, borderColor: sportsColors.border, borderRadius: 14, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2, color: sportsColors.tertiary },
  emptyPanel: { borderWidth: 1, borderColor: sportsColors.borderDashed, borderStyle: 'dashed', borderRadius: 14, padding: 26, alignItems: 'center' },
  emptyText: { fontSize: 13, color: sportsColors.muted, textAlign: 'center', lineHeight: 20 },
  gapBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  gapText: { fontSize: 13.5, color: sportsColors.muted, textAlign: 'center', lineHeight: 21, fontFamily: 'PlusJakartaSans_600SemiBold' },
  primaryButton: {
    backgroundColor: sportsColors.primary,
    color: '#fff',
    borderRadius: 13,
    paddingVertical: 15,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    overflow: 'hidden',
  },
});
