// Principal -> Reports -- institution-wide, read-only cross-cutting figures,
// real backend data only (admin/reports-summary). The handler itself
// branches on actor.roles: ADMIN/PRINCIPAL get the FULL, unredacted summary
// including requestsApprovals; every other caller (including VICE_PRINCIPAL)
// has that field stripped -- confirmed by reading the actual redaction
// branch, not inferred. This screen therefore has one section VP's own
// Reports module does not: Requests & Approvals. No filters, no export, no
// drill-down -- the real backend endpoint offers none of those. Guarded by
// the parent principal/_layout.tsx.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatMoneySummary } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getReportsSummary } from '@/lib/principal-reports-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function feeStateTone(state: string): StatusTone {
  if (state === 'PAID') return 'positive';
  if (state === 'OVERDUE' || state === 'CANCELLED') return 'negative';
  if (state === 'PARTIAL' || state === 'PENDING') return 'warning';
  return 'neutral';
}

function genericStatusTone(status: string): StatusTone {
  if (['ACTIVE', 'AVAILABLE', 'PAID', 'APPROVED'].includes(status)) return 'positive';
  if (['LOST', 'DAMAGED', 'GROUNDED', 'RETIRED', 'REJECTED'].includes(status)) return 'negative';
  if (['MAINTENANCE', 'UNDER_REPAIR', 'ISSUED', 'RESERVED', 'PENDING'].includes(status)) return 'warning';
  return 'neutral';
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subLabel}>{children}</Text>;
}

function BarList({ items, max }: { items: { label: string; count: number }[]; max?: number }) {
  const peak = max ?? Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <Text style={styles.emptyText}>No data yet.</Text>;
  return (
    <View style={{ gap: 10 }}>
      {items.map((item) => (
        <View key={item.label}>
          <View style={styles.barHeaderRow}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.barValue}>{item.count}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(4, (item.count / peak) * 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function StatusList({ items, toneFn }: { items: { label: string; count: number }[]; toneFn: (s: string) => StatusTone }) {
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) return <Text style={styles.emptyText}>No data yet.</Text>;
  return (
    <View style={{ gap: 8 }}>
      {visible.map((item) => (
        <View key={item.label} style={styles.statusListRow}>
          <StatusBadge label={humanize(item.label)} tone={toneFn(item.label)} />
          <Text style={styles.barValue}>{item.count}</Text>
        </View>
      ))}
    </View>
  );
}

export default function PrincipalReportsScreen() {
  const router = useRouter();
  const summaryQuery = useQuery({ queryKey: ['principal-reports', 'summary'], queryFn: getReportsSummary });

  if (summaryQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Reports" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Reports" onBack={() => router.back()} />
        <ErrorState
          message={summaryQuery.error instanceof ApiError ? summaryQuery.error.message : 'Unable to load reports.'}
          onRetry={() => summaryQuery.refetch()}
        />
      </View>
    );
  }

  const data = summaryQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title="Reports" subtitle="Institution-wide figures" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard title="Enrollment">
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{data.enrollment.activeCount}</Text>
              <Text style={styles.statLabel}>Active students</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{data.enrollment.inactiveCount}</Text>
              <Text style={styles.statLabel}>Inactive / archived</Text>
            </View>
          </View>
          <SubLabel>Students by grade</SubLabel>
          <BarList items={data.enrollment.byGrade.map((g) => ({ label: g.gradeName, count: g.count }))} />
          <SubLabel>Students by gender</SubLabel>
          <StatusList items={data.enrollment.byGender.map((g) => ({ label: g.gender, count: g.count }))} toneFn={() => 'neutral'} />
        </SectionCard>

        <SectionCard title="Staff">
          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{data.staff.teachingCount}</Text>
              <Text style={styles.statLabel}>Teaching staff</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statValue}>{data.staff.nonTeachingCount}</Text>
              <Text style={styles.statLabel}>Non-teaching staff</Text>
            </View>
          </View>
          <SubLabel>Staff by designation</SubLabel>
          <BarList items={data.staff.byDesignation.map((d) => ({ label: d.designation, count: d.count }))} />
        </SectionCard>

        <SectionCard title="Attendance">
          <SubLabel>Daily attendance %, last 30 days</SubLabel>
          <BarList
            items={data.attendance.dailyPercentPresent.map((a) => ({ label: formatDate(a.date), count: a.percentPresent }))}
            max={100}
          />
        </SectionCard>

        <SectionCard title="Fees">
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{formatMoneySummary(data.fees.totalOutstandingPaise)}</Text>
            <Text style={styles.statLabel}>Total outstanding</Text>
          </View>
          <SubLabel>Collection status</SubLabel>
          <StatusList items={data.fees.byState.map((f) => ({ label: f.state, count: f.count }))} toneFn={feeStateTone} />
        </SectionCard>

        <SectionCard title="Requests &amp; Approvals">
          <SubLabel>By status</SubLabel>
          <StatusList items={data.requestsApprovals.byState.map((r) => ({ label: r.state, count: r.count }))} toneFn={genericStatusTone} />
          <SubLabel>By type</SubLabel>
          <BarList items={data.requestsApprovals.byType.map((r) => ({ label: humanize(r.requestType), count: r.count }))} />
        </SectionCard>

        <SectionCard title="Transport">
          <SubLabel>Ridership by active route</SubLabel>
          <BarList items={data.transport.ridershipByRoute.map((r) => ({ label: r.routeName, count: r.count }))} />
          <SubLabel>Vehicle operational status</SubLabel>
          <StatusList items={data.transport.vehiclesByStatus.map((v) => ({ label: v.status, count: v.count }))} toneFn={genericStatusTone} />
        </SectionCard>

        <SectionCard title="Hostel">
          <SubLabel>Occupancy by hostel</SubLabel>
          {data.hostel.occupancyByHostel.length === 0 ? (
            <Text style={styles.emptyText}>No data yet.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {data.hostel.occupancyByHostel.map((h) => {
                const total = h.occupied + h.vacant;
                const occupiedPct = total > 0 ? (h.occupied / total) * 100 : 0;
                return (
                  <View key={h.hostelName}>
                    <View style={styles.barHeaderRow}>
                      <Text style={styles.barLabel} numberOfLines={1}>
                        {h.hostelName}
                      </Text>
                      <Text style={styles.barValue}>
                        {h.occupied} occupied · {h.vacant} vacant
                      </Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.max(4, occupiedPct)}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Inventory">
          <SubLabel>Items by status</SubLabel>
          <StatusList items={data.inventory.byStatus.map((i) => ({ label: i.status, count: i.count }))} toneFn={genericStatusTone} />
        </SectionCard>

        <SectionCard title="Library">
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{formatMoneySummary(data.library.outstandingFinesPaise)}</Text>
            <Text style={styles.statLabel}>Outstanding fines</Text>
          </View>
          <SubLabel>Copies by status</SubLabel>
          <StatusList items={data.library.byStatus.map((l) => ({ label: l.status, count: l.count }))} toneFn={genericStatusTone} />
        </SectionCard>

        <Text style={styles.generatedAt}>Generated {formatDate(data.generatedAt)}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 12 },
  sectionTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  subLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: parentColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: parentColors.background, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  barHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  barLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, flexShrink: 1 },
  barValue: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.muted },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: parentColors.borderSoft, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: parentColors.blue },
  statusListRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight },
  generatedAt: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, textAlign: 'center', marginTop: 4 },
});
