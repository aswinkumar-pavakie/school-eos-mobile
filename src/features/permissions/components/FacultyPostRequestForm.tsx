// Faculty "Post request" tab -- creates a permission_activity for every ACTIVE
// student in the selected section (allStudents: true). Per-student selection
// isn't exposed here yet: there is no endpoint listing individual students in a
// section for a picker, only "resolve all active students server-side," which is
// exactly what this form always requests.

import { useMemo, useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { SelectField } from '@/components/SelectField';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { useCreatePermissionActivity, useMyPermissionSections } from '../hooks';
import { PERMISSION_TYPE_LABELS, PERMISSION_TYPES, type PermissionType } from '../types';
import { isValidDateInput, isValidTimeInput } from '../utils';
import { PrimaryButton } from './PrimaryButton';

const TYPE_LABELS = PERMISSION_TYPES.map((t) => PERMISSION_TYPE_LABELS[t]);

export function FacultyPostRequestForm({ onCreated }: { onCreated: () => void }) {
  const sections = useMyPermissionSections();
  const create = useCreatePermissionActivity();

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedTypeLabel, setSelectedTypeLabel] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [responseDeadline, setResponseDeadline] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const allSections = useMemo(() => sections.data ?? [], [sections.data]);
  const grades = useMemo(() => [...new Set(allSections.map((s) => s.gradeName))], [allSections]);
  const sectionNames = useMemo(
    () => [...new Set(allSections.filter((s) => s.gradeName === selectedGrade).map((s) => s.sectionName))],
    [allSections, selectedGrade],
  );
  const resolvedSection = useMemo(
    () => allSections.find((s) => s.gradeName === selectedGrade && s.sectionName === selectedSection) ?? null,
    [allSections, selectedGrade, selectedSection],
  );
  const permissionType = selectedTypeLabel
    ? (PERMISSION_TYPES.find((t) => PERMISSION_TYPE_LABELS[t] === selectedTypeLabel) as PermissionType)
    : null;

  function handleGradeSelect(grade: string) {
    setSelectedGrade(grade);
    setSelectedSection(null);
  }

  async function handleSubmit() {
    setFormError(null);

    if (!resolvedSection) {
      setFormError('Please select a class and section.');
      return;
    }
    if (!permissionType) {
      setFormError('Please select a permission type.');
      return;
    }
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!isValidDateInput(activityDate)) {
      setFormError('Activity date must be in YYYY-MM-DD format.');
      return;
    }
    if (!isValidTimeInput(startTime) || !isValidTimeInput(endTime)) {
      setFormError('Times must be in HH:mm 24-hour format.');
      return;
    }
    if (startTime >= endTime) {
      setFormError('End time must be after start time.');
      return;
    }
    if (!isValidDateInput(responseDeadline)) {
      setFormError('Response deadline must be in YYYY-MM-DD format.');
      return;
    }
    if (responseDeadline > activityDate) {
      setFormError('Response deadline must be on or before the activity date.');
      return;
    }

    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        permissionType,
        academicYearId: resolvedSection.academicYearId,
        sectionId: resolvedSection.sectionId,
        activityDate,
        startTime,
        endTime,
        responseDeadline,
        allStudents: true,
      });
      setTitle('');
      setDescription('');
      setActivityDate('');
      setStartTime('');
      setEndTime('');
      setResponseDeadline('');
      setSelectedTypeLabel(null);
      Alert.alert('Request sent', 'Parents of the selected section can now respond.');
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        Alert.alert('Something went wrong', 'Unable to create this request. Please try again.');
      }
    }
  }

  if (sections.isLoading) return <LoadingState />;
  if (sections.isError)
    return <ErrorState message="Unable to load your sections." onRetry={() => sections.refetch()} />;
  if (allSections.length === 0) return <EmptyState message="You are not assigned to any class/section yet." />;

  return (
    <View style={styles.content}>
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
        options={sectionNames}
        onSelect={setSelectedSection}
        disabled={!selectedGrade}
      />

      <SelectField
        label="Permission type"
        value={selectedTypeLabel}
        placeholder="Select type"
        options={TYPE_LABELS}
        onSelect={setSelectedTypeLabel}
      />

      <Field label="Title">
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="Science Museum Field Trip"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="Description (optional)">
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multiline]}
          multiline
          placeholder="Transport by school bus. Packed lunch required."
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Field label="Activity date (YYYY-MM-DD)">
        <TextInput
          value={activityDate}
          onChangeText={setActivityDate}
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
            placeholder="09:00"
            placeholderTextColor={colors.textMuted}
          />
        </Field>
        <Field label="End time (HH:mm)" style={styles.flexField}>
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            style={styles.input}
            placeholder="15:00"
            placeholderTextColor={colors.textMuted}
          />
        </Field>
      </View>

      <Field label="Response deadline (YYYY-MM-DD)">
        <TextInput
          value={responseDeadline}
          onChangeText={setResponseDeadline}
          style={styles.input}
          placeholder="2026-09-20"
          placeholderTextColor={colors.textMuted}
        />
      </Field>

      <Text style={styles.hint}>This request will be sent to every active student in the selected section.</Text>

      {formError ? <Text style={styles.error}>{formError}</Text> : null}

      <PrimaryButton label="Send request" onPress={handleSubmit} loading={create.isPending} />
    </View>
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
  content: { padding: 20, gap: 16 },
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
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  error: { fontFamily: fonts.medium, fontSize: 13, color: colors.errorText },
});
