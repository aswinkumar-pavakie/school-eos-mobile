// Search (case-insensitive, name/roll no) + class/section filter, then add a
// student to this event -- reuses StudentEventsService.searchStudents (which
// itself reuses the existing StudentsService/StudentRepository search+filter as
// -is, now also matching roll_no).

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import {
  addStudentToEvent,
  getEvent,
  listGrades,
  listSections,
  searchStudents,
  type StudentSearchResult,
} from '@/lib/faculty-events-api';
import { parentColors, cardShadow } from '@/lib/theme';

export default function AddStudentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const eventQuery = useQuery({ queryKey: ['faculty-event', id], queryFn: () => getEvent(id!), enabled: !!id });
  const gradesQuery = useQuery({ queryKey: ['grades'], queryFn: listGrades });
  const sectionsQuery = useQuery({ queryKey: ['sections', gradeId], queryFn: () => listSections(gradeId ?? undefined), enabled: !!gradeId });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await searchStudents({ search: search.trim() || undefined, gradeId: gradeId ?? undefined, sectionId: sectionId ?? undefined });
        if (!cancelled) setResults(res.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, gradeId, sectionId]);

  const alreadyAddedIds = new Set((eventQuery.data?.participants ?? []).map((p) => p.studentId));

  async function handleAdd(student: StudentSearchResult) {
    setAddingId(student.id);
    try {
      await addStudentToEvent(id!, student.id);
      queryClient.invalidateQueries({ queryKey: ['faculty-event', id] });
    } catch (err) {
      Alert.alert('Could not add student', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAddingId(null);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Add students" onBack={() => router.back()} />
      <View style={styles.filterPanel}>
        <View style={[styles.searchBox, cardShadow]}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or roll no."
            placeholderTextColor={parentColors.mutedLight}
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.filterLabel}>CLASS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          <Pressable style={[styles.chip, !gradeId && styles.chipActive]} onPress={() => { setGradeId(null); setSectionId(null); }}>
            <Text style={[styles.chipText, !gradeId && styles.chipTextActive]} numberOfLines={1}>All classes</Text>
          </Pressable>
          {(gradesQuery.data ?? []).map((g) => (
            <Pressable
              key={g.id}
              style={[styles.chip, gradeId === g.id && styles.chipActive]}
              onPress={() => { setGradeId(g.id); setSectionId(null); }}
            >
              <Text style={[styles.chipText, gradeId === g.id && styles.chipTextActive]} numberOfLines={1}>{g.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {gradeId ? (
          <>
            <Text style={styles.filterLabel}>SECTION</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <Pressable style={[styles.chip, !sectionId && styles.chipActive]} onPress={() => setSectionId(null)}>
                <Text style={[styles.chipText, !sectionId && styles.chipTextActive]} numberOfLines={1}>All sections</Text>
              </Pressable>
              {(sectionsQuery.data ?? []).map((s) => (
                <Pressable key={s.id} style={[styles.chip, sectionId === s.id && styles.chipActive]} onPress={() => setSectionId(s.id)}>
                  <Text style={[styles.chipText, sectionId === s.id && styles.chipTextActive]} numberOfLines={1}>Section {s.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : results.length === 0 ? (
          <Text style={styles.emptyText}>No students match.</Text>
        ) : (
          results.map((s) => {
            const alreadyAdded = alreadyAddedIds.has(s.id);
            return (
              <View key={s.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {s.firstName} {s.lastName ?? ''}
                  </Text>
                  <Text style={styles.rowMeta}>
                    Roll {s.rollNo ?? '—'} · {[s.gradeName, s.sectionName].filter(Boolean).join(' ') || 'Class not assigned'} · {s.admissionNo}
                  </Text>
                </View>
                <Pressable
                  style={[styles.addButton, alreadyAdded && styles.addButtonDone]}
                  onPress={() => handleAdd(s)}
                  disabled={alreadyAdded || addingId === s.id}
                >
                  <Text style={[styles.addButtonText, alreadyAdded && styles.addButtonTextDone]}>
                    {alreadyAdded ? 'Added' : addingId === s.id ? 'Adding…' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  filterPanel: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: parentColors.border,
    paddingTop: 14,
    paddingBottom: 4,
  },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    backgroundColor: '#fff',
  },
  filterLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: parentColors.mutedLight,
    letterSpacing: 0.8,
    marginLeft: 16,
    marginBottom: 8,
  },
  // flexShrink: 0 is the real fix -- without it, a chip's Text can get
  // squeezed and wrap inside the pill instead of keeping its own natural
  // width in the horizontal scroll row, which is what made labels render
  // clipped/illegible on a real device. numberOfLines={1} on the Text itself
  // (see JSX above) is the second half of the same fix.
  chipsRow: { paddingHorizontal: 16, paddingBottom: 14, gap: 8, flexDirection: 'row' },
  chip: {
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: parentColors.fieldBorder,
    borderRadius: 99,
    paddingVertical: 9,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  chipText: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#41526E' },
  chipTextActive: { color: '#fff' },
  content: { padding: 16, paddingTop: 14, paddingBottom: 32, gap: 10 },
  emptyText: { textAlign: 'center', color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10 },
  rowName: { fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  rowMeta: { fontSize: 12.5, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 3 },
  addButton: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: parentColors.blue },
  addButtonDone: { backgroundColor: parentColors.pillNeutralBg },
  addButtonText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: '#fff' },
  addButtonTextDone: { color: parentColors.muted },
});
