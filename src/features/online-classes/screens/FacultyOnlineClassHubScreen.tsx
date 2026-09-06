// Faculty counterpart to ParentOnlineClassHubScreen -- same visual language (gradient
// header, card/pill/divider style, accent-blue primary actions, bordered Recordings
// list) applied to Faculty's real actions instead of Parent's join flow. Two in-page
// tabs: "Today classes" (the session cards + Recordings, same content that used to
// be the whole screen) and "Schedule" (the class-creation form, restyled to match
// this screen rather than the plain bordered-input look of the standalone
// ScheduleOnlineClassScreen route). Full detail (Reschedule/Cancel/Add Recording/
// Complete) still lives on the existing, already-tested OnlineClassDetailScreen --
// tapping a card in "Today classes" navigates there.

import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/lib/api';
import { accent, colors, fonts } from '@/lib/theme';
import { GradientHeader } from '@/components/GradientHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SelectField } from '@/components/SelectField';
import { SessionStatusPill } from '../components/SessionStatusPill';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { useMyTeachingOfferings, useOnlineClassesList, useScheduleOnlineClass, useStartOnlineClass } from '../hooks';
import type { FacultyOnlineClass } from '../types';
import { formatClassDate, formatClassTimeRange, isToday, isValidDateInput, isValidTimeInput } from '../utils';

type CardTone = 'live' | 'scheduled' | 'draft' | 'cancelled';
type HubTab = 'today' | 'schedule';

function cardTone(item: FacultyOnlineClass): { label: string; tone: CardTone } {
  switch (item.status) {
    case 'LIVE':
      return { label: 'Live now', tone: 'live' };
    case 'DRAFT':
      return { label: 'Setting up', tone: 'draft' };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'cancelled' };
    default:
      return { label: 'Scheduled', tone: 'scheduled' };
  }
}

export function FacultyOnlineClassHubScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<HubTab>('today');

  return (
    <View style={styles.screen}>
      <GradientHeader title="Online class" subtitle="Manage your live and recorded sessions" onBack={() => router.back()} />

      <View style={styles.tabBar}>
        <TabButton label="Today classes" active={tab === 'today'} onPress={() => setTab('today')} />
        <TabButton label="Schedule" active={tab === 'schedule'} onPress={() => setTab('schedule')} />
      </View>

      {tab === 'today' ? (
        <TodayClassesTab onOpenDetail={(id) => router.push(`/(protected)/academics/online-classes/${id}` as never)} />
      ) : null}
      {tab === 'schedule' ? <ScheduleTab onScheduled={() => setTab('today')} /> : null}
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabButtonLabel, active && styles.tabButtonLabelActive]}>{label}</Text>
    </Pressable>
  );
}

// ---- Today classes tab -------------------------------------------------------------

function TodayClassesTab({ onOpenDetail }: { onOpenDetail: (id: string) => void }) {
  const upcoming = useOnlineClassesList('upcoming');
  const completed = useOnlineClassesList('completed');

  const upcomingItems = useMemo(
    () => (upcoming.data as FacultyOnlineClass[] | undefined) ?? [],
    [upcoming.data],
  );
  const completedItems = (completed.data as FacultyOnlineClass[] | undefined) ?? [];

  const { todayItems, laterItems } = useMemo(() => {
    const today: FacultyOnlineClass[] = [];
    const later: FacultyOnlineClass[] = [];
    for (const item of upcomingItems) {
      (isToday(item.scheduledDate) ? today : later).push(item);
    }
    return { todayItems: today, laterItems: later };
  }, [upcomingItems]);

  const recordings = completedItems.filter((c) => c.recordingUrl);

  const isLoading = upcoming.isLoading || completed.isLoading;
  const isError = upcoming.isError || completed.isError;

  if (isLoading) return <LoadingState />;
  if (isError) {
    return (
      <ErrorState
        message="Unable to load online classes."
        onRetry={() => {
          upcoming.refetch();
          completed.refetch();
        }}
      />
    );
  }

  if (upcomingItems.length === 0 && completedItems.length === 0) {
    return <EmptyState message="No online classes scheduled yet." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {todayItems.length > 0 ? (
        <Section title="Today's sessions">
          {todayItems.map((item) => (
            <SessionCard key={item.id} item={item} onPress={() => onOpenDetail(item.id)} />
          ))}
        </Section>
      ) : null}

      {laterItems.length > 0 ? (
        <Section title="Upcoming">
          {laterItems.map((item) => (
            <SessionCard key={item.id} item={item} onPress={() => onOpenDetail(item.id)} />
          ))}
        </Section>
      ) : null}

      {recordings.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECORDINGS</Text>
          <View style={styles.recordingsCard}>
            {recordings.map((item, index) => (
              <RecordingRow key={item.id} item={item} isLast={index === recordings.length - 1} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SessionCard({ item, onPress }: { item: FacultyOnlineClass; onPress: () => void }) {
  const { label } = cardTone(item);
  const start = useStartOnlineClass(item.id);

  async function handleStart() {
    try {
      await start.mutateAsync();
    } catch (err) {
      Alert.alert('Something went wrong', err instanceof ApiError ? err.message : 'Please try again.');
    }
  }

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardSubject}>{item.subjectName}</Text>
        <SessionStatusPill status={item.status} label={label} />
      </View>
      <Text style={styles.cardMeta}>
        {item.gradeName} - {item.sectionName} · {formatClassTimeRange(item.startTime, item.endTime)}
      </Text>
      <Text style={styles.cardTopic} numberOfLines={2}>
        {item.topic}
      </Text>

      <View style={styles.cardDivider} />
      <View style={styles.cardFooterRow}>
        <Text style={styles.cardCode}>{formatClassDate(item.scheduledDate)}</Text>
        {item.status === 'LIVE' && item.meetingUrl ? (
          <PrimaryButton
            label="Join"
            size="compact"
            variant="accent"
            onPress={() => Linking.openURL(item.meetingUrl as string)}
          />
        ) : item.status === 'SCHEDULED' ? (
          <PrimaryButton label="Start class" size="compact" variant="accent" loading={start.isPending} onPress={handleStart} />
        ) : item.status === 'COMPLETED' && item.recordingUrl ? (
          <PrimaryButton
            label="Recording"
            size="compact"
            variant="outline"
            onPress={() => Linking.openURL(item.recordingUrl as string)}
          />
        ) : item.status === 'DRAFT' ? (
          <PrimaryButton label="Setting up" size="compact" variant="outline" disabled onPress={() => {}} />
        ) : null}
      </View>
    </Pressable>
  );
}

function RecordingRow({ item, isLast }: { item: FacultyOnlineClass; isLast: boolean }) {
  return (
    <View style={[styles.recordingRow, !isLast && styles.recordingRowDivider]}>
      <View style={styles.playCircle}>
        <Ionicons name="play" size={14} color={colors.primary} />
      </View>
      <View style={styles.recordingTextBlock}>
        <Text style={styles.recordingTitle}>
          {item.subjectName} · {item.topic}
        </Text>
        <Text style={styles.recordingMeta}>{formatClassDate(item.scheduledDate)}</Text>
      </View>
      <Text style={styles.watchLink} onPress={() => Linking.openURL(item.recordingUrl as string)}>
        Watch
      </Text>
    </View>
  );
}

// ---- Schedule tab -------------------------------------------------------------------
// Same field set/validation as the standalone ScheduleOnlineClassScreen route (still
// used nowhere now, kept only as a fallback route) -- restyled as rounded white
// "field cards" matching this screen's look instead of plain bordered inputs.

function ScheduleTab({ onScheduled }: { onScheduled: () => void }) {
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
  // Most faculty teach exactly one subject per class/section, so the subject picker
  // only appears when this specific grade+section combination actually has more than
  // one of this faculty's own offerings to disambiguate between.
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
      await schedule.mutateAsync({
        subjectOfferingId: resolvedOffering.id,
        topic: topic.trim(),
        description: description.trim() || undefined,
        scheduledDate,
        startTime,
        endTime,
      });
      setSelectedGrade(null);
      setSelectedSection(null);
      setSelectedSubject(null);
      setTopic('');
      setDescription('');
      setScheduledDate('');
      setStartTime('');
      setEndTime('');
      onScheduled();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        Alert.alert('Something went wrong', 'Unable to schedule this class. Please try again.');
      }
    }
  }

  if (offerings.isLoading) return <LoadingState />;
  if (offerings.isError) {
    return <ErrorState message="Unable to load your classes." onRetry={() => offerings.refetch()} />;
  }
  if (allOfferings.length === 0) {
    return <EmptyState message="You are not assigned to any class/section yet." />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.formCard}>
        <SelectField label="Class" value={selectedGrade} placeholder="Select class" options={grades} onSelect={handleGradeSelect} />

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

        <FormField label="Topic">
          <TextInput
            value={topic}
            onChangeText={setTopic}
            style={styles.formInput}
            placeholder="Topic"
            placeholderTextColor={colors.textMuted}
          />
        </FormField>

        <FormField label="Description (optional)">
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.formInput, styles.formMultiline]}
            multiline
            placeholder="Description"
            placeholderTextColor={colors.textMuted}
          />
        </FormField>

        <FormField label="Date (YYYY-MM-DD)">
          <TextInput
            value={scheduledDate}
            onChangeText={setScheduledDate}
            style={styles.formInput}
            placeholder="2026-09-25"
            placeholderTextColor={colors.textMuted}
          />
        </FormField>

        <View style={styles.formRow}>
          <FormField label="Start time (HH:mm)" style={styles.formFlexField}>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              style={styles.formInput}
              placeholder="10:00"
              placeholderTextColor={colors.textMuted}
            />
          </FormField>
          <FormField label="End time (HH:mm)" style={styles.formFlexField}>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              style={styles.formInput}
              placeholder="11:00"
              placeholderTextColor={colors.textMuted}
            />
          </FormField>
        </View>

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <PrimaryButton label="Schedule class" variant="accent" onPress={handleSubmit} loading={schedule.isPending} />
      </View>
    </ScrollView>
  );
}

function FormField({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  return (
    <View style={[styles.formField, style]}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20, paddingBottom: 32 },
  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButtonActive: { backgroundColor: accent.blue, borderColor: accent.blue },
  tabButtonLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted },
  tabButtonLabelActive: { color: colors.white },
  section: { gap: 10 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted, letterSpacing: 0.5 },
  sectionBody: { gap: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardSubject: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flex: 1 },
  cardMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  cardTopic: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  cardDivider: { height: 1, backgroundColor: colors.border, marginTop: 6 },
  cardFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  cardCode: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  recordingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  recordingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  recordingRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  playCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF1FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingTextBlock: { flex: 1, gap: 2 },
  recordingTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  recordingMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  watchLink: { fontFamily: fonts.bold, fontSize: 13, color: accent.blue },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  formField: { gap: 6 },
  formFlexField: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 12 },
  formLabel: { fontFamily: fonts.bold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },
  formMultiline: { minHeight: 80, textAlignVertical: 'top' },
  formError: { fontFamily: fonts.medium, fontSize: 13, color: colors.errorText },
});
