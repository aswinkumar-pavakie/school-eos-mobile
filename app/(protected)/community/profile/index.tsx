// Community -> Profile -- the one community this login represents (resolved
// from GET /auth/me's own role_assignment scope_id, never a client-supplied
// id, same as the website's own profile page), its roster, and the
// membership-request workflow (propose add/remove, Principal approves via
// the existing generic approvals engine).

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  getCommunity,
  getCommunityMemberships,
  getMe,
  listMembershipRequests,
  requestAddMembership,
  requestRemoveMembership,
  searchStudents,
  type StudentHit,
} from '@/lib/community-api';
import { membershipRequestStatusMeta, membershipStatusMeta } from '@/lib/community-status';
import { parentColors, cardShadow } from '@/lib/theme';

function AddMemberForm({ communityId }: { communityId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentHit[]>([]);
  const [selected, setSelected] = useState<StudentHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(text: string) {
    setQuery(text);
    setSelected(null);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchStudents(text));
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!selected) {
      setError('Search and pick a student first.');
      return;
    }
    setSubmitting(true);
    try {
      await requestAddMembership({ studentId: selected.id });
      queryClient.invalidateQueries({ queryKey: ['community', 'membership-requests'] });
      setOpen(false);
      setQuery('');
      setResults([]);
      setSelected(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={styles.linkButton}>
        <Text style={styles.linkButtonText}>+ Request new member</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <Text style={styles.sectionTitle}>Request new member</Text>
      <View style={{ marginTop: 12 }}>
        <Text style={styles.fieldLabel}>Student</Text>
        <TextInput
          style={styles.input}
          value={selected ? `${selected.firstName} ${selected.lastName ?? ''} (${selected.admissionNo})` : query}
          onChangeText={handleSearch}
          placeholder="Search by name or admission number…"
          placeholderTextColor={parentColors.mutedLight}
          editable={!selected}
        />
        {searching ? <ActivityIndicator color={parentColors.blue} style={{ marginTop: 8 }} /> : null}
        {!selected && results.length > 0 ? (
          <View style={styles.resultsBox}>
            {results.map((s) => (
              <Pressable
                key={s.id}
                style={styles.resultRow}
                onPress={() => {
                  setSelected(s);
                  setResults([]);
                }}
              >
                <Text style={styles.resultName}>
                  {s.firstName} {s.lastName ?? ''}
                </Text>
                <Text style={styles.resultMeta}>{s.admissionNo}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {selected ? (
          <Pressable
            onPress={() => {
              setSelected(null);
              setQuery('');
            }}
          >
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.mutedBody}>Sent to your Principal for review before the student is added.</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Pressable style={styles.cancelButton} onPress={() => setOpen(false)}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={[styles.submitButton, { flex: 1 }, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit request</Text>}
        </Pressable>
      </View>
    </View>
  );
}

function MembershipRow({ membership }: { membership: Awaited<ReturnType<typeof getCommunityMemberships>>[number] }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = membershipStatusMeta(membership.status);

  async function handleRequestRemoval() {
    setError(null);
    setBusy(true);
    try {
      await requestRemoveMembership(membership.id);
      queryClient.invalidateQueries({ queryKey: ['community', 'membership-requests'] });
      setRequested(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.memberRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName} numberOfLines={1}>
          {membership.studentFirstName} {membership.studentLastName ?? ''}
        </Text>
        <Text style={styles.meta}>
          Joined {formatDate(membership.joinedOn)}
          {membership.status === 'PENDING_CONSENT' ? ' · Consent pending' : ''}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <StatusBadge {...meta} />
        {requested ? (
          <Text style={styles.mutedSmall}>Removal requested</Text>
        ) : (
          <Pressable
            onPress={handleRequestRemoval}
            disabled={busy}
            hitSlop={6}
            style={[styles.removeButton, busy && styles.removeButtonDisabled]}
          >
            {busy ? (
              <ActivityIndicator color="#B33A2E" size="small" />
            ) : (
              <Text style={styles.removeButtonText}>Request removal</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const meQuery = useQuery({ queryKey: ['community', 'me'], queryFn: getMe });
  const communityRole = meQuery.data?.roles.find((r) => r.role_code === 'COMMUNITY' && r.scope_type === 'COMMUNITY');
  const communityId = communityRole?.scope_id ?? null;

  const communityQuery = useQuery({
    queryKey: ['community', 'detail', communityId],
    queryFn: () => getCommunity(communityId!),
    enabled: !!communityId,
  });
  const membershipsQuery = useQuery({
    queryKey: ['community', 'memberships', communityId],
    queryFn: () => getCommunityMemberships(communityId!),
    enabled: !!communityId,
  });
  const requestsQuery = useQuery({ queryKey: ['community', 'membership-requests'], queryFn: listMembershipRequests });

  if (meQuery.isLoading || communityQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Profile" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!communityId) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Profile" onBack={() => router.back()} />
        <ErrorState message="This Community account is not assigned to a specific community. Contact your Admin." onRetry={() => meQuery.refetch()} />
      </View>
    );
  }

  if (communityQuery.isError || !communityQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Profile" onBack={() => router.back()} />
        <ErrorState message="Couldn't load your community." onRetry={() => communityQuery.refetch()} />
      </View>
    );
  }

  const community = communityQuery.data;
  const memberships = membershipsQuery.data ?? [];
  const visible = memberships.filter((m) => m.status !== 'REMOVED');
  const requests = (requestsQuery.data ?? []).filter((r) => r.communityId === communityId);

  return (
    <View style={styles.flex}>
      <AppHeader title={community.name} subtitle={community.communityCategory} onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={membershipsQuery.isFetching} onRefresh={() => membershipsQuery.refetch()} />}
      >
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>Basic info</Text>
          <Text style={styles.body}>{community.description ?? '—'}</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.fieldLabel}>Max members</Text>
              <Text style={styles.body}>{community.maxMembers ?? '—'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.fieldLabel}>Discussion</Text>
              <Text style={styles.body}>{community.discussionEnabled ? 'Enabled' : 'Disabled'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, cardShadow]}>
          <View style={styles.rosterHeader}>
            <Text style={styles.sectionTitle}>Membership roster</Text>
            <Text style={styles.meta}>
              {visible.length}
              {community.maxMembers !== null ? ` / ${community.maxMembers}` : ''} members
            </Text>
          </View>
          {membershipsQuery.isLoading ? (
            <ActivityIndicator color={parentColors.blue} style={{ marginTop: 12 }} />
          ) : visible.length === 0 ? (
            <Text style={styles.mutedBody}>No members yet.</Text>
          ) : (
            visible.map((m) => <MembershipRow key={m.id} membership={m} />)
          )}
          <View style={{ marginTop: 8 }}>
            <AddMemberForm communityId={communityId} />
          </View>
        </View>

        {requests.length > 0 ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionTitle}>Membership requests</Text>
            {requests.map((r) => (
              <View key={r.id} style={styles.requestRow}>
                <Text style={styles.body} numberOfLines={1}>
                  {r.action === 'ADD' ? 'Add' : 'Remove'} {r.studentFirstName ? `${r.studentFirstName} ${r.studentLastName ?? ''}` : 'member'}
                </Text>
                <StatusBadge {...membershipRequestStatusMeta(r.status)} />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, marginTop: 8, lineHeight: 20 },
  mutedBody: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted, marginTop: 8, lineHeight: 19 },
  mutedSmall: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  meta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoGrid: { flexDirection: 'row', gap: 24, marginTop: 12 },
  infoItem: {},
  rosterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  memberName: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  removeButton: {
    backgroundColor: '#FDECEA',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 26,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonDisabled: { opacity: 0.6 },
  removeButtonText: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#B33A2E' },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  fieldLabel: { fontSize: 12, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  resultsBox: { borderWidth: 1, borderColor: parentColors.fieldBorder, borderRadius: 12, marginTop: 6, overflow: 'hidden' },
  resultRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: parentColors.borderSoft },
  resultName: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  resultMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  changeText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#B33A2E', marginTop: 6 },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12.5, marginTop: 6 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  cancelButton: { borderWidth: 1, borderColor: parentColors.border, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  cancelButtonText: { color: parentColors.ink, fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold' },
  linkButton: { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  linkButtonText: { color: parentColors.blue, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' },
});
