// Principal -> Transport -- school-level operational oversight, real backend
// data only. Vehicles/Routes/Drivers all confirmed identical class/method-
// level access for PRINCIPAL as VICE_PRINCIPAL by direct backend audit --
// see each controller's own comment in principal-transport-api.ts. Guarded
// by the parent principal/_layout.tsx.

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SegmentedTabs } from '@/components/SegmentedTabs';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { listDrivers, listRoutes, listVehicles } from '@/lib/principal-transport-api';

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

export default function PrincipalTransportScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'vehicles' | 'routes' | 'drivers'>('vehicles');

  const vehiclesQuery = useQuery({ queryKey: ['principal-transport', 'vehicles'], queryFn: listVehicles });
  const routesQuery = useQuery({ queryKey: ['principal-transport', 'routes'], queryFn: listRoutes });
  const driversQuery = useQuery({ queryKey: ['principal-transport', 'drivers'], queryFn: listDrivers });

  return (
    <View style={styles.flex}>
      <AppHeader title="Transport" subtitle="School transport operations" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{vehiclesQuery.data?.length ?? '—'}</Text>
            <Text style={styles.statLabel}>Vehicles</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{routesQuery.data?.length ?? '—'}</Text>
            <Text style={styles.statLabel}>Routes</Text>
          </View>
          <View style={[styles.statTile, cardShadow]}>
            <Text style={styles.statValue}>{driversQuery.data?.length ?? '—'}</Text>
            <Text style={styles.statLabel}>Drivers</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <SegmentedTabs
            tabs={[
              { key: 'vehicles', label: 'Vehicles' },
              { key: 'routes', label: 'Routes' },
              { key: 'drivers', label: 'Drivers' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          {tab === 'vehicles' ? (
            <ListSection
              query={vehiclesQuery}
              emptyMessage="No vehicles on record."
              renderRow={(vehicle) => ({
                key: vehicle.id,
                title: vehicle.registrationNo,
                meta: [vehicle.model, `${vehicle.capacity} seats`].filter(Boolean).join(' · '),
                badge: { label: humanize(vehicle.operationalStatus), tone: statusTone(vehicle.operationalStatus) },
                onPress: () => router.push(`/(protected)/principal/transport/vehicles/${vehicle.id}` as never),
              })}
            />
          ) : tab === 'routes' ? (
            <ListSection
              query={routesQuery}
              emptyMessage="No routes on record."
              renderRow={(route) => ({
                key: route.id,
                title: route.name,
                meta: [route.code, humanize(route.direction)].filter(Boolean).join(' · '),
                badge: { label: humanize(route.status), tone: statusTone(route.status) },
                onPress: () => router.push(`/(protected)/principal/transport/routes/${route.id}` as never),
              })}
            />
          ) : (
            <ListSection
              query={driversQuery}
              emptyMessage="No drivers on record."
              renderRow={(driver) => ({
                key: driver.id,
                title: driver.fullName,
                meta: driver.phone ?? driver.licenceNo,
                badge: { label: humanize(driver.status), tone: statusTone(driver.status) },
                onPress: () => router.push(`/(protected)/principal/transport/drivers/${driver.id}` as never),
              })}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

interface RowSpec {
  key: string;
  title: string;
  meta: string;
  badge: { label: string; tone: StatusTone };
  onPress: () => void;
}

function ListSection<T>({
  query,
  emptyMessage,
  renderRow,
}: {
  query: { data?: T[]; isLoading: boolean; isError: boolean; error: unknown; refetch: () => void };
  emptyMessage: string;
  renderRow: (item: T) => RowSpec;
}) {
  if (query.isLoading) {
    return <ActivityIndicator color={parentColors.blue} style={{ marginTop: 12 }} />;
  }
  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof ApiError ? query.error.message : 'Unable to load this list.'}
        onRetry={() => query.refetch()}
      />
    );
  }
  const items = query.data ?? [];
  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const row = renderRow(item);
        return (
          <Pressable key={row.key} style={[styles.row, index === 0 && styles.rowFirst]} onPress={row.onPress}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {row.title}
              </Text>
              {row.meta ? (
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {row.meta}
                </Text>
              ) : null}
            </View>
            <StatusBadge {...row.badge} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  statLabel: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
