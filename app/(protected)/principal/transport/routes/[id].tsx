// Principal -> Route detail -- view-only, real backend data only. No
// edit/delete/stop-management actions -- routes.controller.ts grants
// PRINCIPAL list/get/listStops/listAssignedStudents (identical to
// VICE_PRINCIPAL's own grant, confirmed by direct backend audit, and this
// exact screen shape matches Principal's own real web page); every write
// method stays ADMIN-only, enforced server-side.
//
// "Assigned students" is real student-transport ASSIGNMENT data (which
// student rides which stop) -- not live NFC boarding events, which don't
// exist anywhere in this backend (see the api file's own comment). feeSlab
// on each row is deliberately never rendered here (financial data, out of
// scope).

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PrincipalHeader } from '@/components/principal/PrincipalHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { principalColors } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import {
  computeMileage,
  getAttendant,
  getGpsStatus,
  getRoute,
  getVehicleSpec,
  listAssignments,
  listDriverDocuments,
  listDrivers,
  listFuelLog,
  listMaintenance,
  listRouteAssignedStudents,
  listRouteStops,
  listVehicleDocuments,
  listVehicles,
} from '@/lib/principal-transport-api';

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
  if (['INACTIVE', 'SUSPENDED', 'EXPIRED', 'REMOVED'].includes(status)) return 'negative';
  return 'warning';
}

export default function PrincipalRouteDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const routeQuery = useQuery({ queryKey: ['principal-transport', 'route', id], queryFn: () => getRoute(id) });
  const stopsQuery = useQuery({ queryKey: ['principal-transport', 'route-stops', id], queryFn: () => listRouteStops(id) });
  const studentsQuery = useQuery({
    queryKey: ['principal-transport', 'route-students', id],
    queryFn: () => listRouteAssignedStudents(id),
  });
  const assignmentQuery = useQuery({
    queryKey: ['principal-transport', 'route-assignment', id],
    queryFn: () => listAssignments({ routeId: id, currentOnly: true }),
  });
  const vehiclesQuery = useQuery({ queryKey: ['principal-transport', 'vehicles'], queryFn: listVehicles });
  const driversQuery = useQuery({ queryKey: ['principal-transport', 'drivers'], queryFn: listDrivers });
  const assignment0 = assignmentQuery.data?.[0];
  const vehicleId = assignment0?.vehicleId;
  const specQuery = useQuery({ queryKey: ['principal-transport', 'vehicle-spec', vehicleId], queryFn: () => getVehicleSpec(vehicleId!), enabled: !!vehicleId });
  const gpsQuery = useQuery({ queryKey: ['principal-transport', 'gps', vehicleId], queryFn: () => getGpsStatus(vehicleId!), enabled: !!vehicleId });
  const vehicleDocsQuery = useQuery({ queryKey: ['principal-transport', 'vehicle-docs', vehicleId], queryFn: () => listVehicleDocuments(vehicleId!), enabled: !!vehicleId });
  const driverDocsQuery = useQuery({
    queryKey: ['principal-transport', 'driver-docs', assignment0?.driverId],
    queryFn: () => listDriverDocuments(assignment0!.driverId!),
    enabled: !!assignment0?.driverId,
  });
  const maintenanceQuery = useQuery({ queryKey: ['principal-transport', 'maintenance', vehicleId], queryFn: () => listMaintenance(vehicleId!), enabled: !!vehicleId });
  const fuelLogQuery = useQuery({ queryKey: ['principal-transport', 'fuel-log', vehicleId], queryFn: () => listFuelLog(vehicleId!), enabled: !!vehicleId });
  const attendantQuery = useQuery({
    queryKey: ['principal-transport', 'attendant', assignment0?.attendantId],
    queryFn: () => getAttendant(assignment0!.attendantId!),
    enabled: !!assignment0?.attendantId,
  });

  if (routeQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <PrincipalHeader title="Route" onBack={() => router.back()} />
        <ActivityIndicator color={principalColors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (routeQuery.isError || !routeQuery.data) {
    return (
      <View style={styles.flex}>
        <PrincipalHeader title="Route" onBack={() => router.back()} />
        <ErrorState
          message={routeQuery.error instanceof ApiError ? routeQuery.error.message : "Couldn't load this route."}
          onRetry={() => routeQuery.refetch()}
        />
      </View>
    );
  }

  const route = routeQuery.data;
  const stops = (stopsQuery.data ?? []).slice().sort((a, b) => a.sequenceNo - b.sequenceNo);
  const students = studentsQuery.data ?? [];
  const assignment = assignmentQuery.data?.[0];
  const vehicle = assignment ? vehiclesQuery.data?.find((v) => v.id === assignment.vehicleId) : undefined;
  const driver = assignment?.driverId ? driversQuery.data?.find((d) => d.id === assignment.driverId) : undefined;
  const docs = [
    ...(vehicleDocsQuery.data ?? []).map((d) => ({ ...d, source: 'Vehicle' as const })),
    ...(driverDocsQuery.data ?? []).map((d) => ({ ...d, source: 'Driver' as const })),
  ];
  const maintenance = maintenanceQuery.data ?? [];
  const latestService = maintenance.length > 0 ? [...maintenance].sort((a, b) => (a.performedOn > b.performedOn ? -1 : 1))[0] : null;
  const mileage = computeMileage(fuelLogQuery.data ?? []);
  const gpsLabel = gpsQuery.data ? `${gpsQuery.data.deviceUid} · ${gpsQuery.data.status === 'ACTIVE' ? 'online' : 'offline'}` : null;

  return (
    <View style={styles.flex}>
      <PrincipalHeader title={route.name} subtitle={route.code ?? undefined} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <Text style={styles.infoValue}>
            {humanize(route.direction)}
            {route.distanceKm ? ` · ${route.distanceKm} km` : ''}
          </Text>
          <StatusBadge label={humanize(route.status)} tone={statusTone(route.status)} />
        </View>

        <Text style={styles.sectionTitle}>Current vehicle &amp; driver</Text>
        {assignmentQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginVertical: 12 }} />
        ) : !assignment ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.standaloneValue}>No vehicle currently assigned to this route.</Text>
          </View>
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>{vehicle?.registrationNo ?? '—'}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>Driver</Text>
              <Text style={styles.infoValue}>{driver?.fullName ?? 'Unassigned'}</Text>
            </View>
            {assignment0?.attendantId ? (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Attendant</Text>
                <Text style={styles.infoValue}>{attendantQuery.data?.fullName ?? '—'}</Text>
              </View>
            ) : null}
            {gpsLabel ? (
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>GPS</Text>
                <Text style={styles.infoValue}>{gpsLabel}</Text>
              </View>
            ) : null}
          </View>
        )}

        {assignment && specQuery.data ? (
          <>
            <Text style={styles.sectionTitle}>Vehicle spec</Text>
            <View style={[styles.listCard, cardShadow]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Manufacturer</Text>
                <Text style={styles.infoValue}>{specQuery.data.manufacturer ?? '—'}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Fuel type</Text>
                <Text style={styles.infoValue}>{specQuery.data.fuelType ?? '—'}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Safety &amp; fitment</Text>
                <Text style={styles.infoValue}>
                  {[specQuery.data.hasCctv && 'CCTV', specQuery.data.hasGps && 'GPS', specQuery.data.hasFireExtinguisher && 'Fire ext.', specQuery.data.hasFirstAidKit && 'First aid']
                    .filter(Boolean)
                    .join(', ') || 'Not recorded'}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {assignment ? (
          <>
            <Text style={styles.sectionTitle}>Maintenance &amp; mileage</Text>
            <View style={[styles.listCard, cardShadow]}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last service</Text>
                <Text style={styles.infoValue}>{latestService ? formatDate(latestService.performedOn) : 'Not recorded'}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Odometer at last service</Text>
                <Text style={styles.infoValue}>{latestService?.odometerKm != null ? `${latestService.odometerKm} km` : '—'}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Mileage</Text>
                <Text style={styles.infoValue}>{mileage != null ? `${mileage.toFixed(1)} km/l` : '—'}</Text>
              </View>
            </View>
          </>
        ) : null}

        {assignment && docs.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Documents</Text>
            <View style={[styles.listCard, cardShadow]}>
              {docs.map((d, index) => (
                <View key={d.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.infoValue} numberOfLines={1}>{d.source} · {humanize(d.docType)}</Text>
                    <Text style={styles.infoLabel} numberOfLines={1}>{d.docNo ?? '—'}</Text>
                  </View>
                  <StatusBadge label={`Valid to ${formatDate(d.validTo)}`} tone={new Date(d.validTo).getTime() < Date.now() ? 'negative' : 'neutral'} />
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Stops</Text>
        {stopsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginVertical: 12 }} />
        ) : stops.length === 0 ? (
          <EmptyState message="No stops on record for this route." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {stops.map((stop, index) => (
              <View key={stop.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <Text style={styles.infoValue}>
                  {stop.sequenceNo}. {stop.stopName}
                </Text>
                <Text style={styles.infoLabel}>{stop.scheduledTime?.slice(0, 5) ?? '—'}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Assigned students ({students.length})</Text>
        {studentsQuery.isLoading ? (
          <ActivityIndicator color={principalColors.primary} style={{ marginVertical: 12 }} />
        ) : students.length === 0 ? (
          <EmptyState message="No students assigned to this route." />
        ) : (
          <View style={[styles.listCard, cardShadow]}>
            {students.map((student, index) => (
              <View key={student.id} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {student.studentFirstName} {student.studentLastName ?? ''}
                  </Text>
                  <Text style={styles.infoLabel} numberOfLines={1}>
                    {student.admissionNo} · {student.stopName} · {humanize(student.direction)}
                  </Text>
                </View>
                <StatusBadge label={humanize(student.status)} tone={statusTone(student.status)} />
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: principalColors.ink, marginTop: 18, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  listCard: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  infoRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: principalColors.borderSoft },
  infoLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: principalColors.muted },
  infoValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
  standaloneValue: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: principalColors.ink },
});
