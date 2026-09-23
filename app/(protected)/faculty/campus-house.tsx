// House -- read-only. "House" here is the inter-house sports affiliation
// (Red House/Blue House-style, real `house` table used by the Sports
// module for inter-house competition scoring) -- not Hostel, a completely
// different concept. Houses aren't something an individual faculty member
// "belongs to" the way a student does (house.captain_student_id is a
// student), so this is simply a browse/directory view, not a "my house"
// screen.

import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { listHouses } from '@/lib/campus-api';
import { facultyColors } from '@/lib/theme';

export default function CampusHouseScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['campus-houses'], queryFn: listHouses });

  return (
    <View style={{ flex: 1 }}>
      <AppHeader title="House" subtitle="Inter-house teams" onBack={() => router.replace('/faculty/campus-hub' as never)} />
      <ScrollView contentContainerStyle={styles.content}>
        {query.isLoading ? (
          <ActivityIndicator color={facultyColors.blue} style={{ marginTop: 24 }} />
        ) : (query.data ?? []).length === 0 ? (
          <Text style={styles.emptyText}>No houses set up yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {(query.data ?? []).map((h) => (
              <View key={h.id} style={styles.row}>
                <View style={[styles.swatch, { backgroundColor: h.colourHex ?? facultyColors.blue }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name}>{h.name}</Text>
                  <Text style={styles.status}>{h.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: facultyColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: facultyColors.border, borderRadius: 14, padding: 14 },
  swatch: { width: 34, height: 34, borderRadius: 10 },
  name: { fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold', color: facultyColors.ink },
  status: { fontSize: 11.5, fontFamily: 'PlusJakartaSans_600SemiBold', color: facultyColors.muted, marginTop: 2 },
});
