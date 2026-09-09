// Notices -- "View All" destination for ParentHome's own Announcements section.
// Pixel-matched to "ERP screen design choice/School App.dc.html"'s own isNotices
// block: a plain vertical list of cards, real school-eos-backend feed (SCHOOL +
// ROLE=PARENT, scoped to the selected child's own current section). `category`
// is a free-form string on the backend (no enum) so the tag-color mapping below
// is a best-effort lookup with a neutral/blue fallback, not an exhaustive switch.
// `isEmergency` is a real, meaningful field -- emphasized with a red card border,
// separate from (and overriding) the category tag's own color.

import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { formatDate } from '@/lib/format';
import { listAnnouncements, type ParentAnnouncement } from '@/lib/parent-api';
import { parentColors } from '@/lib/theme';

const CATEGORY_STYLES: Record<string, { bg: string; fg: string }> = {
  EVENT: { bg: parentColors.pillBlueBg, fg: parentColors.blueDeep },
  ACADEMIC: { bg: parentColors.pillBlueBg, fg: parentColors.blueDeep },
  MEETING: { bg: parentColors.pillBlueBg, fg: parentColors.blueDeep },
  NOTICE: { bg: parentColors.pillBlueBg, fg: parentColors.blueDeep },
  EXAM: { bg: parentColors.amberBg, fg: parentColors.amberDark },
  HOLIDAY: { bg: parentColors.pillNeutralBg, fg: parentColors.ink },
  FEE: { bg: parentColors.pillNeutralBg, fg: parentColors.bodyMuted },
  FEES: { bg: parentColors.pillNeutralBg, fg: parentColors.bodyMuted },
  TRANSPORT: { bg: parentColors.pillNeutralBg, fg: parentColors.ink },
  SPORTS: { bg: parentColors.greenBg, fg: parentColors.greenDark },
  HEALTH: { bg: parentColors.greenBg, fg: parentColors.greenDark },
};

function categoryStyle(category: string | null, isEmergency: boolean): { bg: string; fg: string } {
  if (isEmergency) return { bg: parentColors.redBg, fg: parentColors.redDark };
  const key = category?.trim().toUpperCase();
  if (key && CATEGORY_STYLES[key]) return CATEGORY_STYLES[key];
  return { bg: parentColors.pillBlueBg, fg: parentColors.blueDeep };
}

function categoryLabel(category: string | null, isEmergency: boolean): string {
  if (isEmergency) return 'Emergency';
  const trimmed = category?.trim();
  if (!trimmed) return 'Notice';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function extractErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function NoticeCard({ announcement }: { announcement: ParentAnnouncement }) {
  const tag = categoryStyle(announcement.category, announcement.isEmergency);
  return (
    <View style={[styles.card, announcement.isEmergency && styles.cardEmergency]}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>PP</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.sender} numberOfLines={1}>Pavakie Public School</Text>
          <Text style={styles.date}>{formatDate(announcement.createdAt)}</Text>
        </View>
        <View style={[styles.tag, { backgroundColor: tag.bg }]}>
          <Text style={[styles.tagText, { color: tag.fg }]}>
            {categoryLabel(announcement.category, announcement.isEmergency)}
          </Text>
        </View>
      </View>
      <Text style={styles.title}>{announcement.title}</Text>
      <Text style={styles.body}>{announcement.body}</Text>
    </View>
  );
}

export default function NoticesScreen() {
  const router = useRouter();
  const { selected, isLoading: childLoading } = useSelectedChild();
  const studentId = selected?.studentId;

  const announcementsQuery = useQuery({
    queryKey: ['parent-notices', studentId],
    queryFn: () => listAnnouncements(studentId!),
    enabled: !!studentId,
  });

  if (childLoading || !selected) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Announcements" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      </View>
    );
  }

  const announcements = announcementsQuery.data ?? [];
  const subtitle = announcementsQuery.data
    ? `${announcements.length} notice${announcements.length === 1 ? '' : 's'}`
    : undefined;

  return (
    <View style={styles.flex}>
      <AppHeader title="Announcements" subtitle={subtitle} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={announcementsQuery.isFetching} onRefresh={() => announcementsQuery.refetch()} />
        }
      >
        {announcementsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : announcementsQuery.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {extractErrorMessage(announcementsQuery.error, 'Unable to load announcements.')}
            </Text>
            <Pressable style={styles.retryButton} onPress={() => announcementsQuery.refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : announcements.length === 0 ? (
          <View style={styles.noMatchCard}>
            <Text style={styles.noMatchTitle}>No announcements yet</Text>
            <Text style={styles.noMatchSubtitle}>School notices for this child will appear here.</Text>
          </View>
        ) : (
          announcements.map((a) => <NoticeCard key={a.id} announcement={a} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },

  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  errorText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.redDark, textAlign: 'center' },
  retryButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },

  noMatchCard: {
    backgroundColor: parentColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    padding: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  noMatchTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.bodyMuted },
  noMatchSubtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 5, textAlign: 'center' },

  card: {
    backgroundColor: parentColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  cardEmergency: { borderColor: parentColors.redDark, borderWidth: 1.5 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: parentColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.gradientEnd },
  sender: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  date: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  tag: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99 },
  tagText: { fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold' },
  title: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 12, lineHeight: 20 },
  body: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.bodyMuted, marginTop: 8, lineHeight: 21 },
});
