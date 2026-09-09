// Principal -> Finance -> Concession detail -- view-only, real backend data
// only (finance/concessions.controller.ts: @Roles('FINANCE', 'ADMIN',
// 'PRINCIPAL'), write methods narrowed to FINANCE/ADMIN only). Reached only
// as a "view underlying record" drill-through from a Requests & Approvals
// decision, matching Principal's own real web app -- not a standalone browse
// feature.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getConcession } from '@/lib/principal-finance-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function humanize(code: string): string {
  return code.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
}

function stateTone(state: string): StatusTone {
  if (state === 'APPROVED') return 'positive';
  if (state === 'REJECTED') return 'negative';
  return 'warning';
}

function paise(v: string | null): string {
  if (!v) return '—';
  return `₹${(Number(v) / 100).toLocaleString('en-IN')}`;
}

export default function PrincipalConcessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['principal-finance', 'concession', id], queryFn: () => getConcession(id) });

  if (query.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Concession" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Concession" onBack={() => router.back()} />
        <ErrorState
          message={query.error instanceof ApiError ? query.error.message : "Couldn't load this concession."}
          onRetry={() => query.refetch()}
        />
      </View>
    );
  }

  const c = query.data;

  return (
    <View style={styles.flex}>
      <AppHeader title="Concession" subtitle={c.studentDisplayName ?? undefined} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.heroValue}>{c.amountPaise ? paise(c.amountPaise) : `${c.percent}%`}</Text>
          <StatusBadge label={humanize(c.state)} tone={stateTone(c.state)} />
        </View>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student</Text>
            <Text style={styles.infoValue}>{c.studentDisplayName ?? '—'}{c.studentAdmissionNo ? ` (${c.studentAdmissionNo})` : ''}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValue}>{humanize(c.concessionType)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Raised</Text>
            <Text style={styles.infoValue}>{formatDate(c.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Reason</Text>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.body}>{c.reason}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 },
  heroValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 20 },
});
