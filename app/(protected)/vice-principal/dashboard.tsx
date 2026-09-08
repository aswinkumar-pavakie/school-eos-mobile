// Vice Principal's real leadership dashboard -- Phase 3. Guarded by the same
// vice-principal/_layout.tsx as every other screen in this subtree (no
// per-screen role check needed here). Every number/list below is a real read
// from vice-principal-dashboard-api.ts's own real backend endpoints -- no
// mock arrays, no invented KPIs, no fake alerts. Sections with no safe
// existing backend dependency (Attendance) show an honest "not available
// yet" state instead of fabricated numbers, per this phase's own explicit
// instruction. Visual pattern reused from CommunityHome.tsx (this session's
// own most-recent leadership-style overview) -- header, stat tiles, section
// cards -- nothing new invented at the design level.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { useMe } from '@/hooks/useMe';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import {
  getDashboardSummary,
  listAnnouncements,
  listExaminations,
  listPendingApprovals,
  listUpcomingCalendarEvents,
} from '@/lib/vice-principal-dashboard-api';

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

export default function VicePrincipalDashboard() {
  const router = useRouter();
  const meQuery = useMe();

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
      <AppHeader title="Dashboard" subtitle="School leadership overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Hi, {meQuery.data?.person.firstName ?? 'Vice Principal'}</Text>

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginBottom: 4 },
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
});
