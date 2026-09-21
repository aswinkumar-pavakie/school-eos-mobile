// Sports Admin -> Bus. Real backend call, same shared /faculty/bus endpoint
// Faculty's own Bus screen uses (now also SPORTS_ADMIN-authorized -- see
// faculty-bus.controller.ts's own comment): "am I personally a driver or
// attendant on any route today." Display only, no GPS/live location (same
// explicit instruction as Faculty's own screen). Was previously routed to
// an honest "not available" stub since the backend had no access for this
// role at all -- now real.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SportsSubHeader } from '@/components/sports/primitives';
import { getMyBusAssignment } from '@/lib/faculty-bus-api';
import { sportsColors } from '@/lib/theme';

export function SportsBusScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['sports-bus'], queryFn: getMyBusAssignment });

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="Bus" onBack={() => router.replace('/' as never)} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={sportsColors.primary} style={{ marginTop: 24 }} />
        ) : !query.data ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>You are not currently assigned to any bus route.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleName}>{query.data.registrationNo}</Text>
                  <Text style={styles.vehicleMeta}>{query.data.model ?? 'Vehicle'} · Capacity {query.data.capacity}</Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{query.data.role === 'DRIVER' ? 'Driver' : 'Attendant'}</Text>
                </View>
              </View>
              <View style={styles.routeRow}>
                <Text style={styles.routeLabel}>ROUTE</Text>
                <Text style={styles.routeName}>{query.data.routeName}{query.data.routeCode ? ` (${query.data.routeCode})` : ''}</Text>
                <Text style={styles.routeDirection}>{query.data.direction}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>STOPS</Text>
            <View style={{ gap: 8 }}>
              {query.data.stops.map((stop) => (
                <View key={stop.sequenceNo} style={styles.stopRow}>
                  <View style={styles.stopBadge}>
                    <Text style={styles.stopBadgeText}>{stop.sequenceNo}</Text>
                  </View>
                  <Text style={styles.stopName} numberOfLines={1}>{stop.stopName}</Text>
                  {stop.scheduledTime ? <Text style={styles.stopTime}>{stop.scheduledTime.slice(0, 5)}</Text> : null}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  emptyBox: { backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: sportsColors.border, borderRadius: 16, paddingVertical: 34, alignItems: 'center', marginTop: 16 },
  emptyText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: sportsColors.muted, textAlign: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: sportsColors.border, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  vehicleMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: sportsColors.muted, marginTop: 3 },
  roleBadge: { backgroundColor: sportsColors.tint, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  roleBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.accentDark },
  routeRow: { borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, marginTop: 13, paddingTop: 12 },
  routeLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.muted, letterSpacing: 1 },
  routeName: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.ink, marginTop: 4 },
  routeDirection: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: sportsColors.mutedStrong, marginTop: 3 },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: sportsColors.border, borderRadius: 12, padding: 11 },
  stopBadge: { width: 24, height: 24, borderRadius: 8, backgroundColor: sportsColors.tint, alignItems: 'center', justifyContent: 'center' },
  stopBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.accentDark },
  stopName: { flex: 1, fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: sportsColors.ink },
  stopTime: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.mutedStrong },
});
