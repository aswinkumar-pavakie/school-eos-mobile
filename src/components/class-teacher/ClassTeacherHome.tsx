// Class Teacher (Advisor) Home -- covers the product notes' own Home menu
// for this login: Notice, Media, Message, Assistance, Switch. Mirrors
// FacultyHome's structure/data sources 1:1 (Notices carousel via
// listFeedAnnouncements, Media Room preview via listPublishedMediaPosts,
// Message via /messaging) -- all three backends were widened to accept
// CLASS_ADVISOR alongside FACULTY so this identity could reuse them rather
// than needing its own copies (see faculty-announcements.controller.ts,
// media-posts.controller.ts, and messaging.controller.ts's own @Roles).
// Messaging specifically needed real review, not a blind decorator change
// -- its actual conversation/section derivation
// (MessagingService.deriveAuthorizedSections/deriveAuthorizedFaculty) was
// already built to union teaching offerings with class-advisor sections;
// the only real gap was resolveActorContext falling through to 'PARENT'
// for a CLASS_ADVISOR-only actor, now fixed.
//
// "Profile" has no dedicated screen yet for either identity -- the avatar
// opens the account switcher for now, same as Faculty's own avatar; a real
// Bio Data page is a separate, not-yet-built feature.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Circle } from 'react-native-svg';
import { listAdvisorSections } from '@/lib/faculty-scope-api';
import { listFeedAnnouncements } from '@/lib/faculty-announcements-api';
import { listPublishedMediaPosts } from '@/lib/faculty-media-posts-api';
import { getActiveIdentifier, getLinkedIdentifier } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { facultyColors } from '@/lib/theme';
import { AccountSwitcherModal } from '@/components/AccountSwitcherModal';

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

export function ClassTeacherHome() {
  const router = useRouter();
  const [annIndex, setAnnIndex] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [activeIdentifier, setActiveIdentifier] = useState<string | null>(null);
  const [linkedIdentifier, setLinkedIdentifier] = useState<string | null>(null);

  const sectionsQuery = useQuery({ queryKey: ['class-teacher-advisor-sections'], queryFn: listAdvisorSections });
  const announcementsQuery = useQuery({ queryKey: ['class-teacher-notices-feed'], queryFn: listFeedAnnouncements });
  const mediaQuery = useQuery({ queryKey: ['class-teacher-home-media-posts'], queryFn: listPublishedMediaPosts });

  const section = sectionsQuery.data?.[0];
  const sectionLabel = section ? `${section.gradeName} - ${section.sectionName}` : 'Class Advisor';

  useEffect(() => {
    let cancelled = false;
    Promise.all([getActiveIdentifier(), getLinkedIdentifier()]).then(([active, linked]) => {
      if (cancelled) return;
      setActiveIdentifier(active);
      setLinkedIdentifier(linked);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={styles.bellWrap} onPress={() => router.push('/(protected)/messaging' as never)} hitSlop={8}>
                <Ionicons name="mail-outline" size={18} color="#fff" />
              </Pressable>
              <Pressable style={styles.bellWrap} onPress={() => router.push('/(protected)/ai-chat' as never)} hitSlop={8}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.greetingCard}>
          <Pressable style={styles.avatar} onPress={() => setSwitcherOpen(true)} hitSlop={6}>
            <PersonIcon />
            <View style={styles.avatarCaret}>
              <Ionicons name="chevron-down" size={11} color="#fff" />
            </View>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.greetingName}>Class Teacher</Text>
            <Text style={styles.greetingMeta} numberOfLines={1}>{sectionLabel}</Text>
          </View>
        </View>

        <AccountSwitcherModal
          visible={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          activeLabel="CLASS_TEACHER"
          activeIdentifier={activeIdentifier}
          linkedLabel="FACULTY"
          linkedIdentifier={linkedIdentifier}
          canAddAccount
        />

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionHeaderIcon}>📣</Text>
            <Text style={styles.sectionHeaderTitle}>Notices</Text>
          </View>
          <Pressable onPress={() => router.push('/(protected)/faculty/announcements' as never)}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {announcementsQuery.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 16 }} />
        ) : announcements.length === 0 ? (
          <Text style={styles.emptyText}>No notices yet.</Text>
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
  greetingCard: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#EDF0F6' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#DBEAFE', borderWidth: 2, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center' },
  avatarCaret: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: facultyColors.blue,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
