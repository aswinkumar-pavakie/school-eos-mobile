// Principal -> Faculty -- an oversight/information list, real
// backend search+filters only (staff.controller.ts's own /staff, already
// authorized for PRINCIPAL, identical to VICE_PRINCIPAL's own grant -- see
// that controller's comment). Grade/Section filters reuse the exact same
// /grades /sections calls already authorized for both roles -- no duplicate
// API. Guarded by the parent principal/_layout.tsx (covers this whole
// subtree).

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
import { listDesignations, listFaculty } from '@/lib/principal-faculty-api';
import { listGrades, listSections } from '@/lib/principal-students-api';

const STATUS_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On leave' },
  { value: 'EXITED', label: 'Exited' },
];

function statusMeta(status: string): { label: string; tone: StatusTone } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', tone: 'positive' };
    case 'ON_LEAVE':
      return { label: 'On leave', tone: 'warning' };
    default:
      return { label: 'Exited', tone: 'negative' };
  }
}

export default function PrincipalFacultyScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [designation, setDesignation] = useState<string | null>(null);
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);

  const designationsQuery = useQuery({ queryKey: ['principal-faculty', 'designations'], queryFn: listDesignations });
  const gradesQuery = useQuery({ queryKey: ['principal-faculty', 'grades'], queryFn: listGrades });
  const grade = useMemo(() => gradesQuery.data?.find((g) => g.name === gradeName) ?? null, [gradesQuery.data, gradeName]);

  const sectionsQuery = useQuery({
    queryKey: ['principal-faculty', 'sections', grade?.id],
    queryFn: () => listSections(grade?.id),
    enabled: !!grade,
  });
  const section = useMemo(
    () => sectionsQuery.data?.find((s) => s.name === sectionName) ?? null,
    [sectionsQuery.data, sectionName],
  );

  const listQuery = useQuery({
    queryKey: ['principal-faculty', 'list', search, status, designation, grade?.id, section?.id],
    queryFn: () =>
      listFaculty({
        search: search.trim() || undefined,
        status: status ?? undefined,
        designation: designation ?? undefined,
        isTeaching: grade || section ? 'true' : undefined,
        gradeId: grade?.id,
        sectionId: section?.id,
      }),
  });

  const faculty = listQuery.data?.data ?? [];
  const total = listQuery.data?.meta.total ?? 0;

  return (
    <View style={styles.flex}>
      <AppHeader title="Faculty" subtitle="School-wide faculty overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or employee no…"
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

        <View style={{ marginBottom: 12 }}>
          <SelectField
            label="Designation"
            value={designation}
            placeholder={designationsQuery.isLoading ? 'Loading…' : 'Any designation'}
            options={designationsQuery.data ?? []}
            onSelect={setDesignation}
            disabled={designationsQuery.isLoading}
          />
        </View>

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Teaches grade"
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
              label="Teaches section"
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
            message={listQuery.error instanceof ApiError ? listQuery.error.message : 'Unable to load faculty.'}
            onRetry={() => listQuery.refetch()}
          />
        ) : faculty.length === 0 ? (
          <EmptyState message="No faculty match your search or filters." />
        ) : (
          <>
            <Text style={styles.resultCount}>
              Showing {faculty.length} of {total}
              {total > faculty.length ? ' — refine your search to narrow further' : ''}
            </Text>
            <View style={styles.list}>
              {faculty.map((member, index) => {
                const meta = statusMeta(member.status);
                return (
                  <Pressable
                    key={member.id}
                    style={[styles.row, index === 0 && styles.rowFirst]}
                    onPress={() => router.push(`/(protected)/principal/faculty/${member.id}` as never)}
                  >
                    {member.photoUrl ? (
                      <Image source={{ uri: member.photoUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{initialsOf(member.firstName, member.lastName)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {member.firstName} {member.lastName ?? ''}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {member.employeeNo}
                        {member.designation ? ` · ${member.designation}` : ''}
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
