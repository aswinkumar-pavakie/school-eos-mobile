// Role-branched: Faculty gets a real Bus screen (their own driver/attendant
// duty, if any); Parent gets its own real screen -- this student's own bus
// allocation, display only (no GPS/live status, per explicit instruction: the
// backend has one real scheduled_time per stop, not separate pickup/drop
// times, so no third "On time" column is rendered here).

import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Svg, { Path, Rect } from 'react-native-svg';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { useSelectedChild } from '@/hooks/useSelectedChild';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { ApiError } from '@/lib/api';
import { getBusAllocation, type BusAllocation } from '@/lib/parent-api';
import FacultyBusScreen from './faculty/bus';
import { cardShadow, parentColors } from '@/lib/theme';

function BusIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8}>
      <Rect x={4} y={5} width={16} height={11} rx={2} />
      <Path d="M4 11h16M7 20v-3M17 20v-3" />
    </Svg>
  );
}

function directionLabel(direction: string): string {
  if (direction === 'PICKUP') return 'Pickup time';
  if (direction === 'DROP') return 'Drop time';
  if (direction === 'BOTH') return 'Pickup & drop time';
  return direction;
}

function initialsFromFullName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

function BusDetail({ allocation }: { allocation: BusAllocation }) {
  const routeTitle = allocation.routeCode ? `Route ${allocation.routeCode} · ${allocation.routeName}` : allocation.routeName;
  const vehicleMeta = [allocation.registrationNo, allocation.stopName].filter(Boolean).join(' · ');

  return (
    <>
      <View style={[styles.routeCard, cardShadow]}>
        <View style={styles.routeTop}>
          <View style={styles.routeIconCircle}>
            <BusIcon />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.routeName} numberOfLines={1}>
              {routeTitle}
            </Text>
            <Text style={styles.routeMeta} numberOfLines={1}>
              {vehicleMeta || '—'}
            </Text>
          </View>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeValue}>{allocation.scheduledTime ? allocation.scheduledTime.slice(0, 5) : '—'}</Text>
          <Text style={styles.timeLabel}>{directionLabel(allocation.direction)}</Text>
        </View>
      </View>

      <View style={[styles.peopleCard, cardShadow]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{allocation.driverName ? initialsFromFullName(allocation.driverName) : '—'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.driverName} numberOfLines={1}>
            {allocation.driverName ? `${allocation.driverName} · Driver` : 'Driver not assigned'}
          </Text>
          <Pressable
            disabled={!allocation.attendantPhone}
            onPress={() => allocation.attendantPhone && Linking.openURL(`tel:${allocation.attendantPhone}`)}
          >
            <Text style={[styles.attendantName, allocation.attendantPhone && styles.attendantNameLink]} numberOfLines={1}>
              {allocation.attendantName ? `Attendant: ${allocation.attendantName}` : 'Attendant not assigned'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.callButton, !allocation.driverPhone && styles.callButtonDisabled]}
          disabled={!allocation.driverPhone}
          onPress={() => allocation.driverPhone && Linking.openURL(`tel:${allocation.driverPhone}`)}
        >
          <Text style={styles.callButtonText}>Call</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Morning stops</Text>
      <View style={{ gap: 8 }}>
        {allocation.stops.map((stop) => {
          const isMine = stop.stopName === allocation.stopName;
          return (
            <View key={`${stop.sequenceNo}-${stop.stopName}`} style={[styles.stopRow, isMine && styles.stopRowActive]}>
              <View style={[styles.stopDot, isMine && styles.stopDotActive]} />
              <Text style={[styles.stopName, isMine && styles.stopNameActive]} numberOfLines={1}>
                {stop.stopName}
              </Text>
              <Text style={[styles.stopTime, isMine && styles.stopTimeActive]}>
                {stop.scheduledTime ? stop.scheduledTime.slice(0, 5) : '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function ParentMyBusScreen() {
  const router = useRouter();
  const { selected, isLoading: childLoading } = useSelectedChild();
  const studentId = selected?.studentId;
  const busQuery = useQuery({
    queryKey: ['parent-bus', studentId],
    queryFn: () => getBusAllocation(studentId as string),
    enabled: !!studentId,
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="My Bus" onBack={() => router.replace('/')} />
      {childLoading || busQuery.isLoading ? (
        <View style={styles.body}>
          <ActivityIndicator color={parentColors.blue} />
        </View>
      ) : !studentId ? (
        <View style={styles.body}>
          <Text style={styles.text}>No child linked to your account.</Text>
        </View>
      ) : busQuery.isError ? (
        <ErrorState
          message={busQuery.error instanceof ApiError ? busQuery.error.message : 'Unable to load bus details.'}
          onRetry={() => busQuery.refetch()}
        />
      ) : !busQuery.data ? (
        <View style={styles.body}>
          <Text style={styles.text}>This student does not use school transport.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={busQuery.isFetching} onRefresh={() => busQuery.refetch()} />}
        >
          <BusDetail allocation={busQuery.data} />
        </ScrollView>
      )}
    </View>
  );
}

export default function MyBusRoute() {
  const { isFaculty, isLoading } = useCurrentRoles();
  if (isLoading) {
    return (
      <View style={[styles.flex, styles.body]}>
        <ActivityIndicator color={parentColors.blue} />
      </View>
    );
  }
  return isFaculty ? <FacultyBusScreen /> : <ParentMyBusScreen />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: parentColors.muted, textAlign: 'center', paddingHorizontal: 24 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  routeCard: { backgroundColor: parentColors.white, borderWidth: 1, borderColor: parentColors.border, borderRadius: 18, padding: 16 },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeIconCircle: { width: 44, height: 44, borderRadius: 13, backgroundColor: parentColors.blue, alignItems: 'center', justifyContent: 'center' },
  routeName: { fontSize: 16.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  routeMeta: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  timeRow: { borderTopWidth: 1, borderTopColor: parentColors.borderSoft, marginTop: 14, paddingTop: 14 },
  timeValue: { fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  timeLabel: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  peopleCard: {
    backgroundColor: parentColors.white,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: parentColors.dueBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.blueDeep },
  driverName: { fontSize: 15.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  attendantName: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  attendantNameLink: { color: parentColors.blueDeep, textDecorationLine: 'underline' },
  callButton: { backgroundColor: parentColors.blue, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
  callButtonDisabled: { backgroundColor: parentColors.disabled },
  callButtonText: { color: '#fff', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: parentColors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  stopRow: {
    backgroundColor: parentColors.white,
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stopRowActive: { backgroundColor: parentColors.highlightBg, borderColor: parentColors.blue },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: parentColors.mutedLight },
  stopDotActive: { backgroundColor: parentColors.blue },
  stopName: { flex: 1, fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  stopNameActive: { color: parentColors.blueDeep },
  stopTime: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.mutedSoft },
  stopTimeActive: { color: parentColors.blueDeep },
});
