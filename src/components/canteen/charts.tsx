// Canteen dashboard's real charts -- hand-rolled with react-native-svg
// (Rect bars, geometry computed in JS from the container's own measured
// width), the same precedent already established in this app by
// src/components/faculty/RingStat.tsx's own header comment: no charting
// library needed, this codebase has none and leans on plain SVG primitives
// for data visualization.
//
// Both bar charts highlight one bar distinctly rather than a flat single
// color series: WeeklySalesChart picks out TODAY, HourlySalesChart picks
// out the real busiest hour in amber -- a purposeful visual cue tied
// directly to the "Busiest at ___" badge on the dashboard screen, not
// decoration.

import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { canteenColors } from '@/lib/theme';

const CHART_HEIGHT = 130;
const AMBER = '#F59E0B';

// Same fixed-order categorical palette this app's own website Reports
// module uses (chart-colors.ts) -- reused directly for the grade breakdown.
const CATEGORICAL_PALETTE = ['#2563EB', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300'];

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function hourLabel(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? 'a' : 'p'}`;
}

function BarChart({ bars }: { bars: { key: string; value: number; label: string; color: string }[] }) {
  const [width, setWidth] = useState(0);
  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = 8;
  const barWidth = width > 0 ? Math.max(6, (width - gap * (bars.length - 1)) / bars.length) : 0;

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={CHART_HEIGHT}>
          {bars.map((b, i) => {
            const barHeight = Math.max(2, (b.value / max) * (CHART_HEIGHT - 4));
            const x = i * (barWidth + gap);
            return (
              <Rect
                key={b.key}
                x={x}
                y={CHART_HEIGHT - barHeight}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={b.value > 0 ? b.color : canteenColors.borderSoft}
              />
            );
          })}
        </Svg>
      )}
      <View style={styles.labelRow}>
        {bars.map((b) => (
          <Text key={b.key} style={[styles.label, { width: barWidth || undefined, flex: barWidth ? undefined : 1 }]} numberOfLines={1}>
            {b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function WeeklySalesChart({ data }: { data: { date: string; totalPaise: number }[] }) {
  const today = todayIso();
  return (
    <BarChart
      bars={data.map((d) => ({
        key: d.date,
        value: d.totalPaise,
        label: shortDay(d.date),
        color: d.date === today ? canteenColors.blueDark : canteenColors.blueLight,
      }))}
    />
  );
}

export function HourlySalesChart({ data, peakHour }: { data: { hour: number; totalPaise: number }[]; peakHour: number | null }) {
  return (
    <BarChart
      bars={data.map((d) => ({
        key: String(d.hour),
        value: d.totalPaise,
        label: hourLabel(d.hour),
        color: peakHour !== null && d.hour === peakHour ? AMBER : canteenColors.blue,
      }))}
    />
  );
}

// "Sales by class" -- real answer to "what should I stock more of", the
// top 5 grades + an "Other" bucket the backend already folds the rest into
// (CanteenService.getDashboard()'s own gradeBreakdown). A ranked horizontal
// bar list rather than a donut -- a real donut/pie needs actual arc-path
// math to hand-roll well in react-native-svg, and a ranked list answers
// "what to stock more of" at least as directly, sorted highest first.
export function GradeBreakdownList({ data }: { data: { gradeName: string; totalPaise: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.totalPaise, 0);
  if (total === 0) {
    return <Text style={styles.empty}>No sales yet today.</Text>;
  }
  return (
    <View style={{ gap: 12 }}>
      {data.map((d, i) => {
        const pct = Math.round((d.totalPaise / total) * 100);
        const color = CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length];
        return (
          <View key={d.gradeName}>
            <View style={styles.gradeRow}>
              <View style={styles.gradeLabelRow}>
                <View style={[styles.gradeDot, { backgroundColor: color }]} />
                <Text style={styles.gradeName} numberOfLines={1}>
                  {d.gradeName}
                </Text>
              </View>
              <Text style={styles.gradePct}>{pct}%</Text>
            </View>
            <View style={styles.gradeTrack}>
              <View style={[styles.gradeFill, { width: `${Math.max(3, pct)}%`, backgroundColor: color }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', marginTop: 6, gap: 8 },
  label: { fontSize: 9.5, color: canteenColors.muted, textAlign: 'center', fontWeight: '600' },
  empty: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: canteenColors.muted, textAlign: 'center', paddingVertical: 16 },
  gradeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gradeLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  gradeDot: { width: 8, height: 8, borderRadius: 4 },
  gradeName: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: canteenColors.ink, flexShrink: 1 },
  gradePct: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: canteenColors.mutedStrong },
  gradeTrack: { marginTop: 5, height: 6, borderRadius: 3, backgroundColor: canteenColors.chipTrack, overflow: 'hidden' },
  gradeFill: { height: '100%', borderRadius: 3 },
});
