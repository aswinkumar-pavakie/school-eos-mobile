// Faculty Home -- pixel-matches the design's own Home screen: gradient
// header, greeting card, an Announcements carousel (real feed -- SCHOOL +
// ROLE=FACULTY + this faculty member's own scoped sections), and a preview
// of Media Room's own published posts. Building the posts-consumption
// feature itself (comments, likes, etc.) is out of scope -- this is only
// the read connection the user asked for.

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import { listFeedAnnouncements } from '@/lib/faculty-announcements-api';
import { listPublishedMediaPosts } from '@/lib/faculty-media-posts-api';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';

function BellIcon() {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}
function PersonIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={facultyColors.blue} strokeWidth={1.8} strokeLinecap="round">
      <Circle cx={12} cy={8} r={3.5} />
      <Path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#1E3FAE" strokeWidth={2.4} strokeLinecap="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function FacultyHome({ facultyName, facultyMeta }: { facultyName: string; facultyMeta: string }) {
  const router = useRouter();
  const [annIndex, setAnnIndex] = useState(0);

  const announcementsQuery = useQuery({ queryKey: ['faculty-announcements-feed'], queryFn: listFeedAnnouncements });
  const mediaQuery = useQuery({ queryKey: ['faculty-home-media-posts'], queryFn: listPublishedMediaPosts });

  const announcements = announcementsQuery.data ?? [];
  const currentAnn = announcements[annIndex % Math.max(announcements.length, 1)];
  const latestPost = (mediaQuery.data ?? [])[0];

  return (
    <View style={styles.flex}>
      <LinearGradient colors={['#1E3FAE', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>PP</Text>
              </View>
              <Text style={styles.schoolName}>Pavakie Public School</Text>
            </View>
            <View style={styles.bellWrap}>
              <BellIcon />
              <View style={styles.bellDot} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.greetingCard}>
          <View style={styles.avatar}>
            <PersonIcon />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greetingName}>Hi, {facultyName}</Text>
            <Text style={styles.greetingMeta} numberOfLines={1}>{facultyMeta}</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionHeaderIcon}>📣</Text>
            <Text style={styles.sectionHeaderTitle}>Announcements</Text>
          </View>
          <Pressable onPress={() => router.push('/(protected)/faculty/announcements' as never)}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {announcementsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
        ) : announcements.length === 0 ? (
          <Text style={styles.emptyText}>No announcements yet.</Text>
        ) : currentAnn ? (
          <>
            <View style={styles.annCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.annTitle} numberOfLines={2}>{currentAnn.title}</Text>
                {currentAnn.body ? <Text style={styles.annBody} numberOfLines={2}>{currentAnn.body}</Text> : null}
                <Text style={styles.annDate}>{formatDate(currentAnn.createdAt)}</Text>
              </View>
              {announcements.length > 1 ? (
                <Pressable style={styles.nextBtn} onPress={() => setAnnIndex((i) => (i + 1) % announcements.length)}>
                  <ChevronRightIcon />
                </Pressable>
              ) : null}
            </View>
            {announcements.length > 1 ? (
              <View style={styles.dotsRow}>
                {announcements.slice(0, 8).map((_, i) => (
                  <Pressable key={i} onPress={() => setAnnIndex(i)}>
                    <View style={[styles.dot, i === annIndex % announcements.length ? styles.dotActive : styles.dotInactive]} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {mediaQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
        ) : latestPost ? (
          <View style={styles.mediaCard}>
            <View style={styles.mediaTopRow}>
              <View style={styles.mediaBadgeSmall}>
                <Text style={styles.mediaBadgeSmallText}>PP</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaSchool}>Pavakie Public School</Text>
                <Text style={styles.mediaMeta}>Media Room · {formatDate(latestPost.createdAt)}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{latestPost.category}</Text>
              </View>
            </View>
            <Text style={styles.mediaCaption}>{latestPost.caption}</Text>
            {latestPost.firstComment ? <Text style={styles.mediaBody}>{latestPost.firstComment}</Text> : null}
            {latestPost.assets[0] ? (
              <Image source={{ uri: latestPost.assets[0].url }} style={styles.mediaImage} resizeMode="cover" />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: facultyColors.background },
  headerRow: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#1E3FAE' },
  schoolName: { color: '#fff', fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' },
  bellWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#60A5FA', borderWidth: 2, borderColor: '#2563EB' },
  greetingCard: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F6' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#DBEAFE', borderWidth: 2, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center' },
  greetingName: { fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  greetingMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', color: facultyColors.mutedStrong, marginTop: 2 },
  sectionHeaderRow: { paddingHorizontal: 18, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderIcon: { fontSize: 17 },
  sectionHeaderTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  viewAll: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.blue },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 16 },
  annCard: { margin: 18, marginTop: 12, backgroundColor: '#E5ECFB', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  annTitle: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, lineHeight: 20 },
  annBody: { fontSize: 13, color: facultyColors.bodyMuted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 9 },
  annDate: { fontSize: 12.5, color: facultyColors.mutedStrong, marginTop: 9 },
  nextBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#C9D8F7', alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 5, justifyContent: 'center', paddingTop: 4 },
  dot: { height: 5, borderRadius: 3 },
  dotActive: { width: 18, backgroundColor: facultyColors.blue },
  dotInactive: { width: 5, backgroundColor: facultyColors.borderLight },
  mediaCard: { margin: 14, marginTop: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border, borderRadius: 16, padding: 16 },
  mediaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaBadgeSmall: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#EEF2FB', alignItems: 'center', justifyContent: 'center' },
  mediaBadgeSmallText: { fontSize: 12, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#1E3FAE' },
  mediaSchool: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  mediaMeta: { fontSize: 11.5, color: '#7C8698', marginTop: 2 },
  categoryBadge: { backgroundColor: facultyColors.greenBg, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  categoryBadgeText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.greenDark },
  mediaCaption: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink, marginTop: 14 },
  mediaBody: { fontSize: 13.5, color: '#8A6B4F', lineHeight: 20, marginTop: 8, fontFamily: 'PlusJakartaSans_500Medium' },
  mediaImage: { marginTop: 14, borderRadius: 10, width: '100%', height: 160, backgroundColor: facultyColors.borderSoft },
});
