// Principal -> Class Timetable -- read-only oversight, real backend data only
// (timetable.controller.ts's own GET /timetable, confirmed identical
// class-level access for PRINCIPAL as VICE_PRINCIPAL by direct backend
// audit -- see principal-timetable-api.ts's own comment). Grade/Section
// pickers reuse the exact same /grades /sections calls -- no duplicate API.
// Guarded by the parent principal/_layout.tsx. Day-tab + vertical period list
// -- the standard, touch-friendly mobile timetable pattern.

import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { EmptyState, ErrorState } from '@/components/ScreenStates';
import { SelectField } from '@/components/SelectField';
import { ApiError } from '@/lib/api';
import { parentColors } from '@/lib/theme';
import { getSectionTimetable } from '@/lib/principal-timetable-api';
import { listGrades, listSections } from '@/lib/principal-students-api';

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

function currentWeekday(): number {
  // JS getDay(): 0=Sun..6=Sat. This school's own day_of_week is 1=Mon..6=Sat
  // (no Sunday classes) -- map accordingly, falling back to Monday on a Sunday.
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 1 : jsDay;
}

export default function PrincipalClassTimetableScreen() {
  const router = useRouter();
  const [gradeName, setGradeName] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState<string | null>(null);
  const [day, setDay] = useState(currentWeekday());

  const gradesQuery = useQuery({ queryKey: ['principal-timetable', 'grades'], queryFn: listGrades });
  const grade = useMemo(() => gradesQuery.data?.find((g) => g.name === gradeName) ?? null, [gradesQuery.data, gradeName]);

  const sectionsQuery = useQuery({
    queryKey: ['principal-timetable', 'sections', grade?.id],
    queryFn: () => listSections(grade?.id),
    enabled: !!grade,
  });
  const section = useMemo(
    () => sectionsQuery.data?.find((s) => s.name === sectionName) ?? null,
    [sectionsQuery.data, sectionName],
  );

  const timetableQuery = useQuery({
    queryKey: ['principal-timetable', 'section-timetable', section?.id],
    queryFn: () => getSectionTimetable(section!.id),
    enabled: !!section,
  });

  const daySlots = (timetableQuery.data ?? [])
    .filter((slot) => slot.dayOfWeek === day)
    .sort((a, b) => a.periodNo - b.periodNo);

  return (
    <View style={styles.flex}>
      <AppHeader title="Class Timetable" subtitle="Weekly schedule by section" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Grade"
              value={gradeName}
              placeholder={gradesQuery.isLoading ? 'Loading…' : 'Select grade'}
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
              placeholder={!grade ? 'Pick a grade first' : sectionsQuery.isLoading ? 'Loading…' : 'Select section'}
              options={(sectionsQuery.data ?? []).map((s) => s.name)}
              onSelect={setSectionName}
              disabled={!grade || sectionsQuery.isLoading}
            />
          </View>
        </View>

        {!section ? (
          <EmptyState message="Pick a grade and section to view its timetable." />
        ) : (
          <>
            <View style={styles.dayRow}>
              {DAYS.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setDay(d.value)}
                  style={[styles.dayChip, day === d.value && styles.dayChipActive]}
                >
                  <Text style={[styles.dayChipText, day === d.value && styles.dayChipTextActive]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>

            {timetableQuery.isLoading ? (
              <ActivityIndicator color={parentColors.blue} style={{ marginTop: 24 }} />
            ) : timetableQuery.isError ? (
              <ErrorState
                message={timetableQuery.error instanceof ApiError ? timetableQuery.error.message : 'Unable to load the timetable.'}
                onRetry={() => timetableQuery.refetch()}
              />
            ) : daySlots.length === 0 ? (
              <EmptyState message="No classes scheduled for this section on this day." />
            ) : (
              <View style={styles.list}>
                {daySlots.map((slot, index) => (
                  <View key={slot.id} style={[styles.row, index === 0 && styles.rowFirst]}>
                    <View style={styles.timeCol}>
                      <Text style={styles.periodLabel}>{slot.periodLabel}</Text>
                      <Text style={styles.timeText}>
                        {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.subjectText} numberOfLines={1}>
                        {slot.subjectName}
                      </Text>
                      <Text style={styles.metaText} numberOfLines={1}>
                        {slot.teacherFirstName} {slot.teacherLastName ?? ''}
                        {slot.room ? ` · Room ${slot.room}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  dayRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 14 },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: parentColors.border,
    borderRadius: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  dayChipActive: { backgroundColor: parentColors.blue, borderColor: parentColors.blue },
  dayChipText: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  dayChipTextActive: { color: '#fff' },
  list: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: parentColors.borderSoft,
  },
  rowFirst: { borderTopWidth: 0 },
  timeCol: { width: 78 },
  periodLabel: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink },
  timeText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
  subjectText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  metaText: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.muted, marginTop: 2 },
});
