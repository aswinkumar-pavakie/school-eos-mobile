// Sports Admin -- Home tab. Pixel-matched to Sports Staff Mobile App.dc.html's
// own `isHome` screen: gradient header, greeting row, Notice card, upcoming
// event card. Messaging removed entirely (explicit instruction -- sports has
// no messaging module) -- the header's own mail icon and the FAB are both
// gone. The design's Notice/Event cards are 100% hardcoded mock text
// (confirmed by direct read) -- rebuilt here against real data: the latest
// real announcement (see sports-notices-api.ts) and the next real calendar
// event, never invented copy.

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { sportsColors } from '@/lib/theme';
import { listSportsNotices } from '@/lib/sports-notices-api';
import { listCalendarEvents } from '@/lib/sports-api';
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

export function SportsHome({ personName }: { personName: string }) {
  const router = useRouter();
  const [noticeIndex, setNoticeIndex] = useState(0);

  const noticesQuery = useQuery({ queryKey: ['sports-notices'], queryFn: listSportsNotices });
  const eventsQuery = useQuery({
    queryKey: ['sports-calendar-upcoming'],
    queryFn: () => listCalendarEvents({ fromDate: new Date().toISOString().slice(0, 10) }),
  });
  // Real Media Room connection, same read-only /media/posts endpoint (forced
  // to PUBLISHED server-side) already used by Faculty/Parent's own Home
  // feeds -- SPORTS_ADMIN was just missing from that controller's @Roles list.
  const mediaQuery = useQuery({ queryKey: ['sports-home-media-posts'], queryFn: listPublishedMediaPosts });
  const latestPost = (mediaQuery.data ?? [])[0];

  const notices = (noticesQuery.data ?? []).slice(0, 3);
  const activeNotice = notices[noticeIndex];
  const nextEvent = (eventsQuery.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <LinearGradient colors={[sportsColors.headerGradientFrom, sportsColors.headerGradientTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.logoTile}>
          <Text style={styles.logoText}>PP</Text>
        </View>
        <Text style={[styles.schoolName, { flex: 1 }]}>Pavakie Public School</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Pressable style={styles.greetingRow} onPress={() => router.push('/sports/profile' as never)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFromName(personName || 'S A')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingName}>Hi, {personName || 'there'}</Text>
            <Text style={styles.greetingMeta}>Sports Dept · Sports Admin</Text>
          </View>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.flag}>⚑</Text>
            <Text style={styles.sectionTitle}>Notice</Text>
            <Pressable onPress={() => router.push('/sports/notices' as never)}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>

          {noticesQuery.isLoading ? (
            <ActivityIndicator color={sportsColors.primary} />
          ) : !activeNotice ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>No notices yet.</Text>
            </View>
          ) : (
            <>
              <Pressable style={styles.noticeCard} onPress={() => router.push('/sports/notices' as never)}>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={styles.noticeTitle}>{activeNotice.title}</Text>
                  <Text style={styles.noticeFrom}>{activeNotice.createdByName ?? 'School'}</Text>
                  <Text style={styles.noticeDate}>{formatDate(activeNotice.createdAt)}</Text>
                </View>
                <View style={styles.noticeChevron}>
                  <Text style={styles.noticeChevronText}>›</Text>
                </View>
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

        {eventsQuery.isLoading ? (
          <ActivityIndicator color={sportsColors.primary} />
        ) : nextEvent ? (
          <View style={styles.section}>
            <View style={styles.eventTopRow}>
              <View style={styles.eventTile}>
                <Text style={styles.eventTileText}>PP</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.eventSchool}>Pavakie Public School</Text>
                <Text style={styles.eventMeta}>{formatDate(nextEvent.startDate)}</Text>
              </View>
              <View style={styles.eventBadge}>
                <Text style={styles.eventBadgeText}>{nextEvent.eventType.replace(/_/g, ' ')}</Text>
              </View>
            </View>
            <Text style={styles.eventTitle}>{nextEvent.title}</Text>
            {nextEvent.description ? <Text style={styles.eventBody}>{nextEvent.description}</Text> : null}
          </View>
        ) : null}

        {mediaQuery.isLoading ? (
          <ActivityIndicator color={sportsColors.primary} style={{ marginTop: 8 }} />
        ) : latestPost ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Media Room</Text>
            </View>
            <View style={styles.mediaCard}>
              <View style={styles.mediaTopRow}>
                <View style={styles.eventTile}>
                  <Text style={styles.eventTileText}>PP</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.eventSchool}>Pavakie Public School</Text>
                  <Text style={styles.eventMeta} numberOfLines={1}>Media Room · {formatDate(latestPost.createdAt)}</Text>
                </View>
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>{latestPost.category}</Text>
                </View>
              </View>
              <Text style={styles.eventTitle}>{latestPost.caption}</Text>
              {latestPost.firstComment ? <Text style={styles.eventBody}>{latestPost.firstComment}</Text> : null}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 13 },
  logoTile: { width: 40, height: 40, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: sportsColors.accentDark, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13 },
  schoolName: { flex: 1, fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  body: { flex: 1, paddingBottom: 14 },
  greetingRow: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: sportsColors.tint2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: sportsColors.accentDark, fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  greetingName: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.accentDark },
  greetingMeta: { fontSize: 12.5, color: sportsColors.mutedStrong, marginTop: 3 },
  section: { paddingHorizontal: 18, paddingVertical: 6, gap: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flag: { fontSize: 16, color: sportsColors.accentDark },
  sectionTitle: { flex: 1, fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  viewAll: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.primary },
  noticeCard: { backgroundColor: sportsColors.tint, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  noticeTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 21, color: sportsColors.ink },
  noticeFrom: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.slate },
  noticeDate: { fontSize: 12, color: sportsColors.muted },
  noticeChevron: { width: 30, height: 30, borderRadius: 15, backgroundColor: sportsColors.tint3, alignItems: 'center', justifyContent: 'center' },
  noticeChevronText: { color: sportsColors.accentDark, fontSize: 14 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: sportsColors.border },
  dotActive: { backgroundColor: sportsColors.primary, width: 16 },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventTile: { width: 38, height: 38, borderRadius: 10, backgroundColor: sportsColors.tint, alignItems: 'center', justifyContent: 'center' },
  eventTileText: { color: sportsColors.accentDark, fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  eventSchool: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  eventMeta: { fontSize: 12, color: sportsColors.muted },
  eventBadge: { backgroundColor: sportsColors.tint, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  eventBadgeText: { color: sportsColors.primary, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' },
  eventTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  eventBody: { fontSize: 14, lineHeight: 22, color: sportsColors.body },
  mediaCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: sportsColors.border, borderRadius: 14, padding: 16, gap: 12 },
  mediaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaImageWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', backgroundColor: sportsColors.tint, height: 200 },
  mediaImage: { width: '100%', height: '100%' },
  mediaImageBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15,27,51,0.72)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99 },
  mediaImageBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
});
