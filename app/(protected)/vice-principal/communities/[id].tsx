// Vice Principal -> Community detail (Phase 19) -- view-only, real backend
// data only. No archive/create-activity/create-membership/record-consent/
// remove-member/create-announcement actions -- every write method on these
// controllers keeps its own narrower ADMIN (or ADMIN/COMMUNITY) override,
// enforced server-side. In-charge name is resolved via the existing Staff
// lookup (Phase 6), same cross-module reuse pattern as every prior phase.

import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import {
  getCommunity,
  listCommunityActivities,
  listCommunityAnnouncements,
  listCommunityMemberships,
} from '@/lib/vice-principal-communities-api';
import { getFaculty } from '@/lib/vice-principal-faculty-api';

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

function stateTone(state: string): StatusTone {
  if (state === 'ACTIVE') return 'positive';
  if (state === 'SUSPENDED' || state === 'ARCHIVED') return 'negative';
  if (state === 'DRAFT') return 'warning';
  return 'neutral';
}

function activityStatusTone(status: string): StatusTone {
  if (status === 'COMPLETED') return 'positive';
  if (status === 'CANCELLED') return 'negative';
  return 'neutral';
}

function membershipStatusTone(status: string): StatusTone {
  if (status === 'ACTIVE') return 'positive';
  if (status === 'REMOVED') return 'negative';
  if (status === 'PENDING_CONSENT') return 'warning';
  return 'neutral';
}

type Tab = 'activities' | 'members' | 'announcements';

export default function VicePrincipalCommunityDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('activities');

  const communityQuery = useQuery({ queryKey: ['vp-communities', 'detail', id], queryFn: () => getCommunity(id) });
  const inchargeId = communityQuery.data?.inchargeStaffId ?? null;
  const inchargeQuery = useQuery({
    queryKey: ['vp-communities', 'incharge', inchargeId],
    queryFn: () => getFaculty(inchargeId as string),
    enabled: !!inchargeId,
  });

  if (communityQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Community" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (communityQuery.isError || !communityQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Community" onBack={() => router.back()} />
        <ErrorState
          message={communityQuery.error instanceof ApiError ? communityQuery.error.message : "Couldn't load this community."}
          onRetry={() => communityQuery.refetch()}
        />
      </View>
    );
  }

  const community = communityQuery.data;
  const inchargeName = inchargeId
    ? inchargeQuery.data
      ? `${inchargeQuery.data.firstName} ${inchargeQuery.data.lastName ?? ''}`.trim()
      : inchargeQuery.isLoading
        ? 'Loading…'
        : '—'
    : 'Not assigned';

  return (
    <View style={styles.flex}>
      <AppHeader title={community.name} subtitle={humanize(community.communityCategory)} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>{inchargeName}</Text>
          <StatusBadge label={humanize(community.state)} tone={stateTone(community.state)} />
        </View>

        {community.description ? (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.body}>{community.description}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Community information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>In-charge</Text>
            <Text style={styles.infoValue}>{inchargeName}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Max members</Text>
            <Text style={styles.infoValue}>{community.maxMembers ?? 'No limit'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Discussion</Text>
            <Text style={styles.infoValue}>{community.discussionEnabled ? 'Enabled' : 'Disabled'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Moderation</Text>
            <Text style={styles.infoValue}>{humanize(community.moderationMode)}</Text>
          </View>
        </View>
      </ScrollView>

      <SegmentedTabs<Tab>
        tabs={[
          { key: 'activities', label: 'Activities' },
          { key: 'members', label: 'Members' },
          { key: 'announcements', label: 'Announcements' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'activities' ? (
        <ActivitiesTab communityId={id} />
      ) : tab === 'members' ? (
        <MembersTab communityId={id} />
      ) : (
        <AnnouncementsTab communityId={id} />
      )}
    </View>
  );
}

function ActivitiesTab({ communityId }: { communityId: string }) {
  const activitiesQuery = useQuery({
    queryKey: ['vp-communities', 'activities', communityId],
    queryFn: () => listCommunityActivities(communityId),
  });
  const activities = activitiesQuery.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {activitiesQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
      ) : activitiesQuery.isError ? (
        <ErrorState
          message={activitiesQuery.error instanceof ApiError ? activitiesQuery.error.message : 'Unable to load activities.'}
          onRetry={() => activitiesQuery.refetch()}
        />
      ) : activities.length === 0 ? (
        <EmptyState message="No activities recorded for this community." />
      ) : (
        <View style={styles.list}>
          {activities.map((activity, index) => (
            <View key={activity.id} style={[styles.stackedRow, index === 0 && styles.rowFirst]}>
              <View style={styles.demandRowHeader}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {activity.title}
                </Text>
                <StatusBadge label={humanize(activity.status)} tone={activityStatusTone(activity.status)} />
              </View>
              <Text style={styles.rowMeta}>
                {formatDateTime(activity.scheduledAt)}
                {activity.venue ? ` · ${activity.venue}` : ''}
              </Text>
              {activity.description ? <Text style={styles.body}>{activity.description}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function MembersTab({ communityId }: { communityId: string }) {
  const membershipsQuery = useQuery({
    queryKey: ['vp-communities', 'memberships', communityId],
    queryFn: () => listCommunityMemberships(communityId),
  });
  const memberships = membershipsQuery.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {membershipsQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
      ) : membershipsQuery.isError ? (
        <ErrorState
          message={membershipsQuery.error instanceof ApiError ? membershipsQuery.error.message : 'Unable to load members.'}
          onRetry={() => membershipsQuery.refetch()}
        />
      ) : memberships.length === 0 ? (
        <EmptyState message="No members in this community yet." />
      ) : (
        <>
          <Text style={styles.resultCount}>{memberships.length} member(s)</Text>
          <View style={styles.list}>
            {memberships.map((member, index) => (
              <View key={member.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {member.studentFirstName} {member.studentLastName ?? ''}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {humanize(member.roleInCommunity)} · Joined {formatDate(member.joinedOn)}
                  </Text>
                </View>
                <StatusBadge label={humanize(member.status)} tone={membershipStatusTone(member.status)} />
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function AnnouncementsTab({ communityId }: { communityId: string }) {
  const announcementsQuery = useQuery({
    queryKey: ['vp-communities', 'announcements', communityId],
    queryFn: () => listCommunityAnnouncements(communityId),
  });
  const announcements = announcementsQuery.data ?? [];

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {announcementsQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
      ) : announcementsQuery.isError ? (
        <ErrorState
          message={announcementsQuery.error instanceof ApiError ? announcementsQuery.error.message : 'Unable to load announcements.'}
          onRetry={() => announcementsQuery.refetch()}
        />
      ) : announcements.length === 0 ? (
        <EmptyState message="No announcements posted in this community." />
      ) : (
        <View style={styles.list}>
          {announcements.map((announcement, index) => (
            <View key={announcement.id} style={[styles.stackedRow, index === 0 && styles.rowFirst]}>
              <View style={styles.demandRowHeader}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {announcement.title}
                </Text>
                <StatusBadge
                  label={humanize(announcement.state)}
                  tone={announcement.state === 'PUBLISHED' ? 'positive' : 'neutral'}
                />
              </View>
              <Text style={styles.rowMeta}>{formatDateTime(announcement.publishedAt)}</Text>
              <Text style={styles.body}>{announcement.body}</Text>
              {announcement.attachmentKeys && announcement.attachmentKeys.length > 0 ? (
                <Text style={styles.rowMeta}>
                  {announcement.attachmentKeys.length} attachment{announcement.attachmentKeys.length > 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 8 },
  tabContent: { paddingHorizontal: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  body: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 19, marginTop: 4 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  stackedRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: parentColors.borderSoft, gap: 2 },
  demandRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, flexShrink: 1 },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  resultCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 4, marginBottom: 8 },
});
