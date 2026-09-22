// Canteen counter's Dashboard -- the module's real landing screen now
// (Ledger moved to its own ledger.tsx route/tab). Every number and chart
// here is a real aggregate off canteen_transaction as of screen load
// (getCanteenDashboard() -> CanteenService.getDashboard() on the backend),
// nothing cached, nothing fabricated. Visual language matches the real,
// already-shipped Faculty mobile Home screen (FacultyHome.tsx: gradient
// header, greeting, stat tiles) -- canteenColors (theme.ts) is
// facultyColors' own values under a new name, per explicit instruction:
// "same color same font same size... exactly same... 100 percent... like
// others" (an earlier pass here used the Sports Admin dashboard mockup
// instead; superseded).

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getCanteenDashboard } from '@/lib/canteen-api';
import { formatMoneyDetail } from '@/lib/format';
import { canteenColors } from '@/lib/theme';
import { Card, StatTile } from '@/components/canteen/primitives';
import { PeopleIcon, ReceiptIcon, TrendIcon, WalletIcon } from '@/components/canteen/icons';
import { WeeklySalesChart, HourlySalesChart, GradeBreakdownList, hourLabel } from '@/components/canteen/charts';
import { useMe } from '@/hooks/useMe';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export default function CanteenDashboardScreen() {
  const router = useRouter();
  const meQuery = useMe();
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['canteen-dashboard'],
    queryFn: getCanteenDashboard,
  });

  const personName = meQuery.data?.person.firstName ?? '';
  const initials =
    [meQuery.data?.person.firstName, meQuery.data?.person.lastName]
      .filter((p): p is string => !!p)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'CN';

  return (
    <View style={styles.flex}>
      <LinearGradient colors={[canteenColors.gradientStart, canteenColors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PP</Text>
            </View>
            <Text style={[styles.schoolName, { flex: 1 }]}>Canteen counter</Text>
            <Pressable style={styles.avatar} onPress={() => router.push('/(protected)/canteen/profile' as never)} hitSlop={8}>
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading || !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={canteenColors.blue} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={canteenColors.blue} />}
        >
          <Text style={styles.greeting}>
            {greeting()}
            {personName ? `, ${personName}` : ''}
          </Text>

          <View style={styles.statGrid}>
            <StatTile label="Today's sales" value={formatMoneyDetail(data.todaySalesPaise)} icon={<WalletIcon />} deltaPct={data.salesDeltaPct} />
            <StatTile label="Transactions" value={String(data.todayTransactionCount)} icon={<ReceiptIcon />} deltaPct={data.transactionsDeltaPct} />
            <StatTile label="Students served" value={String(data.todayUniqueStudents)} icon={<PeopleIcon />} sub="unique today" />
            <StatTile label="Avg. transaction" value={formatMoneyDetail(data.todayAvgTransactionPaise)} icon={<TrendIcon />} />
          </View>

          {data.declinedToday > 0 && (
            <View style={styles.declinedBanner}>
              <View style={styles.declinedBadge}>
                <Text style={styles.declinedBadgeText}>!</Text>
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.declinedTitle}>
                  {data.declinedToday} charge{data.declinedToday === 1 ? '' : 's'} declined today
                </Text>
                <Text style={styles.declinedSub}>Insufficient balance or a frozen wallet -- nothing was charged.</Text>
              </View>
            </View>
          )}

          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Sales this week</Text>
            <Text style={styles.chartSub}>Last 7 days &middot; today highlighted</Text>
            <View style={styles.chartBody}>
              <WeeklySalesChart data={data.weeklyTrend} />
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <View style={styles.chartHeaderRow}>
              <View style={styles.flexShrink}>
                <Text style={styles.chartTitle}>Sales by hour</Text>
                <Text style={styles.chartSub}>Today, 7am&ndash;7pm</Text>
              </View>
              {data.peakHour !== null && (
                <View style={styles.peakBadge}>
                  <Text style={styles.peakBadgeText}>Busiest {hourLabel(data.peakHour)}</Text>
                </View>
              )}
            </View>
            <View style={styles.chartBody}>
              <HourlySalesChart data={data.hourlyToday} peakHour={data.peakHour} />
            </View>
          </Card>

          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Sales by class</Text>
            <Text style={styles.chartSub}>Today &middot; what to stock more of</Text>
            <View style={styles.chartBody}>
              <GradeBreakdownList data={data.gradeBreakdown} />
            </View>
          </Card>

          <Card style={[styles.chartCard, { padding: 0 }]}>
            <View style={styles.recentHeader}>
              <Text style={styles.chartTitle}>Recent transactions</Text>
              <Text style={styles.viewAll} onPress={() => router.push('/(protected)/canteen/history' as never)}>
                View all
              </Text>
            </View>
            {data.recentTransactions.length === 0 ? (
              <Text style={styles.emptyText}>No canteen charges yet today.</Text>
            ) : (
              data.recentTransactions.map((t) => (
                <View key={t.id} style={styles.recentRow}>
                  <View style={styles.flexShrink}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {t.studentName}
                    </Text>
                    <Text style={styles.recentMeta} numberOfLines={1}>
                      {t.admissionNo}
                      {t.gradeName ? ` · ${t.gradeName}${t.sectionName ? `-${t.sectionName}` : ''}` : ''}
                    </Text>
                  </View>
                  <View style={styles.recentAmounts}>
                    <Text style={styles.recentAmount}>-{formatMoneyDetail(t.amountPaise)}</Text>
                    <Text style={styles.recentTime}>{timeAgo(t.createdAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: canteenColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 },
  badge: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  schoolName: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },
  greeting: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: canteenColors.ink },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  declinedBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  declinedBadgeText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#B45309' },
  declinedTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#92400E' },
  declinedSub: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', color: '#A16207', marginTop: 2 },
  chartCard: { marginTop: 0 },
  chartHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  chartTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: canteenColors.ink },
  chartSub: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', color: canteenColors.muted, marginTop: 2 },
  chartBody: { marginTop: 14 },
  peakBadge: { backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  peakBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#B45309' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 12 },
  viewAll: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: canteenColors.blueDark },
  emptyText: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: canteenColors.muted, textAlign: 'center', paddingVertical: 24 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: canteenColors.borderSoft,
  },
  flexShrink: { flexShrink: 1 },
  recentName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: canteenColors.ink },
  recentMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_500Medium', color: canteenColors.muted, marginTop: 1 },
  recentAmounts: { alignItems: 'flex-end' },
  recentAmount: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: canteenColors.red },
  recentTime: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', color: canteenColors.mutedStrong, marginTop: 2 },
});
