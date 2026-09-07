// Create a new event -- name, location, purpose, monitoring teacher (a real
// staff search-select, never free text), and a from/to date+time window.
//
// Date/time are plain, strictly-validated text fields (YYYY-MM-DD / HH:MM, 24h)
// rather than a native date-picker component -- this app has no date-picker
// dependency installed, and after the earlier expo-file-system regression
// (a new native module took down the entire app, including login), adding one
// just for this one field is not a risk worth taking here. A nicer native
// picker is a safe, isolated follow-up whenever that's wanted.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { createEvent, searchTeachers, type TeacherSearchResult } from '@/lib/faculty-events-api';
import { parentColors, cardShadow } from '@/lib/theme';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function parseDateTime(dateStr: string, timeStr: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!dateMatch || !timeMatch) return null;
  const [, y, mo, d] = dateMatch;
  const [, h, mi] = timeMatch;
  const hour = Number(h);
  const minute = Number(mi);
  if (hour > 23 || minute > 59) return null;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), hour, minute, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default function CreateEventScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [fromTime, setFromTime] = useState('');
  const [toDate, setToDate] = useState('');
  const [toTime, setToTime] = useState('');

  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherResults, setTeacherResults] = useState<TeacherSearchResult[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherSearchResult | null>(null);
  const [searchingTeachers, setSearchingTeachers] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing to search for -- skip the debounce/network entirely (no state
  // touched here; the displayed list below is derived straight from
  // teacherSearch/selectedTeacher, so there's nothing to "clear").
  const skipTeacherSearch = !!selectedTeacher || teacherSearch.trim().length < 2;

  useEffect(() => {
    if (skipTeacherSearch) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      setSearchingTeachers(true);
      try {
        const res = await searchTeachers(teacherSearch.trim());
        if (!cancelled) setTeacherResults(res.data);
      } finally {
        if (!cancelled) setSearchingTeachers(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [teacherSearch, skipTeacherSearch]);

  const displayedTeacherResults = skipTeacherSearch ? [] : teacherResults;

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !location.trim() || !purpose.trim()) {
      setError('Name, location and purpose are all required.');
      return;
    }
    if (!selectedTeacher) {
      setError('Search and select a monitoring teacher.');
      return;
    }
    const startsAt = parseDateTime(fromDate, fromTime);
    const endsAt = parseDateTime(toDate, toTime);
    if (!startsAt || !endsAt) {
      setError('Enter valid from/to dates (YYYY-MM-DD) and times (HH:MM, 24-hour).');
      return;
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setError('The "to" date/time must be after the "from" date/time.');
      return;
    }

    setSubmitting(true);
    try {
      await createEvent({
        name: name.trim(),
        location: location.trim(),
        purpose: purpose.trim(),
        monitoringTeacherPersonId: selectedTeacher.personId,
        startsAt,
        endsAt,
      });
      queryClient.invalidateQueries({ queryKey: ['faculty-events'] });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the event.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.flex}>
      <AppHeader title="Create event" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow]}>
          <Field label="Event name">
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Science Museum Field Trip" placeholderTextColor={parentColors.mutedLight} />
          </Field>

          <Field label="Location">
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. City Science Museum" placeholderTextColor={parentColors.mutedLight} />
          </Field>

          <Field label="Purpose">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="Why is this event being held?"
              placeholderTextColor={parentColors.mutedLight}
              multiline
            />
          </Field>

          <Field label="Monitoring teacher">
            {selectedTeacher ? (
              <View style={styles.selectedTeacher}>
                <Text style={styles.selectedTeacherText}>
                  {selectedTeacher.firstName} {selectedTeacher.lastName ?? ''}
                  {selectedTeacher.designation ? ` · ${selectedTeacher.designation}` : ''}
                </Text>
                <Pressable onPress={() => setSelectedTeacher(null)}>
                  <Text style={styles.changeLink}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={teacherSearch}
                  onChangeText={setTeacherSearch}
                  placeholder="Search staff by name"
                  placeholderTextColor={parentColors.mutedLight}
                />
                {searchingTeachers ? <ActivityIndicator color={parentColors.blue} style={{ marginTop: 8 }} /> : null}
                {displayedTeacherResults.map((t) => (
                  <Pressable
                    key={t.id}
                    style={styles.resultRow}
                    onPress={() => {
                      setSelectedTeacher(t);
                      setTeacherSearch('');
                    }}
                  >
                    <Text style={styles.resultText}>
                      {t.firstName} {t.lastName ?? ''}
                      {t.designation ? ` · ${t.designation}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
          </Field>

          <Field label="From">
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.rowInput]} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
              <TextInput style={[styles.input, styles.rowInput]} value={fromTime} onChangeText={setFromTime} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
            </View>
          </Field>

          <Field label="To">
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.rowInput]} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor={parentColors.mutedLight} />
              <TextInput style={[styles.input, styles.rowInput]} value={toTime} onChangeText={setToTime} placeholder="HH:MM" placeholderTextColor={parentColors.mutedLight} />
            </View>
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={[styles.submitButton, submitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Create event</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  fieldLabel: { fontSize: 13, color: parentColors.muted, fontFamily: 'PlusJakartaSans_600SemiBold', marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: parentColors.ink,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 1 },
  selectedTeacher: {
    borderWidth: 1,
    borderColor: parentColors.fieldBorder,
    borderRadius: 12,
    padding: 13,
    backgroundColor: '#F5F8FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedTeacherText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink, flex: 1, marginRight: 8 },
  changeLink: { fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.blueDeep },
  resultRow: { borderBottomWidth: 1, borderBottomColor: parentColors.borderSoft, paddingVertical: 11 },
  resultText: { fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: parentColors.ink },
  error: { color: '#B33A2E', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13, marginBottom: 12 },
  submitButton: { backgroundColor: parentColors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 6 },
  submitButtonDisabled: { backgroundColor: parentColors.disabled },
  submitButtonText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_800ExtraBold' },
});
