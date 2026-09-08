// Community -> Announcements -- send a notice to your own community, real
// backend calls only (community-announcements.controller.ts's own
// /communities/:id/announcements endpoints, the exact same rows Admin's own
// community-announcements UI already reads/writes on the website). Direct
// publish, no approval step -- same authority Admin already has over these
// rows, just scoped server-side to the caller's own community (see
// community-announcements.service.ts's assertCanWriteCommunity). Ownership
// (which community this login represents) is resolved via GET /auth/me,
// same as profile/index.tsx -- never hardcoded, never client-guessed.

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { archiveAnnouncement, createAnnouncement, getMe, listAnnouncements } from '@/lib/community-api';
import { announcementStatusMeta } from '@/lib/community-status';
import { parentColors, cardShadow } from '@/lib/theme';

const ANNOUNCEMENTS_KEY = (communityId: string) => ['community', 'announcements', communityId];

function NewAnnouncementTab({ communityId }: { communityId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!title.trim() || !body.trim()) {
      setError('Title and message are both required.');
      return;
    }
    setSubmitting(true);
    try {
      await createAnnouncement(communityId, { title: title.trim(), body: body.trim() });
      queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY(communityId) });
      setTitle('');
      setBody('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the announcement.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, cardShadow]}>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Weekend cleanup drive"
            placeholderTextColor={parentColors.mutedLight}
          />
        </View>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={body}
            onChangeText={setBody}
            placeholder="What do your members need to know?"
            placeholderTextColor={parentColors.mutedLight}
            multiline
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>Announcement sent. Check the History tab.</Text> : null}

        <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Send announcement</Text>}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function HistoryTab({ communityId }: { communityId: string }) {
  const queryClient = useQueryClient();
  const listQuery = useQuery({ queryKey: ANNOUNCEMENTS_KEY(communityId), queryFn: () => listAnnouncements(communityId) });
  const [archivingId, setArchivingId] = useState<string | null>(null);

  async function handleArchive(id: string) {
    setArchivingId(id);
    try {
      await archiveAnnouncement(id);
      await queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY(communityId) });
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
    >
      {listQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : listQuery.isError ? (
        <ErrorState
          message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load announcements.'}
          onRetry={() => listQuery.refetch()}
        />
      ) : (listQuery.data ?? []).length === 0 ? (
        <EmptyState message="No announcements yet. Send one from the New tab." />
      ) : (
        (listQuery.data ?? []).map((announcement) => {
          const meta = announcementStatusMeta(announcement.state);
          return (
            <View key={announcement.id} style={[styles.card, cardShadow]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subject} numberOfLines={1}>
                    {announcement.title}
                  </Text>
                  <Text style={styles.meta}>{formatDate(announcement.publishedAt)}</Text>
                </View>
                <StatusBadge {...meta} />
              </View>
              <Text style={styles.body}>{announcement.body}</Text>
              {announcement.state !== 'ARCHIVED' ? (
                <Pressable
                  onPress={() => handleArchive(announcement.id)}
                  disabled={archivingId === announcement.id}
                  hitSlop={6}
                  style={[styles.archiveButton, archivingId === announcement.id && styles.archiveButtonDisabled]}
                >
                  {archivingId === announcement.id ? (
                    <ActivityIndicator color="#B33A2E" size="small" />
                  ) : (
                    <Text style={styles.archiveButtonText}>Archive</Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'new' | 'history'>('history');
  const meQuery = useQuery({ queryKey: ['community', 'me'], queryFn: getMe });
  const communityRole = meQuery.data?.roles.find((r) => r.role_code === 'COMMUNITY' && r.scope_type === 'COMMUNITY');
  const communityId = communityRole?.scope_id ?? null;

  return (
    <View style={styles.flex}>
      <AppHeader title="Announcements" subtitle="Send notices to your community" onBack={() => router.back()} />
      <SegmentedTabs
        tabs={[
          { key: 'history', label: 'History' },
          { key: 'new', label: 'New' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {meQuery.isLoading ? (
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
      ) : !communityId ? (
        <ErrorState message="This Community account is not assigned to a specific community. Contact your Admin." onRetry={() => meQuery.refetch()} />
      ) : tab === 'new' ? (
        <NewAnnouncementTab communityId={communityId} />
      ) : (
        <HistoryTab communityId={communityId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  subject: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 3 },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, marginTop: 10, lineHeight: 20 },
  fieldLabel: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  success: { color: '#1E8A4C', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  archiveButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#FDECEA',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 26,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveButtonDisabled: { opacity: 0.6 },
  archiveButtonText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#B33A2E' },
});
