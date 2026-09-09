// Principal -> Vehicle detail -- view-only, real backend data only. No
// edit/delete/document/maintenance actions -- vehicles.controller.ts grants
// PRINCIPAL list/get only (identical to VICE_PRINCIPAL's own grant,
// confirmed by direct backend audit); every write method, plus the
// documents/maintenance sub-resources, stay ADMIN-only, enforced
// server-side.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getVehicle, listAssignments, listDrivers, listRoutes } from '@/lib/principal-transport-api';

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

export default function PrincipalVehicleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const vehicleQuery = useQuery({ queryKey: ['principal-transport', 'vehicle', id], queryFn: () => getVehicle(id) });
  const assignmentQuery = useQuery({
    queryKey: ['principal-transport', 'vehicle-assignment', id],
    queryFn: () => listAssignments({ vehicleId: id, currentOnly: true }),
  });
  const routesQuery = useQuery({ queryKey: ['principal-transport', 'routes'], queryFn: listRoutes });
  const driversQuery = useQuery({ queryKey: ['principal-transport', 'drivers'], queryFn: listDrivers });

  if (vehicleQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Vehicle" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (vehicleQuery.isError || !vehicleQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Vehicle" onBack={() => router.back()} />
        <ErrorState
          message={vehicleQuery.error instanceof ApiError ? vehicleQuery.error.message : "Couldn't load this vehicle."}
          onRetry={() => vehicleQuery.refetch()}
        />
      </View>
    );
  }

  const vehicle = vehicleQuery.data;
  const assignment = assignmentQuery.data?.[0];
  const route = assignment ? routesQuery.data?.find((r) => r.id === assignment.routeId) : undefined;
  const driver = assignment?.driverId ? driversQuery.data?.find((d) => d.id === assignment.driverId) : undefined;

  return (
    <View style={styles.flex}>
      <AppHeader title={vehicle.registrationNo} subtitle={vehicle.model ?? undefined} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>{vehicle.capacity} seats</Text>
          <StatusBadge label={humanize(vehicle.operationalStatus)} tone={statusTone(vehicle.operationalStatus)} />
        </View>

        <Text style={styles.sectionTitle}>Vehicle information</Text>
        <View style={[styles.listCard, cardShadow]}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Registration</Text>
            <Text style={styles.infoValue}>{vehicle.registrationNo}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Model</Text>
            <Text style={styles.infoValue}>{vehicle.model ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>Ownership</Text>
            <Text style={styles.infoValue}>{vehicle.ownership ? humanize(vehicle.ownership) : '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Current assignment</Text>
        {assignmentQuery.isLoading ? (
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
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{driver?.fullName ?? 'Unassigned'}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Effective from</Text>
              <Text style={styles.infoValue}>{formatDate(assignment.effectiveFrom)}</Text>
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
