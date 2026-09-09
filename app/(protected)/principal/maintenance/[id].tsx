// Principal -> Repair & Maintenance request detail --
// view-only, real backend data only. No assign/start/complete/cancel actions
// -- repair-requests.controller.ts only grants PRINCIPAL list/overview/get
// (identical to VICE_PRINCIPAL's own grant); every write method stays
// ADMIN-only, enforced server-side. costPaise is deliberately never rendered
// (financial data, out of scope).
//
// If this request references a real inventory item, that link is shown and
// tapping it opens the existing Principal Inventory item-detail screen
// -- this surfaces the real Inventory -> Maintenance relationship
// without rebuilding or duplicating Inventory's own logic.

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getRepairRequest } from '@/lib/principal-maintenance-api';

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

function statusTone(status: string): StatusTone {
  if (status === 'COMPLETED') return 'positive';
  if (status === 'CANCELLED') return 'negative';
  if (status === 'IN_PROGRESS') return 'warning';
  return 'neutral';
}

export default function PrincipalMaintenanceDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const requestQuery = useQuery({ queryKey: ['principal-maintenance', 'request', id], queryFn: () => getRepairRequest(id) });

  if (requestQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Request" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (requestQuery.isError || !requestQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Request" onBack={() => router.back()} />
        <ErrorState
          message={requestQuery.error instanceof ApiError ? requestQuery.error.message : "Couldn't load this request."}
          onRetry={() => requestQuery.refetch()}
        />
      </View>
    );
  }

  const request = requestQuery.data;

  return (
    <View style={styles.flex}>
      <AppHeader title={request.title} subtitle={humanize(request.issueType)} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>{request.location ?? 'No location noted'}</Text>
          <StatusBadge label={humanize(request.status)} tone={statusTone(request.status)} />
        </View>

        <Text style={styles.sectionTitle}>Request information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Priority</Text>
            <Text style={[styles.infoValue, (request.priority === 'URGENT' || request.priority === 'HIGH') && styles.infoValueWarning]}>
              {humanize(request.priority)}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Requested on</Text>
            <Text style={styles.infoValue}>{formatDateTime(request.requestedOn)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Requested by</Text>
            <Text style={styles.infoValue}>{request.requestedByName ?? '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.body}>{request.description}</Text>
        </View>

        {request.inventoryItemId ? (
          <>
            <Text style={styles.sectionTitle}>Linked inventory item</Text>
            <Pressable
              style={[styles.card, cardShadow, styles.linkRow]}
              onPress={() => router.push(`/(protected)/principal/inventory/${request.inventoryItemId}` as never)}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {request.inventoryItemName ?? 'View item'}
                </Text>
                {request.inventoryItemAssetCode ? (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {request.inventoryItemAssetCode}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={parentColors.muted} />
            </Pressable>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Assignment & completion</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned to</Text>
            <Text style={styles.infoValue}>{request.assignedToName ?? 'Not assigned'}</Text>
          </View>
          {request.assignedOn ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Assigned on</Text>
              <Text style={styles.infoValue}>{formatDateTime(request.assignedOn)}</Text>
            </View>
          ) : null}
          {request.completedOn ? (
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Completed on</Text>
              <Text style={styles.infoValue}>{formatDateTime(request.completedOn)}</Text>
            </View>
          ) : null}
        </View>

        {request.repairAction || request.completionNotes ? (
          <>
            <Text style={styles.sectionTitle}>Repair notes</Text>
            <View style={[styles.card, cardShadow, { gap: 10 }]}>
              {request.repairAction ? (
                <View>
                  <Text style={styles.infoLabel}>Action taken</Text>
                  <Text style={styles.body}>{request.repairAction}</Text>
                </View>
              ) : null}
              {request.completionNotes ? (
                <View>
                  <Text style={styles.infoLabel}>Completion notes</Text>
                  <Text style={styles.body}>{request.completionNotes}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  infoValueWarning: { color: '#B77A0A' },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 20, marginTop: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
