// Principal -> Driver detail -- view-only, real backend data only. No
// edit/delete actions -- drivers.controller.ts grants PRINCIPAL list/get
// only (identical to VICE_PRINCIPAL's own grant, confirmed by direct backend
// audit); every write method stays ADMIN-only, enforced server-side. Drivers
// remain plain transport master records, never application users.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getDriver, listAssignments, listRoutes, listVehicles } from '@/lib/principal-transport-api';

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
  if (['ACTIVE', 'AVAILABLE'].includes(status)) return 'positive';
  if (['INACTIVE', 'SUSPENDED', 'EXPIRED'].includes(status)) return 'negative';
  return 'warning';
}

export default function PrincipalDriverDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const driverQuery = useQuery({ queryKey: ['principal-transport', 'driver', id], queryFn: () => getDriver(id) });
  // No driverId filter exists on the backend (see api file's own comment) --
  // fetch every currently-active assignment and find this driver's own
  // client-side.
  const assignmentsQuery = useQuery({
    queryKey: ['principal-transport', 'current-assignments'],
    queryFn: () => listAssignments({ currentOnly: true }),
  });
  const routesQuery = useQuery({ queryKey: ['principal-transport', 'routes'], queryFn: listRoutes });
  const vehiclesQuery = useQuery({ queryKey: ['principal-transport', 'vehicles'], queryFn: listVehicles });

  if (driverQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Driver" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (driverQuery.isError || !driverQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Driver" onBack={() => router.back()} />
        <ErrorState
          message={driverQuery.error instanceof ApiError ? driverQuery.error.message : "Couldn't load this driver."}
          onRetry={() => driverQuery.refetch()}
        />
      </View>
    );
  }

  const driver = driverQuery.data;
  const assignment = assignmentsQuery.data?.find((a) => a.driverId === driver.id);
  const route = assignment ? routesQuery.data?.find((r) => r.id === assignment.routeId) : undefined;
  const vehicle = assignment ? vehiclesQuery.data?.find((v) => v.id === assignment.vehicleId) : undefined;

  return (
    <View style={styles.flex}>
      <AppHeader title={driver.fullName} subtitle={driver.phone ?? undefined} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>{driver.licenceNo}</Text>
          <StatusBadge label={humanize(driver.status)} tone={statusTone(driver.status)} />
        </View>

        <Text style={styles.sectionTitle}>Licence &amp; verification</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Licence expiry</Text>
            <Text style={styles.infoValue}>{formatDate(driver.licenceExpiry)}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Verification expiry</Text>
            <Text style={styles.infoValue}>{driver.verificationExpiry ? formatDate(driver.verificationExpiry) : '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Current assignment</Text>
        {assignmentsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginVertical: 12 }} />
        ) : !assignment ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>Not currently assigned to a route.</Text>
          </View>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Route</Text>
              <Text style={styles.infoValue}>{route?.name ?? '—'}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>{vehicle?.registrationNo ?? '—'}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  standaloneValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
});
