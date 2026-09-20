// Hostel Warden -> Warden roster. Pixel-matched to Warden App.dc.html's own
// `staff` screen (name + call action). Real data: co-wardens of exactly
// this Warden's own hostel(s), via the new GET /hostel/warden-roster
// (built this same phase from the real role_assignment relationship
// WardenAssignmentRepository already modeled) -- never a school-wide staff
// directory.

import { Linking, Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hostelWardenColors } from '@/lib/theme';
import { Card, EmptyPanel, WardenSubHeader } from '@/components/hostel-warden/primitives';
import { HostelIcon } from '@/components/hostel-warden/icons';
import { listWardenRoster } from '@/lib/hostel-warden-api';
import { fullName } from '@/lib/hostel-warden-status';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ScreenStates';

export default function WardenRosterScreen() {
  const router = useRouter();
  const rosterQuery = useQuery({ queryKey: ['hostel-warden', 'roster'], queryFn: listWardenRoster });

  return (
    <View style={styles.flex}>
      <WardenSubHeader title="Warden roster" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={rosterQuery.isFetching} onRefresh={() => rosterQuery.refetch()} />}
      >
        {rosterQuery.isLoading ? (
          <ActivityIndicator color={hostelWardenColors.primary} style={{ marginTop: 24 }} />
        ) : rosterQuery.isError ? (
          <ErrorState message={rosterQuery.error instanceof ApiError ? rosterQuery.error.message : 'Unable to load the warden roster.'} onRetry={() => rosterQuery.refetch()} />
        ) : (rosterQuery.data ?? []).length === 0 ? (
          <EmptyPanel label="No other wardens found for your hostel(s)." />
        ) : (
          (rosterQuery.data ?? []).map((w) => (
            <Card key={`${w.personId}-${w.hostelId}`} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{fullName(w.firstName, w.lastName)}</Text>
                <Text style={styles.meta}>{w.hostelName}</Text>
              </View>
              {w.mobile ? (
                <Pressable style={styles.callButton} onPress={() => Linking.openURL(`tel:${w.mobile}`)}>
                  <HostelIcon name="staff" color={hostelWardenColors.primary} size={18} strokeWidth={2} />
                </Pressable>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: hostelWardenColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: hostelWardenColors.ink },
  meta: { fontSize: 12, color: hostelWardenColors.muted, marginTop: 2 },
  callButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: hostelWardenColors.tint, alignItems: 'center', justifyContent: 'center' },
});
