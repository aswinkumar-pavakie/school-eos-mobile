// Vice Principal Home -- the exact real leadership dashboard content that
// used to live at vice-principal/dashboard.tsx (Phase 3), now rendered
// directly on the shared Home tab instead of behind its own ERP menu entry
// (the "Dashboard" tile in vice-principal/index.tsx's MAIN section was
// removed since this makes it redundant). Same pattern as FacultyHome/
// CommunityHome/ParentHome: no AppHeader (Home gets its own greeting, not
// the shared back-button header), personName passed in as a prop from
// app/(protected)/index.tsx rather than a second useMe() query. Every
// number/list below is still a real read from vice-principal-dashboard-api.ts's
// own real backend endpoints -- no mock arrays, no invented KPIs, nothing
// changed about the content itself, only where it's mounted.
//
// Header banner + floating greeting card + bell icon are lifted from
// CommunityHome.tsx's own Home screen (closest match in shape to this one --
// stat tiles + several list sections + sign out at the bottom), not invented
// fresh, so Home reads consistently across every role in this app instead of
// VP being the only flat, bannerless one. The bell links to VP's own real
// Notifications screen (vice-principal/notifications.tsx), same as Faculty's
// bell links to its own announcements.
//
// Sign out lives at the bottom of this screen too -- VP used to fall through
// to the plain Home fallback in app/(protected)/index.tsx (greeting + Sign
// out button) before this dashboard content took over its Home tab, so this
// self-contained handleSignOut (own useQueryClient + logout(), same shape as
// CommunityHome.tsx's) replaces what that fallback used to provide, instead
// of dropping it.

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
import {
  getDashboardSummary,
  listAnnouncements,
  listExaminations,
  listPendingApprovals,
  listUpcomingCalendarEvents,
} from '@/lib/vice-principal-dashboard-api';

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

function examStateMeta(state: string): { label: string; tone: StatusTone } {
  switch (state) {
    case 'PUBLISHED':
    case 'LOCKED':
      return { label: humanize(state), tone: 'positive' };
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral' };
    default:
      return { label: humanize(state), tone: 'warning' };
  }
}

function approvalStateMeta(state: string): { label: string; tone: StatusTone } {
  switch (state) {
    case 'APPROVED':
      return { label: 'Approved', tone: 'positive' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'negative' };
    default:
      return { label: 'Pending', tone: 'warning' };
  }
}

function announcementMeta(row: { priority: string; isEmergency: boolean }): { label: string; tone: StatusTone } {
  if (row.isEmergency) return { label: 'Emergency', tone: 'negative' };
  if (row.priority === 'HIGH') return { label: 'High priority', tone: 'warning' };
  return { label: humanize(row.priority), tone: 'neutral' };
}

const QUICK_ACTIONS: { label: string; slug: string }[] = [
  { label: 'Students', slug: 'students' },
  { label: 'Attendance', slug: 'attendance' },
  { label: 'Academics', slug: 'academics' },
  { label: 'Examinations', slug: 'examinations' },
  { label: 'Requests & Approvals', slug: 'requests-approvals' },
  { label: 'Announcements', slug: 'announcements' },
];

export function VicePrincipalHome({ personName }: { personName: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await logout();
    // Same reasoning as LoginForm.tsx's clear() on login -- the next sign-in
    // on this device must never see this account's cached ['me'] or business
    // data.
    queryClient.clear();
    router.replace('/(auth)/login');
  }

  const summaryQuery = useQuery({ queryKey: ['vp-dashboard', 'summary'], queryFn: getDashboardSummary });
  const eventsQuery = useQuery({ queryKey: ['vp-dashboard', 'calendar-events'], queryFn: listUpcomingCalendarEvents });
  const examsQuery = useQuery({ queryKey: ['vp-dashboard', 'examinations'], queryFn: () => listExaminations() });
  const approvalsQuery = useQuery({ queryKey: ['vp-dashboard', 'approvals'], queryFn: listPendingApprovals });
  const announcementsQuery = useQuery({ queryKey: ['vp-dashboard', 'announcements'], queryFn: () => listAnnouncements() });

  const summary = summaryQuery.data;
  const upcomingEvents = (eventsQuery.data ?? []).slice(0, 3);
  const recentExams = (examsQuery.data ?? []).slice(0, 3);
  const pendingApprovals = approvalsQuery.data ?? [];
  const recentApprovals = pendingApprovals.slice(0, 3);
  const recentAnnouncements = (announcementsQuery.data ?? []).slice(0, 3);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>VP</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.headerTitle}>Vice Principal</Text>
                <Text style={styles.headerSubtitle}>School leadership overview</Text>
              </View>
            </View>
            <Pressable
              style={styles.bellWrap}
              onPress={() => router.push('/(protected)/vice-principal/notifications?title=Notifications' as never)}
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
            <Text style={styles.greetingMeta}>Vice Principal</Text>
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
            <Text style={styles.statLabel}>Active faculty</Text>
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
          <Text style={styles.sectionTitle}>Attendance overview</Text>
        </View>
        <EmptyState message="Attendance overview isn't available yet." />

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Academic overview — upcoming events</Text>
        </View>
        {eventsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : upcomingEvents.length === 0 ? (
          <EmptyState message="No upcoming academic events." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {upcomingEvents.map((event, index) => (
              <View key={event.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={styles.listRowMeta}>{formatDate(event.startDate)}</Text>
                </View>
                {event.isHoliday ? <StatusBadge label="Holiday" tone="neutral" /> : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Examination overview</Text>
        </View>
        {examsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : recentExams.length === 0 ? (
          <EmptyState message="No examinations recorded yet." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {recentExams.map((exam, index) => (
              <View key={exam.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {exam.name}
                  </Text>
                  <Text style={styles.listRowMeta}>
                    {humanize(exam.examType)}
                    {exam.term ? ` · ${exam.term}` : ''}
                  </Text>
                </View>
                <StatusBadge {...examStateMeta(exam.state)} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Requests & approvals</Text>
          <Text style={styles.sectionCount}>{approvalsQuery.isLoading ? '…' : pendingApprovals.length} pending</Text>
        </View>
        {approvalsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : recentApprovals.length === 0 ? (
          <EmptyState message="No requests are currently pending your review." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {recentApprovals.map((approval, index) => (
              <View key={approval.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {humanize(approval.requestType)}
                  </Text>
                  <Text style={styles.listRowMeta} numberOfLines={1}>
                    {approval.requestedByName ?? 'Unknown requester'} · {formatDate(approval.createdAt)}
                  </Text>
                </View>
                <StatusBadge {...approvalStateMeta(approval.state)} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Announcements</Text>
        </View>
        {announcementsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : recentAnnouncements.length === 0 ? (
          <EmptyState message="No announcements yet." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {recentAnnouncements.map((announcement, index) => (
              <View key={announcement.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {announcement.title}
                  </Text>
                  <Text style={styles.listRowMeta}>{formatDate(announcement.createdAt)}</Text>
                </View>
                <StatusBadge {...announcementMeta(announcement)} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Alerts</Text>
        </View>
        <View style={[styles.infoCard, cardShadow]}>
          <Text style={styles.infoValue}>
            {approvalsQuery.isLoading
              ? 'Checking…'
              : pendingApprovals.length > 0
                ? `${pendingApprovals.length} request${pendingApprovals.length === 1 ? '' : 's'} awaiting your review.`
                : 'No active alerts.'}
          </Text>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
        </View>
        <View style={styles.actionsWrap}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.slug}
              style={styles.actionChip}
              onPress={() =>
                router.push(`/(protected)/vice-principal/${action.slug}?title=${encodeURIComponent(action.label)}` as never)
              }
            >
              <Text style={styles.actionChipText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

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
  sectionCount: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blue },
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
  actionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  actionChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
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
