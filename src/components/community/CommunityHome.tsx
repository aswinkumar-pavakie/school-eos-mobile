// Community Home -- a real overview screen, same tier as FacultyHome.tsx
// (gradient header, greeting card, live-data sections), not the plain
// greeting+hint text every other role without a built Home falls back to.
// Every number here is a real read from the same endpoints the Community
// feature screens already use (community-api.ts) -- no invented analytics,
// matching this app's own "no fake summary cards" rule.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import { StatusBadge } from '@/components/StatusBadge';
import { logout } from '@/lib/auth';
import {
  getCommunity,
  getCommunityMemberships,
  listAnnouncements,
  listMembershipRequests,
  listProposals,
} from '@/lib/community-api';
import { membershipRequestStatusMeta, proposalStatusMeta } from '@/lib/community-status';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';

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

export function CommunityHome({ personName, communityId }: { personName: string; communityId: string }) {
  const router = useRouter();
  const [initialsFallback] = useState(() => personName.slice(0, 2).toUpperCase());

  const communityQuery = useQuery({ queryKey: ['community', 'detail', communityId], queryFn: () => getCommunity(communityId) });
  const membershipsQuery = useQuery({ queryKey: ['community', 'memberships', communityId], queryFn: () => getCommunityMemberships(communityId) });
  const proposalsQuery = useQuery({ queryKey: ['community', 'proposals'], queryFn: listProposals });
  const requestsQuery = useQuery({ queryKey: ['community', 'membership-requests'], queryFn: listMembershipRequests });
  const announcementsQuery = useQuery({ queryKey: ['community', 'announcements', communityId], queryFn: () => listAnnouncements(communityId) });

  const community = communityQuery.data;
  const memberCount = (membershipsQuery.data ?? []).filter((m) => m.status !== 'REMOVED').length;
  const pendingProposals = (proposalsQuery.data ?? []).filter((p) => p.status === 'PENDING').length;
  const pendingRequests = (requestsQuery.data ?? []).filter((r) => r.status === 'PENDING').length;
  const latestAnnouncement = (announcementsQuery.data ?? []).find((a) => a.state === 'PUBLISHED') ?? null;
  const recentProposals = (proposalsQuery.data ?? []).slice(0, 3);
  const recentRequests = (requestsQuery.data ?? []).slice(0, 3);

  const communityInitials = community ? community.name.slice(0, 2).toUpperCase() : initialsFallback;

  async function handleSignOut() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{communityInitials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.communityName} numberOfLines={1}>
                  {community?.name ?? 'Your community'}
                </Text>
                {community?.communityCategory ? <Text style={styles.communityCategory}>{community.communityCategory}</Text> : null}
              </View>
            </View>
            <Pressable style={styles.bellWrap} onPress={() => router.push('/(protected)/community/announcements' as never)}>
              <BellIcon />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greetingCard}>
          <View style={styles.avatar}>
            <PersonIcon />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greetingName}>Hi, {personName}</Text>
            <Text style={styles.greetingMeta}>Community coordinator</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Pressable style={[styles.statTile, cardShadow]} onPress={() => router.push('/(protected)/community/profile' as never)}>
            {membershipsQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} />
            ) : (
              <Text style={styles.statValue}>
                {memberCount}
                {community?.maxMembers != null ? <Text style={styles.statValueMuted}> / {community.maxMembers}</Text> : null}
              </Text>
            )}
            <Text style={styles.statLabel}>Members</Text>
          </Pressable>
          <Pressable style={[styles.statTile, cardShadow]} onPress={() => router.push('/(protected)/community/proposals' as never)}>
            {proposalsQuery.isLoading ? <ActivityIndicator color={parentColors.blue} /> : <Text style={styles.statValue}>{pendingProposals}</Text>}
            <Text style={styles.statLabel}>Pending proposals</Text>
          </Pressable>
          <Pressable style={[styles.statTile, cardShadow]} onPress={() => router.push('/(protected)/community/profile' as never)}>
            {requestsQuery.isLoading ? <ActivityIndicator color={parentColors.blue} /> : <Text style={styles.statValue}>{pendingRequests}</Text>}
            <Text style={styles.statLabel}>Pending requests</Text>
          </Pressable>
        </View>

        {communityQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 20 }} />
        ) : community ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>About</Text>
            </View>
            <View style={[styles.infoCard, cardShadow]}>
              {community.description ? <Text style={styles.infoDescription}>{community.description}</Text> : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Discussion</Text>
                <Text style={styles.infoValue}>{community.discussionEnabled ? 'Enabled' : 'Disabled'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Moderation</Text>
                <Text style={styles.infoValue}>{community.moderationMode}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>{community.state}</Text>
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Latest notice</Text>
          <Pressable onPress={() => router.push('/(protected)/community/announcements' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {announcementsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 12, marginBottom: 8 }} />
        ) : latestAnnouncement ? (
          <View style={[styles.annCard, cardShadow]}>
            <Text style={styles.annTitle} numberOfLines={2}>
              {latestAnnouncement.title}
            </Text>
            <Text style={styles.annBody} numberOfLines={3}>
              {latestAnnouncement.body}
            </Text>
            <Text style={styles.annDate}>{formatDate(latestAnnouncement.publishedAt)}</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No announcements yet.</Text>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recent proposals</Text>
          <Pressable onPress={() => router.push('/(protected)/community/proposals' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {proposalsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 12, marginBottom: 8 }} />
        ) : recentProposals.length === 0 ? (
          <Text style={styles.emptyText}>No proposals yet.</Text>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {recentProposals.map((proposal, index) => (
              <View key={proposal.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {proposal.title}
                  </Text>
                  <Text style={styles.listRowMeta}>{formatDate(proposal.createdAt)}</Text>
                </View>
                <StatusBadge {...proposalStatusMeta(proposal.status)} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Recent membership requests</Text>
          <Pressable onPress={() => router.push('/(protected)/community/profile' as never)}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        </View>
        {requestsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 12, marginBottom: 8 }} />
        ) : recentRequests.length === 0 ? (
          <Text style={styles.emptyText}>No membership requests yet.</Text>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {recentRequests.map((request, index) => (
              <View key={request.id} style={[styles.listRow, index === 0 && styles.listRowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.listRowTitle} numberOfLines={1}>
                    {request.action === 'ADD' ? 'Add' : 'Remove'}{' '}
                    {request.studentFirstName ? `${request.studentFirstName} ${request.studentLastName ?? ''}` : 'member'}
                  </Text>
                  <Text style={styles.listRowMeta}>{formatDate(request.createdAt)}</Text>
                </View>
                <StatusBadge {...membershipRequestStatusMeta(request.status)} />
              </View>
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

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

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
  communityName: { color: '#fff', fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  communityCategory: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 1 },
  bellWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 32 },
  greetingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...cardShadow,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  greetingName: { fontSize: 16.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  greetingMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statValueMuted: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, textAlign: 'center' },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  viewAll: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blue },
  annCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  annTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  annBody: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted, marginTop: 6, lineHeight: 19 },
  annDate: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, marginTop: 10 },
  emptyText: { marginHorizontal: 16, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted },
  infoCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  infoDescription: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 20, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  infoLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  listCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
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
    marginHorizontal: 16,
    marginTop: 26,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutButtonText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: parentColors.ink },
});
