// Hostel Warden app -- shared primitives, pixel-matched to "brain/SIS
// Hostel Warden - App/Warden App.dc.html"'s own repeating patterns (header
// gradient, TONE status-pill colors, card border/radius). Own file per the
// same per-role isolation convention (e.g. src/components/sports/) already
// used elsewhere in this app -- this design's own gradient/tokens are
// distinct from every other role's, so reusing a shared AppHeader would
// silently drift pixel accuracy.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { hostelWardenColors } from '@/lib/theme';

export function WardenSubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <LinearGradient colors={[hostelWardenColors.headerGradientFrom, hostelWardenColors.headerGradientTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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

// ---- Status pill -- matches the design's own TONE map exactly.
export type PillTone = 'ok' | 'warn' | 'bad' | 'info';
const TONE: Record<PillTone, { bg: string; fg: string }> = {
  ok: { bg: hostelWardenColors.greenBg, fg: hostelWardenColors.green },
  warn: { bg: hostelWardenColors.amberBg, fg: hostelWardenColors.amber },
  bad: { bg: hostelWardenColors.redBg, fg: hostelWardenColors.red },
  info: { bg: hostelWardenColors.infoBg, fg: hostelWardenColors.infoText },
};
export function pillTone(status: string): PillTone {
  const key = status.toLowerCase();
  if (['paid', 'in hostel', 'in_hostel', 'approved', 'active', 'complete', 'completed', 'present', 'on duty', 'done', 'resolved', 'closed'].includes(key)) return 'ok';
  if (['pending', 'on leave', 'on_leave', 'excused', 'off duty', 'medium'].includes(key)) return 'warn';
  if (['rejected', 'overdue', 'unaccounted', 'high', 'absent', 'escalated'].includes(key)) return 'bad';
  return 'info';
}
export function StatusPill({ label, tone }: { label: string; tone?: PillTone }) {
  const t = TONE[tone ?? pillTone(label)];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

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

export function GapScreen({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: hostelWardenColors.background }}>
      <WardenSubHeader title={title} onBack={onBack} />
      <View style={styles.gapBody}>
        <Text style={styles.gapText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerBack: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  headerBackGlyph: { color: '#fff', fontSize: 17 },
  headerTitle: { flex: 1, fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  pill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
  card: { backgroundColor: hostelWardenColors.surface, borderWidth: 1, borderColor: hostelWardenColors.border, borderRadius: 14, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2, color: hostelWardenColors.tertiary },
  emptyPanel: { borderWidth: 1, borderColor: hostelWardenColors.borderDashed, borderStyle: 'dashed', borderRadius: 14, padding: 26, alignItems: 'center' },
  emptyText: { fontSize: 13, color: hostelWardenColors.muted, textAlign: 'center', lineHeight: 20 },
  gapBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  gapText: { fontSize: 13.5, color: hostelWardenColors.muted, textAlign: 'center', lineHeight: 21, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
