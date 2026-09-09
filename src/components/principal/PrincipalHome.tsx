// Principal Home -- adapts the REAL Principal web dashboard
// (principal/page.tsx), NOT Vice Principal's own fuller Home dashboard. VP's
// dashboard additionally shows upcoming calendar events, examinations, and
// announcements -- Principal's real web dashboard shows none of that, only
// 3 KPI cards (active students, active staff, current academic year) and an
// "Awaiting your decision" pending-approvals list, confirmed by direct audit
// of the actual web page before writing this file. Do not add sections VP
// has that Principal's own product doesn't.
//
// Header banner + floating greeting card + bell icon follow the same design
// language CommunityHome/VicePrincipalHome already established (Home-tab
// convention: no AppHeader, own greeting, no VP permissions/data copied --
// only the visual chrome is reused, per the master prompt's explicit
// "design reuse only" rule). Bell links to Principal's own real Notifications
// screen. Sign-out is self-contained here (own useQueryClient + logout()),
// same shape as every other Home-tab component in this app.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import { EmptyState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { logout } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getDashboardSummary, listPendingApprovals, type ApprovalRequestRow } from '@/lib/principal-dashboard-api';

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

function approvalStateMeta(row: ApprovalRequestRow): { label: string; tone: StatusTone } {
  switch (row.state) {
    case 'APPROVED':
      return { label: 'Approved', tone: 'positive' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    default:
      return { label: 'Pending', tone: 'warning' };
  }
}

function BellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}
function PersonIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={parentColors.blue} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={12} cy={8} r={3.5} />
      <Path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
    </Svg>
  );
}

export function PrincipalHome({ personName }: { personName: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await logout();
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  const summaryQuery = useQuery({ queryKey: ['principal-dashboard', 'summary'], queryFn: getDashboardSummary });
  const approvalsQuery = useQuery({ queryKey: ['principal-dashboard', 'pending-approvals'], queryFn: listPendingApprovals });

  const summary = summaryQuery.data;
  const pendingApprovals = approvalsQuery.data ?? [];
  const awaitingDecision = pendingApprovals.slice(0, 8);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>P</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.headerTitle}>Principal</Text>
                <Text style={styles.headerSubtitle}>School administration</Text>
              </View>
            </View>
            <Pressable
              style={styles.bellWrap}
              onPress={() => router.push('/(protected)/principal/notifications?title=Notifications' as never)}
            >
              <BellIcon />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.greetingCard, cardShadow]}>
          <View style={styles.avatar}>
            <PersonIcon />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greetingName}>Hi, {personName}</Text>
            <Text style={styles.greetingMeta}>Principal</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Key statistics</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            {summaryQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} />
            ) : (
              <Text style={styles.statValue}>{summary?.activeStudents ?? '—'}</Text>
            )}
            <Text style={styles.statLabel}>Active students</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            {summaryQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} />
            ) : (
              <Text style={styles.statValue}>{summary?.activeStaff ?? '—'}</Text>
            )}
            <Text style={styles.statLabel}>Active staff</Text>
          </View>
        </View>
        {summary?.currentAcademicYear ? (
          <View style={[styles.infoCard, cardShadow]}>
            <Text style={styles.infoLabel}>Current academic year</Text>
            <Text style={styles.infoValue}>{summary.currentAcademicYear.name}</Text>
            <Text style={styles.infoMeta}>
              {formatDate(summary.currentAcademicYear.startDate)} – {formatDate(summary.currentAcademicYear.endDate)}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Awaiting your decision</Text>
          <Pressable onPress={() => router.push('/(protected)/principal/requests-approvals?title=Requests%20%26%20Approvals' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {approvalsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : awaitingDecision.length === 0 ? (
          <EmptyState message="No requests are currently awaiting your decision." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {awaitingDecision.map((request, index) => (
              <Pressable
                key={request.id}
                style={[styles.listRow, index === 0 && styles.listRowFirst]}
                onPress={() => router.push(`/(protected)/principal/requests-approvals/${request.id}` as never)}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {humanize(request.requestType)}
                  </Text>
                  <Text style={styles.listRowMeta} numberOfLines={1}>
                    {request.requestedByName ?? 'Unknown requester'} · {formatDate(request.createdAt)}
                  </Text>
                </View>
                <StatusBadge {...approvalStateMeta(request)} />
              </Pressable>
            ))}
          </View>
        )}

        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutButtonText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  header: { backgroundColor: parentColors.blueDeep, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  badge: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  headerTitle: { color: '#fff', fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 1 },
  bellWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  greetingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  greetingName: { fontSize: 16.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  greetingMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted, marginTop: 2 },
  sectionHeaderRow: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  viewAll: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blue },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginTop: 10 },
  infoLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, marginTop: 4 },
  infoMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 4 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  listRowFirst: { borderTopWidth: 0 },
  listRowTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  listRowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  signOutButton: {
    marginTop: 26,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: parentColors.ink },
});
