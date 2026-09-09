// Principal -> Announcement detail -- view-only, real backend data only. No
// edit/archive actions here -- archive stays ADMIN-only, enforced
// server-side (create is the one write Principal has, built separately on
// the create screen).
//
// There is no GET /announcements/:id endpoint, so this screen re-fetches the
// same full (including-archived) list already used to derive the Audience
// filter on the index screen -- same authorized data, no new backend
// endpoint invented. React Query serves it from cache when already loaded.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listAnnouncements, type AnnouncementAudience } from '@/lib/principal-announcements-api';

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

function announcementMeta(row: { priority: string; isEmergency: boolean }): { label: string; tone: StatusTone } {
  if (row.isEmergency) return { label: 'Emergency', tone: 'negative' };
  if (row.priority === 'HIGH' || row.priority === 'URGENT') return { label: humanize(row.priority), tone: 'warning' };
  return { label: humanize(row.priority), tone: 'neutral' };
}

function audienceEntryLabel(a: AnnouncementAudience): string {
  if (a.audienceType === 'SCHOOL') return 'Entire school';
  if (a.audienceType === 'ROLE' && a.targetRole) return `Role: ${humanize(a.targetRole)}`;
  if (a.targetStage) return `${humanize(a.audienceType)} · ${humanize(a.targetStage)}`;
  return humanize(a.audienceType);
}

export default function PrincipalAnnouncementDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const allQuery = useQuery({
    queryKey: ['principal-announcements', 'all-for-roles'],
    queryFn: () => listAnnouncements({ includeArchived: true }),
  });
  const announcement = allQuery.data?.find((a) => a.id === id);

  if (allQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Announcement" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (allQuery.isError) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Announcement" onBack={() => router.back()} />
        <ErrorState
          message={allQuery.error instanceof ApiError ? allQuery.error.message : "Couldn't load this announcement."}
          onRetry={() => allQuery.refetch()}
        />
      </View>
    );
  }

  if (!announcement) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Announcement" onBack={() => router.back()} />
        <ErrorState message="This announcement could not be found." onRetry={() => allQuery.refetch()} />
      </View>
    );
  }

  const meta = announcementMeta(announcement);

  return (
    <View style={styles.flex}>
      <AppHeader title={announcement.title} subtitle={announcement.category ?? undefined} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <StatusBadge {...meta} />
          {announcement.state === 'ARCHIVED' ? <StatusBadge label="Archived" tone="neutral" /> : null}
        </View>

        <Text style={styles.sectionTitle}>Content</Text>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.body}>{announcement.body}</Text>
        </View>

        <Text style={styles.sectionTitle}>Details</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Published</Text>
            <Text style={styles.infoValue}>
              {announcement.publishAt ? formatDateTime(announcement.publishAt) : formatDateTime(announcement.createdAt)}
            </Text>
          </View>
          {announcement.expiresAt ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Expires</Text>
              <Text style={styles.infoValue}>{formatDateTime(announcement.expiresAt)}</Text>
            </View>
          ) : null}
          {announcement.category ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoValue}>{announcement.category}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Audience</Text>
        <View style={[styles.listCard, cardShadow]}>
          {announcement.audiences.length === 0 ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoValue}>No audience recorded</Text>
            </View>
          ) : (
            announcement.audiences.map((a, index) => (
              <View key={`${a.audienceType}-${a.targetRole ?? a.targetId ?? index}`} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <Text style={styles.infoValue}>{audienceEntryLabel(a)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 21 },
});
