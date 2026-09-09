// Hand-rolled donut/ring stat -- react-native-svg Circle + strokeDasharray,
// standing in for the design's own CSS conic-gradient rings (Attendance
// summary, My Attendance rate, etc.). No charting library needed for one
// single-value ring.

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { facultyColors } from '@/lib/theme';

export function RingStat({
  percent,
  color = facultyColors.green,
  trackColor = facultyColors.redBg,
  size = 74,
  strokeWidth = 8,
  centerValue,
  centerLabel,
}: {
  percent: number;
  color?: string;
  trackColor?: string;
  size?: number;
  strokeWidth?: number;
  centerValue: string;
  centerLabel: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.value}>{centerValue}</Text>
        <Text style={styles.label}>{centerLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, lineHeight: 20 },
  label: { fontSize: 8.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 0.8, marginTop: 2 },
});
