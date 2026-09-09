// Vice Principal -> My Day / Personal Overview (Phase 30) -- a pure
// aggregation/presentation screen over five ALREADY-REAL, already-authorized
// endpoints; no new backend route, no new table, no new approval/attendance/
// leave/notification engine. Every section below reuses the exact same
// self-scoped API this VP module already calls from its own dedicated screen:
//   - Today's attendance + attendance summary -> getMyAttendanceHistory()
//     (Phase 27's GET /staff/me/attendance-history, staffId resolved
//     server-side from the caller's own personId)
//   - Personal requests -> listMyLeaveRequests() (Phase 28's
//     GET /staff/me/leave-requests, same self-scoping)
//   - Pending actions assigned to VP -> listApprovals({status:'PENDING'})
//     (Phase 23's GET /approvals, reviewer-scoped server-side by
//     listForCaller() against the caller's own role_assignment rows -- see
//     vice-principal-requests-approvals-api.ts's own comment: as of today no
//     approval_policy names VICE_PRINCIPAL as an approver, so this list is
//     REAL and CORRECT but legitimately empty; that is not a bug here either)
//   - Upcoming items -> listUpcomingCalendarEvents() (the same real academic
//     calendar feed already shown on the Home tab dashboard)
//   - Notifications -> listNotifications() (Phase 24's GET /notifications,
//     scoped to notification.person_id = the caller's own personId)
//
// "My Responsibilities" (recommended by the phase spec only "where a Phase 29
// responsibility/task/assignment implementation already exists") is
// deliberately NOT rendered -- there is no such module, table, or endpoint
// anywhere in this codebase (verified by search before writing this file).
// Faking a section for it would violate this app's own "no invented KPIs,
// no mock data" rule, so it is omitted entirely rather than shown as a
// permanently-empty placeholder for a feature that was never built.
//
// Every section below loads and fails independently (its own useQuery), so
// one failed optional section never blocks or crashes the rest of the page --
// same pattern VicePrincipalHome.tsx's own 5 independent queries already use.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listUpcomingCalendarEvents } from '@/lib/vice-principal-dashboard-api';
import { getMyAttendanceHistory } from '@/lib/vice-principal-my-attendance-api';
import { listMyLeaveRequests } from '@/lib/vice-principal-my-leave-api';
import { listNotifications } from '@/lib/vice-principal-notifications-api';
import { listApprovals } from '@/lib/vice-principal-requests-approvals-api';

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

// Same CHECK_IN/ABSENT mapping as my-attendance/index.tsx's own statusMeta --
// duplicated locally rather than extracted, matching this app's convention of
// each screen owning its own small display helpers.
function attendanceStatusMeta(status: string): { label: string; tone: StatusTone } {
  if (status === 'CHECK_IN') return { label: 'Present', tone: 'positive' };
  if (status === 'ABSENT') return { label: 'Absent', tone: 'negative' };
  return { label: status, tone: 'neutral' };
}

// Same "open vs terminal" bucketing as my-leave/index.tsx's own stateTone --
// PENDING and SENT_BACK both count as still needing attention.
function isOpenLeaveState(state: string): boolean {
  return state !== 'APPROVED' && state !== 'REJECTED' && state !== 'CANCELLED';
}

const QUICK_ACTIONS: { label: string; slug: string }[] = [
  { label: 'My Attendance', slug: 'my-attendance' },
  { label: 'My Leave', slug: 'my-leave' },
  { label: 'Requests & Approvals', slug: 'requests-approvals' },
  { label: 'Notifications', slug: 'notifications' },
  { label: 'Profile', slug: 'profile' },
];

export default function VicePrincipalMyDayScreen() {
  const router = useRouter();

  const attendanceQuery = useQuery({ queryKey: ['vp-my-day', 'attendance'], queryFn: () => getMyAttendanceHistory() });
  const leaveQuery = useQuery({ queryKey: ['vp-my-day', 'my-leave'], queryFn: listMyLeaveRequests });
  const pendingActionsQuery = useQuery({
    queryKey: ['vp-my-day', 'pending-actions'],
    queryFn: () => listApprovals({ status: 'PENDING' }),
  });
  const eventsQuery = useQuery({ queryKey: ['vp-my-day', 'calendar-events'], queryFn: listUpcomingCalendarEvents });
  const notificationsQuery = useQuery({
    queryKey: ['vp-my-day', 'notifications'],
    queryFn: () => listNotifications({ limit: 3 }),
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const attendanceDays = attendanceQuery.data?.days ?? [];
  const todayEntry = attendanceDays.find((d) => d.date.slice(0, 10) === todayStr) ?? null;
  const monthly = attendanceQuery.data?.monthlySummary;

  const leaveRequests = leaveQuery.data ?? [];
  const pendingLeave = leaveRequests.filter((r) => isOpenLeaveState(r.approvalState ?? r.state));

  const pendingActions = pendingActionsQuery.data ?? [];
  const upcomingEvents = (eventsQuery.data ?? []).slice(0, 3);
  const notifications = notificationsQuery.data?.data ?? [];
  const unreadCount = notificationsQuery.data?.meta.unreadCount ?? 0;

  return (
    <View style={styles.flex}>
      <AppHeader title="My Day" subtitle="Your personal overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today&rsquo;s attendance</Text>
        </View>
        {attendanceQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : attendanceQuery.isError ? (
          <ErrorState
            message={attendanceQuery.error instanceof ApiError ? attendanceQuery.error.message : 'Unable to load your attendance.'}
            onRetry={() => attendanceQuery.refetch()}
          />
        ) : todayEntry ? (
          <View style={[styles.infoCard, cardShadow]}>
            <View style={styles.rowBetween}>
              <Text style={styles.infoLabel}>{formatDate(todayEntry.date)}</Text>
              <StatusBadge {...attendanceStatusMeta(todayEntry.status)} />
            </View>
            {todayEntry.status === 'CHECK_IN' ? (
              <Text style={styles.infoMeta}>Checked in {formatDateTime(todayEntry.occurredAt)}</Text>
            ) : todayEntry.reason ? (
              <Text style={styles.infoMeta}>{todayEntry.reason}</Text>
            ) : null}
          </View>
        ) : (
          <EmptyState message="No attendance recorded for today yet." />
        )}

        {monthly ? (
          <View style={styles.statsRow}>
            <View style={[styles.statTile, cardShadow]}>
              <Text style={styles.statValue}>{monthly.presentCount}</Text>
              <Text style={styles.statLabel}>Present (month)</Text>
            </View>
            <View style={[styles.statTile, cardShadow]}>
              <Text style={styles.statValue}>{monthly.totalCount - monthly.presentCount}</Text>
              <Text style={styles.statLabel}>Absent (month)</Text>
            </View>
            <View style={[styles.statTile, cardShadow]}>
              <Text style={styles.statValue}>{monthly.percentage != null ? `${monthly.percentage}%` : '—'}</Text>
              <Text style={styles.statLabel}>Rate (month)</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Personal requests</Text>
          <Pressable onPress={() => router.push('/(protected)/vice-principal/my-leave?title=My%20Leave' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {leaveQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : leaveQuery.isError ? (
          <ErrorState
            message={leaveQuery.error instanceof ApiError ? leaveQuery.error.message : 'Unable to load your leave requests.'}
            onRetry={() => leaveQuery.refetch()}
          />
        ) : leaveRequests.length === 0 ? (
          <EmptyState message="You have no leave requests yet." />
        ) : (
          <View style={[styles.infoCard, cardShadow]}>
            <Text style={styles.infoValue}>
              {pendingLeave.length} request{pendingLeave.length === 1 ? '' : 's'} awaiting a decision
            </Text>
            <Text style={styles.infoMeta}>{leaveRequests.length} total leave request{leaveRequests.length === 1 ? '' : 's'}</Text>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pending actions</Text>
          <Pressable onPress={() => router.push('/(protected)/vice-principal/requests-approvals?title=Requests%20%26%20Approvals' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {pendingActionsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : pendingActionsQuery.isError ? (
          <ErrorState
            message={pendingActionsQuery.error instanceof ApiError ? pendingActionsQuery.error.message : 'Unable to load pending actions.'}
            onRetry={() => pendingActionsQuery.refetch()}
          />
        ) : pendingActions.length === 0 ? (
          <EmptyState message="No requests are currently awaiting your review." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {pendingActions.slice(0, 3).map((request, index) => (
              <View key={request.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {humanize(request.requestType)}
                  </Text>
                  <Text style={styles.listRowMeta} numberOfLines={1}>
                    {request.requestedByName ?? 'Unknown requester'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
        </View>
        {eventsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : eventsQuery.isError ? (
          <ErrorState
            message={eventsQuery.error instanceof ApiError ? eventsQuery.error.message : 'Unable to load upcoming events.'}
            onRetry={() => eventsQuery.refetch()}
          />
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
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Pressable onPress={() => router.push('/(protected)/vice-principal/notifications?title=Notifications' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {notificationsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : notificationsQuery.isError ? (
          <ErrorState
            message={notificationsQuery.error instanceof ApiError ? notificationsQuery.error.message : 'Unable to load notifications.'}
            onRetry={() => notificationsQuery.refetch()}
          />
        ) : notifications.length === 0 ? (
          <EmptyState message="No notifications yet." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {notifications.map((notification, index) => (
              <View key={notification.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {notification.title}
                  </Text>
                  <Text style={styles.listRowMeta}>{formatDateTime(notification.createdAt)}</Text>
                </View>
                {notification.isEmergency ? <StatusBadge label="Emergency" tone="negative" /> : !notification.readAt ? (
                  <StatusBadge label="Unread" tone="neutral" />
                ) : null}
              </View>
            ))}
            {unreadCount > 0 ? <Text style={styles.unreadFooter}>{unreadCount} unread total</Text> : null}
          </View>
        )}

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionHeaderRow: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  viewAll: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blue },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  infoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  infoLabel: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  infoValue: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
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
  unreadFooter: {
    fontSize: 11.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.muted,
    paddingVertical: 10,
    textAlign: 'center',
  },
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
});
