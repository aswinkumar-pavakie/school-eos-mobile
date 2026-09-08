// Vice Principal -> Examinations (Phase 11) -- school-level academic
// oversight, real backend data only. academicYearId/state are the only two
// backend-supported filters on GET /examinations (ListExamsQueryDto) -- both
// sent as real server-side query params. There's no backend `search` or
// `term` filter, so the search box and term chips below narrow the already-
// loaded, already-authorized list client-side (never presented as a server
// call) rather than inventing unsupported backend capability.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { listAcademicYears, listExaminations } from '@/lib/vice-principal-examinations-api';

const STATES = ['DRAFT', 'SCHEDULED', 'CONDUCTED', 'MARKS_ENTRY', 'VERIFIED', 'PUBLISHED', 'LOCKED'];

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function examStateMeta(state: string): { label: string; tone: StatusTone } {
  switch (state) {
    case 'PUBLISHED':
    case 'LOCKED':
      return { label: humanize(state), tone: 'positive' };
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral' };
    default:
      return { label: humanize(state), tone: 'warning' };
  }
}

export default function VicePrincipalExaminationsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [state, setState] = useState<string | null>(null);
  const [yearName, setYearName] = useState<string | null>(null);

  const yearsQuery = useQuery({ queryKey: ['vp-examinations', 'years'], queryFn: listAcademicYears });
  const year = useMemo(() => yearsQuery.data?.find((y) => y.name === yearName) ?? null, [yearsQuery.data, yearName]);

  const examsQuery = useQuery({
    queryKey: ['vp-examinations', 'list', state, year?.id],
    queryFn: () => listExaminations({ state: state ?? undefined, academicYearId: year?.id }),
  });

  const exams = (examsQuery.data ?? []).filter((exam) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return exam.name.toLowerCase().includes(q) || (exam.term ?? '').toLowerCase().includes(q);
  });

  return (
    <View style={styles.flex}>
      <AppHeader title="Examinations" subtitle="School-wide examination overview" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search loaded examinations by name or term…"
          placeholderTextColor={parentColors.mutedLight}
          style={styles.searchInput}
        />

        <View style={styles.stateRow}>
          <Pressable onPress={() => setState(null)} style={[styles.stateChip, state === null && styles.stateChipActive]}>
            <Text style={[styles.stateChipText, state === null && styles.stateChipTextActive]}>All</Text>
          </Pressable>
          {STATES.map((s) => (
            <Pressable key={s} onPress={() => setState(s)} style={[styles.stateChip, state === s && styles.stateChipActive]}>
              <Text style={[styles.stateChipText, state === s && styles.stateChipTextActive]}>{humanize(s)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginBottom: 8 }}>
          <SelectField
            label="Academic year"
            value={yearName}
            placeholder={yearsQuery.isLoading ? 'Loading…' : 'Any academic year'}
            options={(yearsQuery.data ?? []).map((y) => y.name)}
            onSelect={setYearName}
            disabled={yearsQuery.isLoading}
          />
        </View>

        {examsQuery.isLoading ? (
          <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
        ) : examsQuery.isError ? (
          <ErrorState
            message={examsQuery.error instanceof ApiError ? examsQuery.error.message : 'Unable to load examinations.'}
            onRetry={() => examsQuery.refetch()}
          />
        ) : exams.length === 0 ? (
          <EmptyState message="No examinations match your search or filters." />
        ) : (
          <View style={styles.list}>
            {exams.map((exam, index) => {
              const meta = examStateMeta(exam.state);
              return (
                <Pressable
                  key={exam.id}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                  onPress={() => router.push(`/(protected)/vice-principal/examinations/${exam.id}` as never)}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {exam.name}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {humanize(exam.examType)}
                      {exam.term ? ` · ${exam.term}` : ''}
                      {` · ${exam.academicYearName}`}
                    </Text>
                  </View>
                  <StatusBadge {...meta} />
                </Pressable>
              );
            })}
          </View>
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
  stateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stateChip: {
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  stateChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  stateChipText: { fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  stateChipTextActive: { color: '#fff' },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  rowMeta: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
