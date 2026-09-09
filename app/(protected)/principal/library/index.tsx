// Principal -> Library -- real backend data only, a single
// overview screen by deliberate design (see principal-library-api.ts's
// own comment for why: this matches an existing, documented architectural
// boundary already established for every oversight role in this codebase,
// Admin's own leadership view included -- not a shortcut). Guarded by the
// parent principal/_layout.tsx.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getLibraryOverview, type LibraryOverview } from '@/lib/principal-library-api';

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

export default function PrincipalLibraryScreen() {
  const router = useRouter();
  const overviewQuery = useQuery({ queryKey: ['principal-library', 'overview'], queryFn: getLibraryOverview });

  return (
    <View style={styles.flex}>
      <AppHeader title="Library" subtitle="School-wide library overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {overviewQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : overviewQuery.isError ? (
          <ErrorState
            message={overviewQuery.error instanceof ApiError ? overviewQuery.error.message : 'Unable to load the library overview.'}
            onRetry={() => overviewQuery.refetch()}
          />
        ) : !overviewQuery.data ? (
          <EmptyState message="No library data available." />
        ) : (
          <LibraryOverviewBody overview={overviewQuery.data} />
        )}
      </ScrollView>
    </View>
  );
}

function LibraryOverviewBody({ overview }: { overview: LibraryOverview }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Catalogue</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.totalBooks}</Text>
          <Text style={styles.statLabel}>Titles</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.totalCopies}</Text>
          <Text style={styles.statLabel}>Total copies</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.availableCopies}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Circulation</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.issuedCopies}</Text>
          <Text style={styles.statLabel}>Issued</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={[styles.statValue, overview.overdueCount > 0 && styles.statValueWarning]}>{overview.overdueCount}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.reservedCopies}</Text>
          <Text style={styles.statLabel}>Reserved</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Copy condition</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={[styles.statValue, overview.damagedCopies > 0 && styles.statValueWarning]}>{overview.damagedCopies}</Text>
          <Text style={styles.statLabel}>Damaged</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={[styles.statValue, overview.lostCopies > 0 && styles.statValueWarning]}>{overview.lostCopies}</Text>
          <Text style={styles.statLabel}>Lost</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.underRepairCopies}</Text>
          <Text style={styles.statLabel}>Under repair</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Members &amp; reservations</Text>
      <View style={styles.statsRow}>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.activeMembers}</Text>
          <Text style={styles.statLabel}>Active members</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.pendingReservationsCount}</Text>
          <Text style={styles.statLabel}>Pending reservations</Text>
        </View>
        <View style={[styles.statTile, cardShadow]}>
          <Text style={styles.statValue}>{overview.readyReservationsCount}</Text>
          <Text style={styles.statLabel}>Ready for pickup</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent activity</Text>
      {overview.recentActivity.length === 0 ? (
        <EmptyState message="No recent library activity." />
      ) : (
        <View style={[styles.listCard, cardShadow]}>
          {overview.recentActivity.map((activity, index) => (
            <View key={activity.id} style={[styles.activityRow, index > 0 && styles.activityRowBorder]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.activityAction} numberOfLines={1}>
                  {humanize(activity.action)}
                </Text>
                {activity.detail ? (
                  <Text style={styles.activityDetail} numberOfLines={1}>
                    {activity.detail}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.activityDate}>{formatDateTime(activity.occurredAt)}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statValueWarning: { color: '#B33A2E' },
  statLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  activityRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  activityRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  activityAction: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  activityDetail: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  activityDate: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight },
});
