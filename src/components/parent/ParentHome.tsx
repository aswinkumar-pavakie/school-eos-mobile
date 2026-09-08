// Parent Home -- pixel-matches "ERP screen design choice/School App.dc.html"'s
// own HOME section exactly (colors, spacing, copy): child avatar + switcher,
// an Announcements carousel (real feed -- SCHOOL + ROLE=PARENT + the selected
// child's own current section), and a preview of Media Room's own published
// posts. Building the posts-consumption feature itself (comments, likes,
// etc.) is out of scope -- this is only the read connection the design shows.

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path } from 'react-native-svg';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { listAnnouncements } from '@/lib/parent-api';
import { listPublishedMediaPosts } from '@/lib/faculty-media-posts-api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';

function ChevronDownIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#8494AB" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}
function AnnouncementsIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0F1B33" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11.2v2.6a1 1 0 0 0 .7.95l9 2.85A.8.8 0 0 0 13.7 17V8a.8.8 0 0 0-1-.75l-9 2.85a1 1 0 0 0-.7.95Z" />
      <Path d="M16 9.5a3.6 3.6 0 0 1 0 6" />
      <Path d="M6.5 17.5v2.2a1.3 1.3 0 0 0 2.6 0v-1.5" />
    </Svg>
  );
}
function ChevronRightIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  );
}
function CommentsIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#8494AB" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </Svg>
  );
}

export function ParentHome() {
  const router = useRouter();
  const { children, selected, selectChild, isLoading: childrenLoading } = useSelectedChild();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [annIndex, setAnnIndex] = useState(0);

  const announcementsQuery = useQuery({
    queryKey: ['parent-home-announcements', selected?.studentId],
    queryFn: () => listAnnouncements(selected!.studentId),
    enabled: !!selected,
  });
  const mediaQuery = useQuery({ queryKey: ['parent-home-media-posts'], queryFn: listPublishedMediaPosts });

  const announcements = announcementsQuery.data ?? [];
  const currentAnn = announcements[annIndex % Math.max(announcements.length, 1)];
  const latestPost = (mediaQuery.data ?? [])[0];

  const childClass = selected ? [selected.gradeName, selected.sectionName].filter(Boolean).join(' · ') : '';
  const childInitial = selected?.studentName?.trim()?.[0]?.toUpperCase() ?? '?';

  function goNotices() {
    router.push('/(protected)/my-class/notices' as never);
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.push('/(protected)/my-class/profile' as never)}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{childInitial}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingName} numberOfLines={1}>
              Hi, {childrenLoading ? '…' : (selected?.studentName ?? 'there')}
            </Text>
            <Text style={styles.greetingMeta} numberOfLines={1}>{childClass}</Text>
          </View>
          {children.length > 1 ? (
            <Pressable onPress={() => setPickerOpen((v) => !v)} style={styles.switchPill}>
              <Text style={styles.switchText}>Switch</Text>
              <ChevronDownIcon />
            </Pressable>
          ) : null}
        </View>

        {pickerOpen ? (
          <View style={styles.pickerCard}>
            {children.map((c) => (
              <Pressable
                key={c.studentId}
                onPress={() => {
                  selectChild(c.studentId);
                  setPickerOpen(false);
                }}
                style={[styles.pickerRow, c.studentId === selected?.studentId ? styles.pickerRowActive : null]}
              >
                <View style={styles.pickerAvatar}>
                  <Text style={styles.pickerAvatarText}>{c.studentName.trim()[0]?.toUpperCase() ?? '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName}>{c.studentName}</Text>
                  <Text style={styles.pickerClass}>{[c.gradeName, c.sectionName].filter(Boolean).join(' · ')}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderLeft}>
            <AnnouncementsIcon />
            <Text style={styles.sectionHeaderTitle}>Announcements</Text>
          </View>
          <Pressable onPress={goNotices}>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {announcementsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : announcements.length === 0 ? (
          <Text style={styles.emptyText}>No announcements yet.</Text>
        ) : currentAnn ? (
          <>
            <Pressable style={styles.annCard} onPress={goNotices}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.annTitle} numberOfLines={2}>{currentAnn.title}</Text>
                {currentAnn.body ? <Text style={styles.annBody} numberOfLines={1}>{currentAnn.body}</Text> : null}
                <Text style={styles.annDate}>{formatDate(currentAnn.createdAt)}</Text>
              </View>
              <View style={styles.chevronCircle}>
                <ChevronRightIcon />
              </View>
            </Pressable>
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
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : latestPost ? (
          <View style={styles.mediaCard}>
            <View style={styles.mediaTopRow}>
              <View style={styles.mediaBadge}>
                <Text style={styles.mediaBadgeText}>PP</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.mediaSchool}>Pavakie Public School</Text>
                <Text style={styles.mediaMeta} numberOfLines={1}>Media Room · {formatDate(latestPost.createdAt)}</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{latestPost.category}</Text>
              </View>
            </View>
            <Text style={styles.mediaCaption}>{latestPost.caption}</Text>
            {latestPost.firstComment ? <Text style={styles.mediaBody}>{latestPost.firstComment}</Text> : null}
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
            {latestPost.assets.length > 1 ? (
              <View style={styles.dotsRow}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={[styles.dot, styles.dotInactive]} />
              </View>
            ) : null}
            <View style={styles.commentsRow}>
              <CommentsIcon />
              <Text style={styles.commentsText}>Comments</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.white },
  content: { padding: 16, paddingTop: 16, paddingBottom: 28, gap: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 2, borderColor: parentColors.blue,
    backgroundColor: parentColors.pillBlueBg, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  greetingName: { fontSize: 19, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  greetingMeta: { fontSize: 12, color: parentColors.mutedSoft, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  switchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: parentColors.fieldBorder,
    borderRadius: 99, paddingVertical: 8, paddingHorizontal: 12,
  },
  switchText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  pickerCard: { backgroundColor: parentColors.white, borderWidth: 1, borderColor: parentColors.border, borderRadius: 16, overflow: 'hidden' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: parentColors.borderSoft },
  pickerRowActive: { backgroundColor: parentColors.pillBlueBg },
  pickerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: parentColors.pillBlueBg, alignItems: 'center', justifyContent: 'center' },
  pickerAvatarText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  pickerName: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  pickerClass: { fontSize: 12, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionHeaderTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  viewAll: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: -8 },
  annCard: {
    backgroundColor: parentColors.highlightBg, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: -8,
  },
  annTitle: { fontSize: 17, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, lineHeight: 22 },
  annBody: { fontSize: 13, color: parentColors.bodyMuted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 6 },
  annDate: { fontSize: 13, color: parentColors.bodyMuted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 14 },
  chevronCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: parentColors.chevronBg, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' },
  dot: { height: 5, borderRadius: 99 },
  dotActive: { width: 16, backgroundColor: parentColors.blue },
  dotInactive: { width: 5, backgroundColor: parentColors.checkboxOff },
  mediaCard: { backgroundColor: parentColors.white, borderWidth: 1, borderColor: parentColors.border, borderRadius: 16, padding: 16, gap: 14 },
  mediaTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaBadge: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: parentColors.border, alignItems: 'center', justifyContent: 'center' },
  mediaBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#1636A4' },
  mediaSchool: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  mediaMeta: { fontSize: 12, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 2 },
  categoryBadge: { backgroundColor: parentColors.greenBg, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99 },
  categoryBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.greenDark },
  mediaCaption: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, lineHeight: 20 },
  mediaBody: { fontSize: 13.5, color: parentColors.bodyMuted, lineHeight: 20, fontFamily: 'PlusJakartaSans_500Medium' },
  mediaImageWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden', backgroundColor: parentColors.pillNeutralBg, height: 210 },
  mediaImage: { width: '100%', height: '100%' },
  mediaImageBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15,27,51,0.72)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99 },
  mediaImageBadgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  commentsRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 12, borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  commentsText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
});
