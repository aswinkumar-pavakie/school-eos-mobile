// Principal -> Students (list) -- real backend search+filters, same
// students.controller.ts endpoints VP already uses for list/get (identical
// class-level @Roles('ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL') grant). Guarded
// by the parent principal/_layout.tsx.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { initialsOf } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { listGrades, listSections, listStudents } from '@/lib/principal-students-api';

const STATUS_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'LEFT', label: 'Left' },
  { value: 'TC_ISSUED', label: 'TC issued' },
  { value: 'ARCHIVED', label: 'Archived' },
];

function statusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', tone: 'positive' };
    case 'LEFT':
      return { label: 'Left', tone: 'negative' };
    case 'TC_ISSUED':
      return { label: 'TC issued', tone: 'warning' };
    default:
      return { label: 'Archived', tone: 'neutral' };
  }
}

export default function PrincipalStudentsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);

  const gradesQuery = useQuery({ queryKey: ['principal-students', 'grades'], queryFn: listGrades });
  const grade = useMemo(() => gradesQuery.data?.find((g) => g.name === gradeName) ?? null, [gradesQuery.data, gradeName]);

  const sectionsQuery = useQuery({
    queryKey: ['principal-students', 'sections', grade?.id],
    queryFn: () => listSections(grade?.id),
    enabled: !!grade,
  });
  const section = useMemo(
    () => sectionsQuery.data?.find((s) => s.name === sectionName) ?? null,
    [sectionsQuery.data, sectionName],
  );

  const listQuery = useQuery({
    queryKey: ['principal-students', 'list', search, status, grade?.id, section?.id],
    queryFn: () =>
      listStudents({
        search: search.trim() || undefined,
        status: status ?? undefined,
        gradeId: grade?.id,
        sectionId: section?.id,
      }),
  });

  const students = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta.total ?? 0;

  return (
    <View style={styles.flex}>
      <AppHeader title="Students" subtitle="School-wide student overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or admission number…"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.searchInput}
        />

        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setStatus(opt.value)}
              style={[styles.statusChip, status === opt.value && styles.statusChipActive]}
            >
              <Text style={[styles.statusChipText, status === opt.value && styles.statusChipTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Grade"
              value={gradeName}
              placeholder={gradesQuery.isLoading ? 'Loading…' : 'Any grade'}
              options={(gradesQuery.data ?? []).map((g) => g.name)}
              onSelect={(name) => {
                setGradeName(name);
                setSectionName(null);
              }}
              disabled={gradesQuery.isLoading}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Section"
              value={sectionName}
              placeholder={!grade ? 'Pick a grade first' : sectionsQuery.isLoading ? 'Loading…' : 'Any section'}
              options={(sectionsQuery.data ?? []).map((s) => s.name)}
              onSelect={setSectionName}
              disabled={!grade || sectionsQuery.isLoading}
            />
          </View>
        </View>

        {listQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : listQuery.isError ? (
          <ErrorState
            message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load students.'}
            onRetry={() => listQuery.refetch()}
          />
        ) : students.length === 0 ? (
          <EmptyState message="No students match your search or filters." />
        ) : (
          <>
            <Text style={styles.resultCount}>
              Showing {students.length} of {total}
              {total > students.length ? ' — refine your search to narrow further' : ''}
            </Text>
            <View style={styles.list}>
              {students.map((student, index) => {
                const meta = statusMeta(student.status);
                return (
                  <Pressable
                    key={student.id}
                    style={[styles.row, index === 0 && styles.rowFirst]}
                    onPress={() => router.push(`/(protected)/principal/students/${student.id}` as never)}
                  >
                    {student.photoUrl ? (
                      <Image source={{ uri: student.photoUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{initialsOf(student.firstName, student.lastName)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {student.firstName} {student.lastName ?? ''}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {student.admissionNo}
                        {student.gradeName ? ` · ${student.gradeName}${student.sectionName ? ` ${student.sectionName}` : ''}` : ''}
                      </Text>
                    </View>
                    <StatusBadge {...meta} />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 4 },
  searchInput: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
    marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  statusChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  statusChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  statusChipTextActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  resultCount: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 14, marginBottom: 8 },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  avatarImage: { width: 42, height: 42, borderRadius: 21, backgroundColor: parentColors.borderSoft },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', color: '#fff' },
  rowName: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
