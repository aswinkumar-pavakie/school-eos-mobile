// Principal -> Audit Log -- audit-log.controller.ts: @Roles('ADMIN', 'PRINCIPAL')
// with NO VICE_PRINCIPAL grant at all (confirmed by direct backend audit) --
// this is the single starkest Principal/VP gap in the whole module set (VP
// has zero capability here, per this session's own earlier conclusion).
// Reuses the existing, unmodified audit system -- no parallel audit service,
// records are immutable (read-only, no write endpoint on this controller at
// all). Guarded by the parent principal/_layout.tsx.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listAuditLog } from '@/lib/principal-audit-api';

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function outcomeTone(outcome: string): StatusTone {
  if (outcome === 'SUCCESS') return 'positive';
  if (outcome === 'DENIED' || outcome === 'ERROR') return 'negative';
  return 'neutral';
}

export default function PrincipalAuditLogScreen() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['principal-audit', 'list', page],
    queryFn: () => listAuditLog({ page, limit: 30 }),
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <View style={styles.flex}>
      <AppHeader title="Audit Log" subtitle="Every consequential action, immutable" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : 'Unable to load the audit log.'}
            onRetry={() => query.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState message="No audit records found." />
        ) : (
          <>
            <View style={styles.list}>
              {rows.map((row, index) => {
                const expanded = expandedId === row.id;
                return (
                  <Pressable
                    key={row.id}
                    style={[styles.row, index === 0 && styles.rowFirst]}
                    onPress={() => setExpandedId((cur) => (cur === row.id ? null : row.id))}
                  >
                    <View style={styles.rowHeader}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {humanize(row.action)}
                      </Text>
                      <StatusBadge label={humanize(row.outcome)} tone={outcomeTone(row.outcome)} />
                    </View>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {row.actorName ?? 'System'}{row.actorRoleCode ? ` (${humanize(row.actorRoleCode)})` : ''}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {humanize(row.objectType)}
                      {row.objectId ? ` · ${row.objectId.slice(0, 8)}…` : ''} · {formatDateTime(row.occurredAt)}
                    </Text>
                    {expanded ? (
                      <View style={styles.diffBlock}>
                        {row.beforeData != null ? (
                          <Text style={styles.diffText}>Before: {JSON.stringify(row.beforeData, null, 2)}</Text>
                        ) : null}
                        {row.afterData != null ? (
                          <Text style={styles.diffText}>After: {JSON.stringify(row.afterData, null, 2)}</Text>
                        ) : null}
                        {row.beforeData == null && row.afterData == null ? (
                          <Text style={styles.diffText}>No before/after data recorded.</Text>
                        ) : null}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {meta && meta.total > rows.length + (page - 1) * meta.limit ? (
              <Pressable style={styles.loadMoreButton} onPress={() => setPage((p) => p + 1)}>
                <Text style={styles.loadMoreText}>Load more</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: parentColors.borderSoft, gap: 3 },
  rowFirst: { borderTopWidth: 0 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, flexShrink: 1 },
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  diffBlock: { marginTop: 8, backgroundColor: parentColors.background, borderRadius: 10, padding: 10 },
  diffText: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, marginBottom: 6 },
  loadMoreButton: { marginTop: 14, alignItems: 'center', paddingVertical: 12 },
  loadMoreText: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blue },
});
