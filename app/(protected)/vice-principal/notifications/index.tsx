// Vice Principal -> Notifications (Phase 24) -- real backend data only, via
// the new (but not duplicated -- see vice-principal-notifications-api.ts's
// own comment) GET /notifications and POST /notifications/:id/read. These
// are VP's own, personal notifications (notification.person_id = VP's own
// personId, enforced server-side) -- never another person's, another
// school's, or a role-wide feed; there is no such thing as a "role-wide"
// notification in the real system, every row is already targeted at one
// specific person by whatever module raised it.
//
// Deep-linking: only a notification whose relatedObjectType is
// 'approval_request' gets a "View request" action, into VP's own already-
// authorized Requests & Approvals detail screen (Phase 23) -- that screen
// performs its own real GET /approvals/:id authorization check
// independently, so tapping through here can never bypass it; every other
// notification type has no known-safe VP destination yet and is shown
// read-only, matching "never expose an unauthorized destination through a
// notification."

import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listNotifications, markNotificationRead, type NotificationRow } from '@/lib/vice-principal-notifications-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

type Tab = 'unread' | 'all';

export default function VicePrincipalNotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('unread');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['vp-notifications', 'list', tab],
    queryFn: () => listNotifications({ unreadOnly: tab === 'unread' }),
  });
  const notifications = listQuery.data?.data ?? [];
  const unreadCount = listQuery.data?.meta.unreadCount ?? 0;

  async function handlePress(notification: NotificationRow) {
    setExpandedId((current) => (current === notification.id ? null : notification.id));
    if (!notification.readAt) {
      try {
        await markNotificationRead(notification.id);
        queryClient.invalidateQueries({ queryKey: ['vp-notifications'] });
      } catch {
        // Non-fatal -- the notification is still readable even if the mark-read call fails.
      }
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={listQuery.isFetching} onRefresh={() => listQuery.refetch()} />}
      >
        <View style={styles.statusRow}>
          <Pressable onPress={() => setTab('unread')} style={[styles.statusChip, tab === 'unread' && styles.statusChipActive]}>
            <Text style={[styles.statusChipText, tab === 'unread' && styles.statusChipTextActive]}>Unread</Text>
          </Pressable>
          <Pressable onPress={() => setTab('all')} style={[styles.statusChip, tab === 'all' && styles.statusChipActive]}>
            <Text style={[styles.statusChipText, tab === 'all' && styles.statusChipTextActive]}>All</Text>
          </Pressable>
        </View>

        {listQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 16 }} />
        ) : listQuery.isError ? (
          <ErrorState
            message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load notifications.'}
            onRetry={() => listQuery.refetch()}
          />
        ) : notifications.length === 0 ? (
          <EmptyState message={tab === 'unread' ? 'No unread notifications.' : 'No notifications yet.'} />
        ) : (
          <View style={styles.list}>
            {notifications.map((notification, index) => {
              const expanded = expandedId === notification.id;
              const unread = !notification.readAt;
              return (
                <Pressable
                  key={notification.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => handlePress(notification)}
                >
                  <View style={styles.rowHeader}>
                    {unread ? <View style={styles.unreadDot} /> : null}
                    <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={expanded ? undefined : 1}>
                      {notification.title}
                    </Text>
                    {notification.isEmergency ? <StatusBadge label="Emergency" tone="negative" /> : null}
                  </View>
                  <Text style={styles.rowBody} numberOfLines={expanded ? undefined : 2}>
                    {notification.body}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {humanize(notification.notificationType)} · {formatDateTime(notification.createdAt)}
                  </Text>
                  {expanded && notification.relatedObjectType === 'approval_request' && notification.relatedObjectId ? (
                    <Pressable
                      style={styles.viewButton}
                      onPress={() =>
                        router.push(`/(protected)/vice-principal/requests-approvals/${notification.relatedObjectId}` as never)
                      }
                    >
                      <Text style={styles.viewButtonText}>View request</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  statusChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  statusChipTextActive: { color: '#fff' },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: parentColors.borderSoft, gap: 3 },
  rowFirst: { borderTopWidth: 0 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: parentColors.blue },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink, flexShrink: 1 },
  rowTitleUnread: { fontFamily: 'PlusJakartaSans_800ExtraBold' },
  rowBody: { fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.muted, lineHeight: 18 },
  rowMeta: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.mutedLight, marginTop: 2 },
  viewButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: parentColors.blue,
  },
  viewButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
});
