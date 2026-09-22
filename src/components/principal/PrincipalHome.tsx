// Principal Home -- pixel-rebuilt (micro-depth pass) from the design's own
// `isHome` screen (brain/SIS Principal - App/Principal App.dc.html, lines
// 34-154): header (school badge + name + single message icon w/ unread
// dot), a dedicated white greeting row with an initials avatar and BLUE
// name text, a "Notice" section (icon + title + View All) immediately
// below the greeting whose card is a tinted (not white) block with
// title/category/date + a clickable next-slide button + individually-
// tappable dots, then a real Media Room social-post card, then the stat
// tiles last -- this exact order matches the design's own top-to-bottom
// layout.
//
// The design's second card (school badge + "Media Room · date" + category
// pill + caption + body + a blue poster block with a gallery-count badge)
// is a real, already-shipped Media Room post -- the same GET /media/posts
// connection Faculty/Parent/Sports Admin's own Home feeds already use
// (see faculty-media-posts-api.ts), not a fabricated calendar-event card.
// The poster's own big overlay headline text ("ANNUAL DAY / REHEARSALS")
// and "Cultural Committee" byline in the mock have no real field anywhere
// on MediaPost (no organizer/headline-override column) -- this renders the
// real asset image itself instead, with a real gallery-count badge from
// assets.length, never invented overlay copy.
//
// The mock's own single header icon routes straight to Messages; this app
// also has a real, separate "Ask the Assistant" feature added after this
// design existed, so that icon is kept too (smaller, secondary) rather than
// removed -- pixel-matching the design must never delete real, already-
// shipped functionality.
//
// Stat tiles: the design ships these `display:none` in its own mock source,
// but a live call against the real dashboard-summary endpoint confirms
// genuinely real data for exactly these four metrics -- kept visible since
// it's real, not fabricated, matching the design's evident intent (its own
// tile markup/styling is fully spec'd, just hidden by default in the tool).

import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/format';
import { principalColors } from '@/lib/theme';
import { getDashboardSummary } from '@/lib/principal-dashboard-api';
import { listAnnouncements } from '@/lib/vice-principal-dashboard-api';
import { listPublishedMediaPosts } from '@/lib/faculty-media-posts-api';
import { getSchoolInfo } from '@/lib/principal-profile-api';
import { listNotifications } from '@/lib/principal-notifications-api';
import { ChatIcon } from './icons';
import { StatCards } from './StatCards';

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function PrincipalHome({ personName }: { personName: string }) {
  const router = useRouter();
  const [noticeIndex, setNoticeIndex] = useState(0);

  const schoolQuery = useQuery({ queryKey: ['principal-home', 'school'], queryFn: getSchoolInfo });
  const summaryQuery = useQuery({ queryKey: ['principal-home', 'summary'], queryFn: getDashboardSummary });
  const noticesQuery = useQuery({
    queryKey: ['principal-home', 'notices'],
    queryFn: () => listAnnouncements({ roleCode: 'PRINCIPAL' }),
  });
  const mediaQuery = useQuery({ queryKey: ['principal-home', 'media-posts'], queryFn: listPublishedMediaPosts });
  const notificationsQuery = useQuery({
    queryKey: ['principal-home', 'notifications'],
    queryFn: () => listNotifications({ unreadOnly: true, limit: 1 }),
  });

  const notices = (noticesQuery.data ?? []).slice(0, 3);
  const activeNotice = notices[noticeIndex] ?? notices[0];
  const latestPost = (mediaQuery.data ?? [])[0] ?? null;
  const unreadCount = notificationsQuery.data?.meta.unreadCount ?? 0;
  const schoolName = schoolQuery.data?.name ?? 'School';
  const badgeInitials = useMemo(() => initialsOf(schoolName), [schoolName]);
  const personInitials = useMemo(() => initialsOf(personName || 'P'), [personName]);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeInitials || 'S'}</Text>
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {schoolName}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Pressable onPress={() => router.push('/(protected)/messaging' as never)} hitSlop={8} style={{ position: 'relative' }}>
                <ChatIcon size={27} color="#fff" />
                {unreadCount > 0 ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{personInitials}</Text>
          </View>
          <Text style={styles.greeting}>Hi, {personName}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="megaphone-outline" size={19} color={principalColors.ink} />
            <Text style={styles.sectionTitle}>Notice</Text>
            <Pressable onPress={() => router.push('/(protected)/principal/announcements?title=Notices' as never)}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>

          {noticesQuery.isLoading ? (
            <ActivityIndicator color={principalColors.primary} />
          ) : activeNotice ? (
            <>
              <Pressable
                style={styles.noticeCard}
                onPress={() => router.push('/(protected)/principal/announcements?title=Notices' as never)}
              >
                <View style={{ flex: 1, gap: 9 }}>
                  <Text style={styles.noticeTitle} numberOfLines={2}>
                    {activeNotice.title}
                  </Text>
                  {activeNotice.category ? <Text style={styles.noticeFrom}>{activeNotice.category}</Text> : null}
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
                    <Text style={styles.noticeChevronText}>›</Text>
                  </Pressable>
                ) : null}
              </Pressable>
              {notices.length > 1 ? (
                <View style={styles.dotsRow}>
                  {notices.map((n, i) => (
                    <Pressable key={n.id} onPress={() => setNoticeIndex(i)} style={[styles.dot, i === noticeIndex && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        {mediaQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 8 }} />
        ) : latestPost ? (
          <View style={styles.section}>
            <View style={styles.mediaCard}>
              <View style={styles.eventTopRow}>
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>{badgeInitials || 'S'}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.eventSchool} numberOfLines={1}>
                    {schoolName}
                  </Text>
                  <Text style={styles.eventMeta}>Media Room · {formatDate(latestPost.createdAt)}</Text>
                </View>
                <View style={styles.eventPill}>
                  <Text style={styles.eventPillText}>{latestPost.category}</Text>
                </View>
              </View>
              <Text style={styles.eventTitle} numberOfLines={2}>
                {latestPost.caption}
              </Text>
              {latestPost.firstComment ? (
                <Text style={styles.eventBody} numberOfLines={3}>
                  {latestPost.firstComment}
                </Text>
              ) : null}
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

        {summaryQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 16 }} />
        ) : summaryQuery.data ? (
          <View style={styles.statsWrap}>
            <StatCards
              items={[
                { label: 'Students', value: String(summaryQuery.data.activeStudents) },
                { label: 'Staff on roll', value: String(summaryQuery.data.activeStaff) },
                {
                  label: 'Marked today',
                  value: `${summaryQuery.data.staffMarkedToday.present}/${summaryQuery.data.staffMarkedToday.total}`,
                },
                {
                  label: 'Hostel beds',
                  value: `${summaryQuery.data.hostelOccupancy.occupiedBeds}/${summaryQuery.data.hostelOccupancy.totalBeds}`,
                },
              ]}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  header: { backgroundColor: principalColors.primary },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  badge: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.primary },
  headerTitle: { color: '#fff', fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: -0.2, flexShrink: 1 },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: principalColors.accentOrange,
    borderWidth: 2,
    borderColor: principalColors.primary,
  },
  content: { paddingBottom: 32 },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: principalColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: principalColors.border,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: principalColors.tint7, borderWidth: 2, borderColor: principalColors.tint8, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.primary },
  greeting: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.primary, letterSpacing: -0.3 },
  statsWrap: { paddingHorizontal: 20, marginTop: 16 },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: principalColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: principalColors.border,
    gap: 12,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionTitle: { flex: 1, fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, letterSpacing: -0.2 },
  viewAll: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.primary },
  noticeCard: {
    backgroundColor: principalColors.tint6,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  noticeTitle: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, letterSpacing: -0.3, lineHeight: 24 },
  noticeFrom: { fontSize: 13.5, color: principalColors.body },
  noticeDate: { fontSize: 13, color: principalColors.muted },
  noticeChevron: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  noticeChevronText: { color: principalColors.primary, fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },
  dotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: principalColors.faintStrong },
  dotActive: { backgroundColor: principalColors.primary, width: 20 },
  mediaCard: { backgroundColor: principalColors.surface, borderWidth: 1, borderColor: principalColors.border, borderRadius: 16, padding: 16, gap: 12 },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventBadge: { width: 38, height: 38, borderRadius: 10, backgroundColor: principalColors.border, alignItems: 'center', justifyContent: 'center' },
  eventBadgeText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.primary },
  eventSchool: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  eventMeta: { fontSize: 11.5, color: principalColors.tertiary, marginTop: 1 },
  eventPill: { backgroundColor: principalColors.tint2, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  eventPillText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.primary },
  eventTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, letterSpacing: -0.2 },
  eventBody: { fontSize: 13.5, color: principalColors.body, lineHeight: 20 },
  mediaImageWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', backgroundColor: principalColors.tint, height: 200 },
  mediaImage: { width: '100%', height: '100%' },
  mediaImageBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15,27,51,0.72)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99 },
  mediaImageBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
});
