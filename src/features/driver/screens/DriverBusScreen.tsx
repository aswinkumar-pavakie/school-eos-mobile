// Driver -- My Bus. Real vehicle/route/attendant info for the driver's own
// current assignment, same real tables the Parent app's own bus screen
// reads (registration_no/model/capacity, route name/code, attendant
// contact) -- see GET /driver/my-bus. Read-only, no design file yet, so
// styled consistently with the other driver screens rather than inventing a
// new pattern.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { GradientHeader } from '@/components/GradientHeader';
import { ErrorState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { getMyBus } from '@/lib/driver-api';
import { parentColors, cardShadow } from '@/lib/theme';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function DriverBusScreen() {
  const router = useRouter();
  const busQuery = useQuery({ queryKey: ['driver', 'my-bus'], queryFn: getMyBus });

  // Reached either via router.push (Home's menu tile/dashboard card -- has a
  // real back-stack entry) or router.replace (the bottom tab bar -- no
  // back-stack entry at all, so a plain router.back() silently does nothing).
  // canGoBack() picks the right one either way.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }

  return (
    <View style={styles.flex}>
      <GradientHeader title="My Bus" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {busQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : busQuery.isError ? (
          <ErrorState
            message={busQuery.error instanceof ApiError ? busQuery.error.message : 'Unable to load your bus.'}
            onRetry={() => busQuery.refetch()}
          />
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.cardTitle}>Vehicle</Text>
              <InfoRow label="Registration" value={busQuery.data!.registrationNo} />
              <InfoRow label="Model" value={busQuery.data!.model ?? '—'} />
              <InfoRow label="Capacity" value={busQuery.data!.capacity != null ? `${busQuery.data!.capacity} seats` : '—'} />
            </View>

            <View style={[styles.card, cardShadow]}>
              <Text style={styles.cardTitle}>Route</Text>
              <InfoRow label="Route" value={busQuery.data!.routeName} />
              {busQuery.data!.routeCode ? <InfoRow label="Code" value={busQuery.data!.routeCode} /> : null}
            </View>

            <View style={[styles.card, cardShadow]}>
              <Text style={styles.cardTitle}>Attendant</Text>
              {busQuery.data!.attendantName ? (
                <>
                  <InfoRow label="Name" value={busQuery.data!.attendantName} />
                  <InfoRow label="Phone" value={busQuery.data!.attendantPhone ?? '—'} />
                </>
              ) : (
                <Text style={styles.emptyText}>No attendant assigned to this bus.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 4 },
  cardTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 15, color: parentColors.ink, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, color: parentColors.muted },
  infoValue: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, color: parentColors.ink },
  emptyText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13, color: parentColors.muted },
});
