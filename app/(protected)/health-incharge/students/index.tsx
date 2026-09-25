// Health In-charge -- student health search. GET /health-incharge/students?search=
// only returns results once at least 2 characters are typed (same threshold the
// website's own StudentPicker component already uses).

import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { HealthSubHeader, Card, EmptyPanel } from '@/components/health-incharge/primitives';
import { searchHealthStudents, studentName, classLabel } from '@/lib/health-incharge-api';
import { healthInchargeColors } from '@/lib/theme';

export default function StudentSearchScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['health-incharge-student-search', search],
    queryFn: () => searchHealthStudents(search.trim()),
    enabled: search.trim().length >= 2,
  });

  return (
    <View style={styles.flex}>
      <HealthSubHeader title="Student health" onBack={() => router.back()} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or admission no."
          placeholderTextColor={healthInchargeColors.muted}
          autoFocus
        />
      </View>
      {search.trim().length < 2 ? (
        <View style={{ padding: 18 }}>
          <EmptyPanel label="Type at least 2 characters to search." />
        </View>
      ) : query.isLoading ? (
        <ActivityIndicator color={healthInchargeColors.primary} style={{ marginTop: 20 }} />
      ) : !query.data || query.data.length === 0 ? (
        <View style={{ padding: 18 }}>
          <EmptyPanel label="No student matches that search." />
        </View>
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(s) => s.studentId}
          contentContainerStyle={styles.list}
          renderItem={({ item: s }) => (
            <Card style={styles.row} onPress={() => router.push(`/(protected)/health-incharge/students/${s.studentId}` as never)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{studentName(s)}</Text>
                <Text style={styles.sub}>{s.admissionNo} · {classLabel(s.gradeName, s.sectionName)}</Text>
              </View>
              {!s.hasProfile ? <Text style={styles.noProfile}>No profile</Text> : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: healthInchargeColors.background },
  searchWrap: { padding: 16, paddingBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: healthInchargeColors.inputBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: healthInchargeColors.ink,
    backgroundColor: healthInchargeColors.surface,
  },
  list: { padding: 16, paddingTop: 8, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: healthInchargeColors.ink },
  sub: { fontSize: 12, color: healthInchargeColors.muted, marginTop: 2 },
  noProfile: { fontSize: 11, color: healthInchargeColors.amber, fontFamily: 'PlusJakartaSans_700Bold' },
});
