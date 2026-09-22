// Canteen module's own small shared bits -- same values as facultyColors
// (theme.ts's own canteenColors export), matching the real, already-shipped
// Faculty mobile module's own card/stat-tile language, per explicit
// instruction to replicate a real design exactly -- "same color same font
// same size... 100 percent... like others".

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canteenColors, cardShadow } from '@/lib/theme';

// Ledger/History's own root-tab header (no back button, since each is a
// bottom-tab destination, not a sub-page -- same reasoning as Home/the
// Sports and Hostel hubs never using AppHeader's own back-button header).
// Dashboard (index.tsx) uses its own inline gradient header instead, to
// carry the school badge + "Canteen counter" label the way the Sports Home
// screen's own header does.
export function CanteenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <LinearGradient colors={[canteenColors.gradientStart, canteenColors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Up/down/flat pill -- "is today better or worse than yesterday", the one
// comparison a single raw number can't answer on its own. undefined means
// this tile has no comparison at all; null means a real comparison was
// attempted but yesterday had zero sales (no baseline), rendered as "New".
function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) {
    return (
      <View style={[styles.deltaPill, { backgroundColor: canteenColors.chipTrack }]}>
        <Text style={[styles.deltaText, { color: canteenColors.muted }]}>New</Text>
      </View>
    );
  }
  const up = deltaPct > 0;
  const flat = deltaPct === 0;
  const color = flat ? canteenColors.muted : up ? canteenColors.greenDark : canteenColors.redDark;
  const bg = flat ? canteenColors.chipTrack : up ? canteenColors.greenBg : canteenColors.redBg;
  const arrow = flat ? '' : up ? '▲ ' : '▼ ';
  return (
    <View style={[styles.deltaPill, { backgroundColor: bg }]}>
      <Text style={[styles.deltaText, { color }]}>{flat ? 'No change' : `${arrow}${Math.abs(deltaPct)}%`}</Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  icon,
  sub,
  deltaPct,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  sub?: string;
  deltaPct?: number | null;
}) {
  return (
    <Card style={styles.statTile}>
      <View style={styles.statHeader}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.iconChip}>{icon}</View>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      {(deltaPct !== undefined || sub) && (
        <View style={styles.statFooter}>
          {deltaPct !== undefined && <DeltaBadge deltaPct={deltaPct} />}
          {sub && (
            <Text style={styles.statSub} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  headerTitle: { fontSize: 21, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  headerSubtitle: { marginTop: 3, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: 'rgba(255,255,255,0.78)' },
  card: {
    backgroundColor: canteenColors.surface,
    borderWidth: 1,
    borderColor: canteenColors.border,
    borderRadius: 14,
    padding: 16,
    ...cardShadow,
  },
  statTile: { flexBasis: '47%', flexGrow: 1 },
  statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: canteenColors.mutedStrong, flexShrink: 1 },
  iconChip: { width: 28, height: 28, borderRadius: 8, backgroundColor: canteenColors.blueLight, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: canteenColors.ink, marginTop: 10 },
  statFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  statSub: { fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium', color: canteenColors.muted },
  deltaPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  deltaText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold' },
});
