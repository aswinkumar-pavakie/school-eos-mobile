// Sports Admin -> PT / sports periods. Real listPtPeriods() -- reuses the
// real academic timetable for the "Physical Training" subject, no new
// schema, same real endpoint the website Sports Admin console uses. Full
// feature parity with the website: this screen did not exist in the mobile
// design's own screen set, added here so a Sports Admin who only has the
// app can see everything the website can.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sportsColors } from '@/lib/theme';
import { Card, EmptyPanel, SportsSubHeader } from '@/components/sports/primitives';
import { listPtPeriods } from '@/lib/sports-api';

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
const DAYS = [1, 2, 3, 4, 5, 6];

export default function PtPeriodsScreen() {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(1);

  const ptQuery = useQuery({ queryKey: ['sports-pt-periods'], queryFn: listPtPeriods });

  const classes = useMemo(() => {
    const map = new Map<string, { label: string }>();
    for (const s of ptQuery.data ?? []) {
      if (!map.has(s.sectionId)) map.set(s.sectionId, { label: `${s.gradeName} ${s.sectionName}` });
    }
    return [...map.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label, undefined, { numeric: true }));
  }, [ptQuery.data]);

  const daySlotsByClass = useMemo(() => {
    const map = new Map<string, typeof ptQuery.data>();
    for (const s of ptQuery.data ?? []) {
      if (s.dayOfWeek !== selectedDay) continue;
      const arr = map.get(s.sectionId) ?? [];
      arr.push(s);
      map.set(s.sectionId, arr);
    }
    return map;
  }, [ptQuery.data, selectedDay]);

  return (
    <View style={styles.flex}>
      <SportsSubHeader title="PT / sports periods" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sub}>Weekly Physical Training allotment across {classes.length} class{classes.length === 1 ? '' : 'es'}, drawn from the real class timetable</Text>

        <View style={styles.dayRow}>
          {DAYS.map((d) => (
            <Pressable key={d} onPress={() => setSelectedDay(d)} style={[styles.dayChip, selectedDay === d && styles.dayChipActive]}>
              <Text style={[styles.dayChipText, selectedDay === d && styles.dayChipTextActive]}>{DAY_LABELS[d]}</Text>
            </Pressable>
          ))}
        </View>

        {classes.length === 0 ? (
          <EmptyPanel label="No PT periods are scheduled yet." />
        ) : (
          classes.map(([sectionId, cls]) => {
            const slots = (daySlotsByClass.get(sectionId) ?? []).sort((a, b) => a.periodNo - b.periodNo);
            return (
              <Card key={sectionId} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{cls.label}</Text>
                {slots.length === 0 ? (
                  <Text style={styles.emptySlot}>No PT period on {DAY_LABELS[selectedDay]}</Text>
                ) : (
                  slots.map((s) => (
                    <View key={s.id} style={styles.slotRow}>
                      <Text style={styles.slotTime}>{s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.slotTeacher}>{s.teacherFirstName} {s.teacherLastName ?? ''}</Text>
                        {s.room ? <Text style={styles.slotRoom}>{s.room}</Text> : null}
                      </View>
                    </View>
                  ))
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: sportsColors.surface },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  sub: { fontSize: 12.5, color: sportsColors.mutedStrong, lineHeight: 18 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { borderWidth: 1, borderColor: sportsColors.inputBorder, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 },
  dayChipActive: { backgroundColor: sportsColors.primary, borderColor: sportsColors.primary },
  dayChipText: { fontSize: 12.5, color: sportsColors.bodyStrong, fontFamily: 'PlusJakartaSans_600SemiBold' },
  dayChipTextActive: { color: '#fff' },
  rowCard: { gap: 10, padding: 16 },
  rowTitle: { fontSize: 14.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: sportsColors.ink },
  emptySlot: { fontSize: 12.5, color: sportsColors.tertiary },
  slotRow: { flexDirection: 'row', gap: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: sportsColors.borderSoft, paddingTop: 10 },
  slotTime: { fontSize: 12.5, fontFamily: 'PlusJakartaSans_700Bold', color: sportsColors.bodyStrong, width: 100 },
  slotTeacher: { fontSize: 12.5, color: sportsColors.bodyStrong },
  slotRoom: { fontSize: 11.5, color: sportsColors.tertiary, marginTop: 1 },
});
