// Limited, attendance-only profile of one student, opened from the Attendance Diary by roles that
// are not leadership (class advisor, faculty, academic coordinator). No fees, no guardian details --
// the backend returns 404 for any student outside the caller's own classes.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { getDiaryStudentProfile } from '@/lib/attendance-diary-api';
import { principalColors as c } from '@/lib/theme';

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  PRESENT: { label: 'Present', bg: '#E7F5EE', fg: '#18794E' },
  ABSENT: { label: 'Absent', bg: '#FDECEC', fg: '#C2400F' },
  LATE: { label: 'Late', bg: '#FEF3C7', fg: '#92400E' },
  NOT_MARKED: { label: 'Not marked', bg: '#EEF1F7', fg: '#6B7A99' },
};
const pctColor = (p: number | null) => (p === null ? c.tertiary : p < 75 ? '#C2400F' : p < 90 ? '#D97706' : '#16A34A');
const fmtDate = (d: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`));
const fmtMonth = (m: string) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`));

function Pill({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.NOT_MARKED!;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={[styles.pillText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

export function StudentAttendanceProfileScreen({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const query = useQuery({ queryKey: ['attendance-diary', 'student', studentId], queryFn: () => getDiaryStudentProfile(studentId) });

  if (query.isError) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Student attendance" onBack={onBack} />
        <ErrorState message={query.error instanceof Error ? query.error.message : "Couldn't load this student."} onRetry={() => void query.refetch()} />
      </View>
    );
  }
  if (!query.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Student attendance" onBack={onBack} />
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const { student, summary, monthly, recent, dayStatus, date } = query.data;
  const name = [student.firstName, student.lastName].filter(Boolean).join(' ');

  return (
    <View style={styles.flex}>
      <AppHeader title={name} subtitle={`${student.gradeName}-${student.sectionName} · Adm. ${student.admissionNo}${student.rollNo ? ` · Roll ${student.rollNo}` : ''}`} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.tileRow}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Attendance (YTD)</Text>
            <Text style={[styles.tileValue, { color: pctColor(summary.percentage) }]}>{summary.percentage === null ? '—' : `${summary.percentage}%`}</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{fmtDate(date)}</Text>
            <View style={{ marginTop: 8 }}><Pill status={dayStatus} /></View>
          </View>
        </View>
        <View style={styles.tileRow}>
          <View style={styles.tile}><Text style={styles.tileLabel}>Present</Text><Text style={[styles.tileValue, { color: '#18794E' }]}>{summary.presentDays}</Text></View>
          <View style={styles.tile}><Text style={styles.tileLabel}>Late</Text><Text style={[styles.tileValue, { color: '#92400E' }]}>{summary.lateDays}</Text></View>
          <View style={styles.tile}><Text style={styles.tileLabel}>Absent</Text><Text style={[styles.tileValue, { color: '#C2400F' }]}>{summary.absentDays}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Month by month</Text>
        {monthly.length === 0 && <Text style={styles.muted}>No attendance recorded yet.</Text>}
        {monthly.map((m) => {
          const pct = m.total ? Math.round((1000 * (m.present + m.late)) / m.total) / 10 : 0;
          return (
            <View key={m.month} style={styles.row}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.rowTitle}>{fmtMonth(m.month)}</Text>
                <Text style={[styles.rowTitle, { color: pctColor(pct) }]}>{pct}%</Text>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${pct}%`, backgroundColor: pctColor(pct) }]} /></View>
              <Text style={styles.muted}>{m.present} present · {m.late} late · {m.absent} absent · {m.total} days</Text>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Recent days</Text>
        {recent.length === 0 && <Text style={styles.muted}>No attendance recorded yet.</Text>}
        {recent.map((r) => (
          <View key={r.date} style={[styles.row, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{fmtDate(r.date)}</Text>
              {!!r.reason && <Text style={styles.muted}>{r.reason}</Text>}
            </View>
            <Pill status={r.status} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.background },
  tileRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  tile: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14 },
  tileLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: c.muted },
  tileValue: { fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: c.ink, marginTop: 14, marginBottom: 8 },
  row: { backgroundColor: '#fff', borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: c.ink },
  muted: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: c.muted, marginTop: 4 },
  track: { height: 5, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden', marginVertical: 6 },
  fill: { height: '100%' },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  pillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold' },
});
