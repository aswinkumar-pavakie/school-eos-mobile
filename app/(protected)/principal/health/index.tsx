// Principal -> Health & Infirmary -- full feature parity with the website's
// own /principal/health page, previously mobile-missing entirely. Read-only
// oversight, real data throughout (see principal-health-api.ts's own
// comment for why there are no create/acknowledge controls here).

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { principalColors } from '@/lib/theme';
import { listHealthAlerts, listInfirmaryVisits, listMedicalEscalations } from '@/lib/principal-health-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

const ACTIONS = ['REST', 'MEDICATION', 'NO_ACTION', 'SENT_HOME', 'SICKBAY_ADMIT', 'REFERRED'];
const ACTION_TONE: Record<string, StatusTone> = {
  REST: 'positive',
  MEDICATION: 'positive',
  NO_ACTION: 'positive',
  SENT_HOME: 'warning',
  SICKBAY_ADMIT: 'warning',
  REFERRED: 'negative',
};

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PrincipalHealthScreen() {
  const router = useRouter();
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  const visitsQuery = useQuery({ queryKey: ['principal-health', 'visits', actionFilter], queryFn: () => listInfirmaryVisits({ action: actionFilter ?? undefined }) });
  const alertsQuery = useQuery({ queryKey: ['principal-health', 'alerts'], queryFn: listHealthAlerts });
  const escalationsQuery = useQuery({ queryKey: ['principal-health', 'escalations'], queryFn: listMedicalEscalations });

  const visits = visitsQuery.data ?? [];
  const alerts = alertsQuery.data ?? [];
  const escalations = escalationsQuery.data ?? [];
  const openAlerts = useMemo(() => alerts.filter((a) => !a.acknowledgedAt), [alerts]);
  const sentHomeOrReferred = useMemo(() => visits.filter((v) => v.action === 'SENT_HOME' || v.action === 'REFERRED').length, [visits]);

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="Health &amp; Infirmary" subtitle="Read-only oversight" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{visits.length}</Text>
            <Text style={styles.statLabel}>Infirmary visits</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{openAlerts.length}</Text>
            <Text style={styles.statLabel}>Open alerts</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{sentHomeOrReferred}</Text>
            <Text style={styles.statLabel}>Sent home / referred</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{escalations.length}</Text>
            <Text style={styles.statLabel}>Escalations logged</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Infirmary visits</Text>
        <View style={styles.pillRow}>
          <Pressable onPress={() => setActionFilter(null)} style={[styles.pillChip, actionFilter === null && styles.pillChipActive]}>
            <Text style={[styles.pillChipText, actionFilter === null && styles.pillChipTextActive]}>All outcomes</Text>
          </Pressable>
          {ACTIONS.map((a) => (
            <Pressable key={a} onPress={() => setActionFilter(a)} style={[styles.pillChip, actionFilter === a && styles.pillChipActive]}>
              <Text style={[styles.pillChipText, actionFilter === a && styles.pillChipTextActive]}>{humanize(a)}</Text>
            </Pressable>
          ))}
        </View>
        {visitsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : visitsQuery.isError ? (
          <ErrorState message={visitsQuery.error instanceof ApiError ? visitsQuery.error.message : 'Unable to load infirmary visits.'} onRetry={() => visitsQuery.refetch()} />
        ) : visits.length === 0 ? (
          <EmptyState message="No infirmary visits match this filter." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {visits.map((v, index) => (
              <View key={v.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{v.studentFirstName} {v.studentLastName ?? ''}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {v.admissionNo}{v.isHosteller ? ' · Hosteller' : ''}
                    {v.gradeName ? ` · ${v.gradeName}${v.sectionName ? '-' + v.sectionName : ''}` : ''}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>{v.complaint} · {formatDateTime(v.visitedAt)}</Text>
                </View>
                <StatusBadge label={humanize(v.action)} tone={ACTION_TONE[v.action] ?? 'warning'} />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Health alerts</Text>
        {alertsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : alerts.length === 0 ? (
          <EmptyState message="No health alerts on file." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {alerts.map((a, index) => (
              <View key={a.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{humanize(a.alertType)}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {a.studentFirstName ? `${a.studentFirstName} ${a.studentLastName ?? ''}` : 'School-wide'} · {formatDateTime(a.detectedAt)}
                  </Text>
                </View>
                <StatusBadge
                  label={a.acknowledgedAt ? `Acknowledged${a.acknowledgedByFirstName ? ` by ${a.acknowledgedByFirstName}` : ''}` : 'Open'}
                  tone={a.acknowledgedAt ? 'positive' : 'negative'}
                />
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Medical escalations</Text>
        {escalationsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 12 }} />
        ) : escalations.length === 0 ? (
          <EmptyState message="No escalations on file." />
        ) : (
          <View style={[styles.list, cardShadow]}>
            {escalations.map((e, index) => (
              <View key={e.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{e.studentFirstName} {e.studentLastName ?? ''} · Step {e.sequenceNo}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {e.contactedName ?? '—'}{e.channel ? ` · ${humanize(e.channel)}` : ''} · {formatDateTime(e.contactedAt)}
                  </Text>
                </View>
                <Text style={styles.rowMeta}>{e.outcome ?? '—'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink },
  statLabel: { fontSize: 10.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 18, marginBottom: 10 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pillChip: { borderWidth: 1, borderColor: principalColors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  pillChipActive: { backgroundColor: principalColors.primary, borderColor: principalColors.primary },
  pillChipText: { fontSize: 11.5, color: principalColors.ink, fontFamily: 'PlusJakartaSans_600SemiBold' },
  pillChipTextActive: { color: '#fff' },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: principalColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 2 },
});
