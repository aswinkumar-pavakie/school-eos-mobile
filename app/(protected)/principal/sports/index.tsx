// Principal -> Sports -- pixel-rebuilt from the design's own Sports
// "generic record list" screen: stat tiles + row list. Net-new screen: the
// real backend (sports-admin-overview.controller.ts, @Roles('ADMIN',
// 'PRINCIPAL')) already existed with no mobile screen consuming it -- see
// principal-sports-api.ts's own comment for the evidence.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { StatCards } from '@/components/principal/StatCards';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { principalColors } from '@/lib/theme';
import { getSportsOverview } from '@/lib/principal-sports-api';

function tournamentStateTone(state: string): StatusTone {
  if (state === 'ONGOING') return 'positive';
  if (state === 'CANCELLED') return 'negative';
  return 'neutral';
}

export default function PrincipalSportsScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['principal-sports', 'overview'], queryFn: getSportsOverview });
  const data = query.data;

  return (
    <View style={styles.flex}>
      <PrincipalHeader title="Sports" subtitle="Teams, tournaments and equipment" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginTop: 24 }} />
        ) : query.isError ? (
          <ErrorState
            message={query.error instanceof ApiError ? query.error.message : 'Unable to load sports oversight.'}
            onRetry={() => query.refetch()}
          />
        ) : data ? (
          <>
            <StatCards
              items={[
                { label: 'Teams', value: String(data.totals.teams) },
                { label: 'Ongoing tournaments', value: String(data.totals.ongoingTournaments) },
                { label: 'Upcoming fixtures', value: String(data.totals.upcomingFixtures) },
                {
                  label: 'Equipment issues',
                  value: String(data.totals.outstandingEquipmentIssues),
                  valueColor: data.totals.overdueEquipmentIssues > 0 ? principalColors.red : undefined,
                },
              ]}
            />

            <Text style={styles.sectionTitle}>Teams</Text>
            {data.teams.length === 0 ? (
              <EmptyState message="No sports teams registered yet." />
            ) : (
              <View style={styles.list}>
                {data.teams.map((team, index) => (
                  <View key={team.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {team.name}
                      </Text>
                      <Text style={styles.rowMeta}>{team.sportName}</Text>
                    </View>
                    <StatusBadge label={team.status} tone={team.status === 'ACTIVE' ? 'positive' : 'neutral'} />
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Tournaments</Text>
            {data.tournaments.length === 0 ? (
              <EmptyState message="No tournaments recorded yet." />
            ) : (
              <View style={styles.list}>
                {data.tournaments.map((t, index) => (
                  <View key={t.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {t.sportName} · {formatDate(t.startDate)} – {formatDate(t.endDate)}
                        {t.venue ? ` · ${t.venue}` : ''}
                      </Text>
                    </View>
                    <StatusBadge label={t.state} tone={tournamentStateTone(t.state)} />
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: principalColors.background },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 20, marginBottom: 10 },
  list: { backgroundColor: principalColors.surface, borderRadius: 14, paddingHorizontal: 14 },
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
  rowMeta: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted, marginTop: 2 },
});
