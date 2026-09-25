// Health In-charge -- Home tab. No design mock exists for this role (it's new
// this build, unlike Faculty/Parent/Hostel Warden's own *.dc.html references),
// so this follows the same structural convention those Home screens use --
// SafeArea gradient greeting header, then real KPI counts and real list
// sections pulled straight from GET /health-incharge/dashboard, the exact
// same data the website's own dashboard page renders (see
// app/(dashboard)/health-incharge/page.tsx) -- nothing here is invented.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { healthInchargeColors } from '@/lib/theme';
import { getHealthDashboard, studentName, classLabel, ACTION_LABEL, ALERT_LABEL } from '@/lib/health-incharge-api';
import { formatDateTime } from '@/lib/format';
import { HealthIcon } from './icons';
import { Card, StatusPill, EmptyPanel, SectionLabel } from './primitives';

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

export function HealthInchargeHome({ personName }: { personName: string }) {
  const router = useRouter();
  const dashboardQuery = useQuery({ queryKey: ['health-incharge-dashboard'], queryFn: getHealthDashboard });
  const d = dashboardQuery.data;

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[healthInchargeColors.headerGradientFrom, healthInchargeColors.headerGradientTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFromName(personName)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Health &amp; Infirmary</Text>
              <Text style={styles.subGreeting}>{personName}</Text>
            </View>
            <View style={styles.headerIcon}>
              <HealthIcon name="health" color="#fff" size={20} strokeWidth={1.8} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {dashboardQuery.isLoading ? (
          <ActivityIndicator color={healthInchargeColors.primary} style={{ marginTop: 24 }} />
        ) : dashboardQuery.isError || !d ? (
          <EmptyPanel label="Couldn't load the dashboard. Pull down to try again." />
        ) : (
          <>
            <View style={styles.statGrid}>
              <StatTile label="Visits today" value={d.counts.visitsToday} onPress={() => router.push('/(protected)/health-incharge/visits' as never)} />
              <StatTile label="Guardians to inform" value={d.counts.needsParentNotice} tone="bad" onPress={() => router.push('/(protected)/health-incharge/visits?notice=1' as never)} />
              <StatTile label="Open alerts" value={d.counts.openAlerts} tone="warn" onPress={() => router.push('/(protected)/health-incharge/alerts' as never)} />
              <StatTile label="This week" value={d.counts.visitsThisWeek} sub="visits" />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <SectionLabel>GUARDIANS TO INFORM</SectionLabel>
              </View>
              {d.needsNotice.length === 0 ? (
                <EmptyPanel label="All caught up -- every serious visit has its guardians informed." />
              ) : (
                d.needsNotice.map((v) => (
                  <Card key={v.id} style={styles.rowCard} onPress={() => router.push(`/(protected)/health-incharge/visits/${v.id}` as never)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{studentName(v)}</Text>
                      <Text style={styles.rowSub}>{classLabel(v.gradeName, v.sectionName)} · {ACTION_LABEL[v.action] ?? v.action} · {formatDateTime(v.visitedAt)}</Text>
                    </View>
                    <StatusPill label={ACTION_LABEL[v.action] ?? v.action} />
                  </Card>
                ))
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <SectionLabel>OPEN ALERTS</SectionLabel>
              </View>
              {d.openAlerts.length === 0 ? (
                <EmptyPanel label="No open alerts -- nothing is waiting for you." />
              ) : (
                d.openAlerts.map((a) => (
                  <Card key={a.id} style={styles.rowCard} onPress={() => router.push('/(protected)/health-incharge/alerts' as never)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{ALERT_LABEL[a.alertType] ?? a.alertType}</Text>
                      <Text style={styles.rowSub}>
                        {a.studentFirstName ? studentName(a) : (a.scopeType ?? 'School')} · {formatDateTime(a.detectedAt)}
                      </Text>
                    </View>
                    <StatusPill label="Open" tone="warn" />
                  </Card>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatTile({ label, value, sub, tone, onPress }: { label: string; value: number; sub?: string; tone?: 'bad' | 'warn'; onPress?: () => void }) {
  const valueColor = tone === 'bad' ? healthInchargeColors.red : tone === 'warn' ? healthInchargeColors.amber : healthInchargeColors.primary;
  return (
    <Card style={styles.statTile} onPress={onPress}>
      <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  headerRow: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  greeting: { color: '#fff', fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  subGreeting: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  headerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 28, gap: 20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statTile: { width: '47%', gap: 4, paddingVertical: 18 },
  statValue: { fontSize: 26, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  statLabel: { fontSize: 12.5, color: healthInchargeColors.body, fontFamily: 'PlusJakartaSans_600SemiBold' },
  statSub: { fontSize: 11, color: healthInchargeColors.muted },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  rowSub: { fontSize: 12, color: healthInchargeColors.muted, marginTop: 2 },
});
