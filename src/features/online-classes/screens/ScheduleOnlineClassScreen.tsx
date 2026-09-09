// Standalone route kept as the old parallel flow's Schedule screen (reached via
// OnlineClassesListScreen's "+ Schedule" button). Uses the same real class/section
// picker (GET /online-classes/my-subject-offerings) as FacultyOnlineClassHubScreen's
// inline Schedule tab -- no manual subjectOfferingId text entry anywhere anymore.

import { useMemo, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { SelectField } from '@/components/SelectField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { useMyTeachingOfferings, useScheduleOnlineClass } from '../hooks';
import { isValidDateInput, isValidTimeInput } from '../utils';

export function ScheduleOnlineClassScreen() {
  const router = useRouter();
  const schedule = useScheduleOnlineClass();
  const offerings = useMyTeachingOfferings();

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const allOfferings = useMemo(() => offerings.data ?? [], [offerings.data]);
  const grades = useMemo(() => [...new Set(allOfferings.map((o) => o.gradeName))], [allOfferings]);
  const sections = useMemo(
    () => [...new Set(allOfferings.filter((o) => o.gradeName === selectedGrade).map((o) => o.sectionName))],
    [allOfferings, selectedGrade],
  );
  const matchingOfferings = useMemo(
    () => allOfferings.filter((o) => o.gradeName === selectedGrade && o.sectionName === selectedSection),
    [allOfferings, selectedGrade, selectedSection],
  );
  const needsSubjectPicker = matchingOfferings.length > 1;
  const subjects = useMemo(() => matchingOfferings.map((o) => o.subjectName), [matchingOfferings]);
  const resolvedOffering = needsSubjectPicker
    ? (matchingOfferings.find((o) => o.subjectName === selectedSubject) ?? null)
    : (matchingOfferings[0] ?? null);

  function handleGradeSelect(grade: string) {
    setSelectedGrade(grade);
    setSelectedSection(null);
    setSelectedSubject(null);
  }

  function handleSectionSelect(section: string) {
    setSelectedSection(section);
    setSelectedSubject(null);
  }

  async function handleSubmit() {
    setFormError(null);

    if (!resolvedOffering) {
      setFormError('Please select a class, section, and subject.');
      return;
    }
    if (!topic.trim()) {
      setFormError('Topic is required.');
      return;
    }
    if (!isValidDateInput(scheduledDate)) {
      setFormError('Date must be in YYYY-MM-DD format.');
      return;
    }
    if (!isValidTimeInput(startTime) || !isValidTimeInput(endTime)) {
      setFormError('Times must be in HH:mm 24-hour format.');
      return;
    }

    try {
      const created = await schedule.mutateAsync({
        subjectOfferingId: resolvedOffering.id,
        topic: topic.trim(),
        description: description.trim() || undefined,
        scheduledDate,
        startTime,
        endTime,
      });
      router.replace(`/(protected)/online-classes/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        Alert.alert('Something went wrong', 'Unable to schedule this class. Please try again.');
      }
    }
  }

  if (offerings.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LoadingState />
      </SafeAreaView>
    );
  }
  if (offerings.isError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ErrorState message="Unable to load your classes." onRetry={() => offerings.refetch()} />
      </SafeAreaView>
    );
  }
  if (allOfferings.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <EmptyState message="You are not assigned to any class/section yet." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Schedule Online Class</Text>

        <SelectField
          label="Class"
          value={selectedGrade}
          placeholder="Select class"
          options={grades}
          onSelect={handleGradeSelect}
        />

        <SelectField
          label="Section"
          value={selectedSection}
          placeholder={selectedGrade ? 'Select section' : 'Select a class first'}
          options={sections}
          onSelect={handleSectionSelect}
          disabled={!selectedGrade}
        />

        {needsSubjectPicker ? (
          <SelectField
            label="Subject"
            value={selectedSubject}
            placeholder="Select subject"
            options={subjects}
            onSelect={setSelectedSubject}
          />
        ) : null}

        <Field label="Topic">
          <TextInput
            value={topic}
            onChangeText={setTopic}
            style={styles.input}
            placeholder="Topic"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Description (optional)">
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Description"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <Field label="Date (YYYY-MM-DD)">
          <TextInput
            value={scheduledDate}
            onChangeText={setScheduledDate}
            style={styles.input}
            placeholder="2026-09-25"
            placeholderTextColor={colors.textMuted}
          />
        </Field>

        <View style={styles.row}>
          <Field label="Start time (HH:mm)" style={styles.flexField}>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              style={styles.input}
              placeholder="10:00"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
          <Field label="End time (HH:mm)" style={styles.flexField}>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              style={styles.input}
              placeholder="11:00"
              placeholderTextColor={colors.textMuted}
            />
          </Field>
        </View>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <PrimaryButton label="Schedule class" onPress={handleSubmit} loading={schedule.isPending} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 16 },
  title: { fontFamily: fonts.extraBold, fontSize: 20, color: colors.text },
  field: { gap: 6 },
  flexField: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.errorText },
});
