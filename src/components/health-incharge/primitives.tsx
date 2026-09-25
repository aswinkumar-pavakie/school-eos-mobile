// Health In-charge app -- shared primitives. Structurally identical to
// src/components/hostel-warden/primitives.tsx (header gradient, status-pill
// pattern, card/section/empty-state shapes) -- same per-role isolation
// convention already used across this app (src/components/<role>/), just
// carrying healthInchargeColors instead of hostelWardenColors so this console
// reads as its own place rather than a recolored Hostel Warden screen. There
// is no design mock for this role to pixel-match (it's new this build), so
// this is the deliberate reuse point: same proven shapes, own tokens.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { healthInchargeColors } from '@/lib/theme';

export function HealthSubHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <LinearGradient colors={[healthInchargeColors.headerGradientFrom, healthInchargeColors.headerGradientTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.headerBack} hitSlop={8}>
            <Text style={styles.headerBackGlyph}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          {right}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ---- Status pill -- same tone convention as Hostel Warden's, mapped to this
// console's own real statuses (visit action severity, alert open/done).
export type PillTone = 'ok' | 'warn' | 'bad' | 'info';
const TONE: Record<PillTone, { bg: string; fg: string }> = {
  ok: { bg: healthInchargeColors.greenBg, fg: healthInchargeColors.green },
  warn: { bg: healthInchargeColors.amberBg, fg: healthInchargeColors.amber },
  bad: { bg: healthInchargeColors.redBg, fg: healthInchargeColors.red },
  info: { bg: healthInchargeColors.infoBg, fg: healthInchargeColors.infoText },
};
export function pillTone(status: string): PillTone {
  const key = status.toLowerCase();
  if (['rest', 'no_action', 'done', 'acknowledged', 'resolved'].includes(key)) return 'ok';
  if (['medication', 'open', 'pending'].includes(key)) return 'warn';
  if (['sent_home', 'referred', 'sickbay_admit', 'overdue'].includes(key)) return 'bad';
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

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerBack: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  headerBackGlyph: { color: '#fff', fontSize: 17 },
  headerTitle: { flex: 1, fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  pill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
  card: { backgroundColor: healthInchargeColors.surface, borderWidth: 1, borderColor: healthInchargeColors.border, borderRadius: 14, padding: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 1.2, color: healthInchargeColors.tertiary },
  emptyPanel: { borderWidth: 1, borderColor: healthInchargeColors.borderDashed, borderStyle: 'dashed', borderRadius: 14, padding: 26, alignItems: 'center' },
  emptyText: { fontSize: 13, color: healthInchargeColors.muted, textAlign: 'center', lineHeight: 20 },
});
