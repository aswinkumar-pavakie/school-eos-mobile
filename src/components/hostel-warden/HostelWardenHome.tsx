// Hostel Warden -- Home tab. Pixel-rebuilt (micro-depth pass) to match
// Warden App.dc.html's own `isHome` screen exactly: header padding/logo
// size/message-icon (plain, no background circle), a bordered greeting row
// with primary-blue name text, a bullhorn "Notice" section header, a
// tinted notice card (title/from/date + round next-slide button) with a
// clickable dot pager, and the design's own real values are read verbatim
// (colors, sizes, spacing) from the design file. The design's own second
// card (school badge + "Media Room · date" + category pill + caption/body
// + poster image + gallery-count badge) is a REAL Media Room post -- same
// GET /media/posts connection Faculty/Parent/Sports Admin/Principal's own
// Home feeds already use (see faculty-media-posts-api.ts), now also
// HOSTEL_WARDEN-authorized on the backend -- not fabricated. Only the
// poster's own big overlay headline text and organizer byline in the mock
// have no real field on MediaPost, so the real asset image is rendered
// instead of any invented overlay copy. The real "Today at a glance"
// pending-request tiles (no design equivalent) stay, since removing real,
// already-shipped functionality to chase pixel parity would be worse than
// the mismatch itself.

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { hostelWardenColors } from '@/lib/theme';
import { listWardenNotices } from '@/lib/hostel-warden-notices-api';
import { listGatePassRequests, listEmergencyExitRequests, listCallRequests } from '@/lib/hostel-warden-api';
import { listPublishedMediaPosts } from '@/lib/faculty-media-posts-api';
import { formatDate } from '@/lib/format';

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

function MessageIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function BullhornIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={hostelWardenColors.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11h3l8-5v12l-8-5H3zM18 8a4 4 0 0 1 0 8" />
    </Svg>
  );
}

function ChevronRightIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={hostelWardenColors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m9 18 6-6-6-6" />
    </Svg>
  );
}

export function HostelWardenHome({ personName }: { personName: string }) {
  const router = useRouter();
  const [noticeIndex, setNoticeIndex] = useState(0);

  const noticesQuery = useQuery({ queryKey: ['hostel-warden-notices'], queryFn: listWardenNotices });
  const gatePassQuery = useQuery({ queryKey: ['hostel-warden', 'gate-pass-requests'], queryFn: listGatePassRequests });
  const emergencyQuery = useQuery({ queryKey: ['hostel-warden', 'emergency-exit-requests'], queryFn: listEmergencyExitRequests });
  const callQuery = useQuery({ queryKey: ['hostel-warden', 'call-requests'], queryFn: listCallRequests });
  const mediaQuery = useQuery({ queryKey: ['hostel-warden-home', 'media-posts'], queryFn: listPublishedMediaPosts });

  const notices = (noticesQuery.data ?? []).slice(0, 3);
  const activeNotice = notices[noticeIndex];
  const latestPost = (mediaQuery.data ?? [])[0] ?? null;

  const pendingGatePass = (gatePassQuery.data ?? []).filter((r) => r.state === 'PENDING').length;
  const pendingEmergency = (emergencyQuery.data ?? []).filter((r) => r.state === 'PENDING').length;
  const pendingCalls = (callQuery.data ?? []).filter((r) => r.status === 'PENDING').length;
  const summaryLoading = gatePassQuery.isLoading || emergencyQuery.isLoading || callQuery.isLoading;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <LinearGradient colors={[hostelWardenColors.headerGradientFrom, hostelWardenColors.headerGradientTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={styles.header}>
        <View style={styles.logoTile}>
          <Text style={styles.logoText}>PP</Text>
        </View>
        <Text style={[styles.schoolName, { flex: 1 }]}>Pavakie Public School</Text>
        <Pressable onPress={() => router.push('/(protected)/ai-chat' as never)} hitSlop={8}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="rgba(255,255,255,0.85)" />
        </Pressable>
        <Pressable onPress={() => router.push('/(protected)/hostel-warden/notices' as never)} hitSlop={8}>
          <MessageIcon />
        </Pressable>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFromName(personName || 'H W')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingName}>Hi, {personName || 'there'}</Text>
            <Text style={styles.greetingMeta}>Hostel · Warden</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <BullhornIcon />
            <Text style={styles.sectionTitle}>Notice</Text>
            <Pressable onPress={() => router.push('/(protected)/hostel-warden/notices' as never)}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>

          {noticesQuery.isLoading ? (
            <ActivityIndicator color={hostelWardenColors.primary} />
          ) : !activeNotice ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>No notices yet.</Text>
            </View>
          ) : (
            <>
              <Pressable style={styles.noticeCard} onPress={() => router.push('/(protected)/hostel-warden/notices' as never)}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.noticeTitle}>{activeNotice.title}</Text>
                  <Text style={styles.noticeFrom}>{activeNotice.createdByName ?? 'School'}</Text>
                  <Text style={styles.noticeDate}>{formatDate(activeNotice.createdAt)}</Text>
                </View>
                {notices.length > 1 ? (
                  <Pressable
                    style={styles.noticeChevron}
                    onPress={(e) => {
                      e.stopPropagation();
                      setNoticeIndex((i) => (i + 1) % notices.length);
                    }}
                  >
                    <ChevronRightIcon />
                  </Pressable>
                ) : null}
              </Pressable>
              {notices.length > 1 ? (
                <View style={styles.dots}>
                  {notices.map((n, i) => (
                    <Pressable key={n.id} onPress={() => setNoticeIndex(i)} style={[styles.dot, i === noticeIndex && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>

        {mediaQuery.isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 8 }} />
        ) : latestPost ? (
          <View style={styles.section}>
            <View style={styles.mediaCard}>
              <View style={styles.mediaTopRow}>
                <View style={styles.mediaBadge}>
                  <Text style={styles.mediaBadgeText}>PP</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.mediaSchool} numberOfLines={1}>Pavakie Public School</Text>
                  <Text style={styles.mediaMeta} numberOfLines={1}>Media Room · {formatDate(latestPost.createdAt)}</Text>
                </View>
                <View style={styles.mediaPill}>
                  <Text style={styles.mediaPillText}>{latestPost.category}</Text>
                </View>
              </View>
              <Text style={styles.mediaCaption} numberOfLines={2}>{latestPost.caption}</Text>
              {latestPost.firstComment ? <Text style={styles.mediaBody} numberOfLines={3}>{latestPost.firstComment}</Text> : null}
              {latestPost.assets[0] ? (
                <View style={styles.mediaImageWrap}>
                  <Image source={{ uri: latestPost.assets[0].url }} style={styles.mediaImage} resizeMode="cover" />
                  {latestPost.assets.length > 1 ? (
                    <View style={styles.mediaImageBadge}>
                      <Text style={styles.mediaImageBadgeText}>1/{latestPost.assets.length}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today at a glance</Text>
          {summaryLoading ? (
            <ActivityIndicator color={hostelWardenColors.primary} />
          ) : (
            <View style={styles.glanceRow}>
              <Pressable style={styles.glanceTile} onPress={() => router.push('/(protected)/hostel-warden/gate-pass-requests' as never)}>
                <Text style={styles.glanceCount}>{pendingGatePass}</Text>
                <Text style={styles.glanceLabel}>Gate pass</Text>
              </Pressable>
              <Pressable style={styles.glanceTile} onPress={() => router.push('/(protected)/hostel-warden/emergency-exit-requests' as never)}>
                <Text style={styles.glanceCount}>{pendingEmergency}</Text>
                <Text style={styles.glanceLabel}>Emergency exit</Text>
              </Pressable>
              <Pressable style={styles.glanceTile} onPress={() => router.push('/(protected)/hostel-warden/call-requests' as never)}>
                <Text style={styles.glanceCount}>{pendingCalls}</Text>
                <Text style={styles.glanceLabel}>Call requests</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.surface },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoTile: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: hostelWardenColors.primary, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 },
  schoolName: { flex: 1, fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff', letterSpacing: -0.2 },
  body: { flex: 1, paddingBottom: 14 },
  greetingRow: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: hostelWardenColors.hairline,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: hostelWardenColors.tint3, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: hostelWardenColors.primary, fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  greetingName: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.primary, letterSpacing: -0.2 },
  greetingMeta: { fontSize: 12.5, color: hostelWardenColors.subtleText, marginTop: 3 },
  section: { paddingHorizontal: 18, paddingVertical: 6, gap: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionTitle: { flex: 1, fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  viewAll: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: hostelWardenColors.primary },
  noticeCard: { backgroundColor: hostelWardenColors.tint2, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  noticeTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 21, color: hostelWardenColors.ink },
  noticeFrom: { fontSize: 13, color: hostelWardenColors.bodyStrong },
  noticeDate: { fontSize: 12.5, color: hostelWardenColors.muted },
  noticeChevron: { width: 34, height: 34, borderRadius: 17, backgroundColor: hostelWardenColors.tint4, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: hostelWardenColors.dotInactive },
  dotActive: { backgroundColor: hostelWardenColors.primary, width: 22 },
  glanceRow: { flexDirection: 'row', gap: 10 },
  glanceTile: { flex: 1, backgroundColor: hostelWardenColors.tint, borderRadius: 14, paddingVertical: 16, alignItems: 'center', gap: 4 },
  glanceCount: { fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.primary },
  glanceLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: hostelWardenColors.body, textAlign: 'center' },
  mediaCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: hostelWardenColors.border, borderRadius: 14, padding: 16, gap: 12 },
  mediaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaBadge: { width: 38, height: 38, borderRadius: 10, backgroundColor: hostelWardenColors.infoBg, alignItems: 'center', justifyContent: 'center' },
  mediaBadgeText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.primary },
  mediaSchool: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  mediaMeta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
  mediaPill: { backgroundColor: hostelWardenColors.infoBg, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  mediaPillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: hostelWardenColors.infoText },
  mediaCaption: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink, lineHeight: 20 },
  mediaBody: { fontSize: 13.5, color: hostelWardenColors.bodyStrong, lineHeight: 20 },
  mediaImageWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', backgroundColor: hostelWardenColors.tint, height: 200 },
  mediaImage: { width: '100%', height: '100%' },
  mediaImageBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(16,35,63,0.72)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99 },
  mediaImageBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
});
