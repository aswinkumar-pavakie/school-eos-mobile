// Bus -- real transport data, display only (no GPS/live location, per
// explicit instruction). An honest "not assigned" when this faculty member
// isn't currently a real driver/attendant on any route.

import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { getMyBusAssignment } from '@/lib/faculty-bus-api';
import { facultyColors, cardShadow } from '@/lib/theme';

export default function FacultyBusScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['faculty-bus'], queryFn: getMyBusAssignment });

  return (
    <View style={styles.flex}>
      <AppHeader title="Bus" subtitle="Your transport duty" onBack={() => router.replace('/' as never)} />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}>
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : !query.data ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>You are not currently assigned to any bus route.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.card, cardShadow]}>
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
  flex: { flex: 1, backgroundColor: facultyColors.background },
  content: { padding: 14, paddingBottom: 32, gap: 12 },
  emptyBox: { backgroundColor: facultyColors.surface, borderWidth: 1, borderStyle: 'dashed', borderColor: facultyColors.borderLight, borderRadius: 16, paddingVertical: 34, alignItems: 'center', marginTop: 16 },
  emptyText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, textAlign: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: facultyColors.surface, borderRadius: 16, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleName: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.ink },
  vehicleMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 3 },
  roleBadge: { backgroundColor: facultyColors.blueLight, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  roleBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  routeRow: { borderTopWidth: 1, borderTopColor: facultyColors.borderSoft, marginTop: 13, paddingTop: 12 },
  routeLabel: { fontSize: 10, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1 },
  routeName: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink, marginTop: 4 },
  routeDirection: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.mutedStrong, marginTop: 3 },
  sectionLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.muted, letterSpacing: 1.2, marginTop: 8, marginLeft: 4 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: facultyColors.surface, borderWidth: 1, borderColor: facultyColors.border, borderRadius: 12, padding: 11 },
  stopBadge: { width: 24, height: 24, borderRadius: 8, backgroundColor: facultyColors.blueLight, alignItems: 'center', justifyContent: 'center' },
  stopBadgeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_800ExtraBold', color: facultyColors.blueDark },
  stopName: { flex: 1, fontSize: 13.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.ink },
  stopTime: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.mutedStrong },
});
