// Pixel-matched Parent "Online class" screen per the provided design. Shares the
// exact same data layer as the generic OnlineClassesListScreen (same hooks/api/
// types, same real join rule) -- only the visual template differs. Two fields the
// mockup shows have no real backend source and are NOT fabricated here:
//   - teacher display name (ParentOnlineClass has no faculty-name field at all)
//   - a short "meeting code" (we only ever have a real Google Meet URL)
// Both are substituted with real, honest data instead (section context, date) --
// see the inline comments below and the feature README's "Known gaps" section.
//
// "Not open yet" here uses a JOIN_SOON_WINDOW_MINUTES UI heuristic to match the
// mockup's look (a far-future class shows disabled, a near one shows enabled) --
// this is cosmetic only. The backend's real rule (SCHEDULED/LIVE + meetingUrl) is
// still what actually decides whether a join attempt succeeds, and the original
// generic list screen (reachable from Home) never applies this extra restriction.

import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/lib/api';
import { accent, colors, fonts } from '@/lib/theme';
import { GradientHeader } from '@/components/GradientHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SessionStatusPill } from '../components/SessionStatusPill';
import { EmptyState, ErrorState, LoadingState } from '@/components/ScreenStates';
import { useJoinOnlineClass, useOnlineClassesList } from '../hooks';
import type { ParentOnlineClass } from '../types';
import {
  canAttemptJoin,
  classStartDateTime,
  formatClassDate,
  formatClassTimeRange,
  isToday,
  minutesUntil,
} from '../utils';

const JOIN_SOON_WINDOW_MINUTES = 30;

type CardTone = 'live' | 'soon' | 'scheduled';

function cardTone(item: ParentOnlineClass): { label: string; tone: CardTone } {
  if (item.status === 'LIVE') return { label: 'Live now', tone: 'live' };
  if (item.status === 'SCHEDULED') {
    const mins = minutesUntil(classStartDateTime(item.scheduledDate, item.startTime));
    if (mins <= JOIN_SOON_WINDOW_MINUTES) {
      return { label: mins <= 0 ? 'Starting now' : `Starts in ${mins} min`, tone: 'soon' };
    }
  }
  return { label: 'Scheduled', tone: 'scheduled' };
}

function canJoinNow(item: ParentOnlineClass): boolean {
  if (!canAttemptJoin(item)) return false;
  if (item.status === 'LIVE') return true;
  return minutesUntil(classStartDateTime(item.scheduledDate, item.startTime)) <= JOIN_SOON_WINDOW_MINUTES;
}

export function ParentOnlineClassHubScreen() {
  const router = useRouter();
  const upcoming = useOnlineClassesList('upcoming');
  const completed = useOnlineClassesList('completed');
  const join = useJoinOnlineClass();
  const [inClassId, setInClassId] = useState<string | null>(null);

  const upcomingItems = useMemo(() => (upcoming.data as ParentOnlineClass[] | undefined) ?? [], [upcoming.data]);
  const completedItems = (completed.data as ParentOnlineClass[] | undefined) ?? [];

  const { todayItems, laterItems } = useMemo(() => {
    const today: ParentOnlineClass[] = [];
    const later: ParentOnlineClass[] = [];
    for (const item of upcomingItems) {
      (isToday(item.scheduledDate) ? today : later).push(item);
    }
    return { todayItems: today, laterItems: later };
  }, [upcomingItems]);

  const inClassItem = upcomingItems.find((c) => c.id === inClassId) ?? null;
  const recordings = completedItems.filter((c) => c.recordingUrl);

  async function handleJoin(item: ParentOnlineClass) {
    try {
      const result = await join.mutateAsync(item.id);
      await Linking.openURL(result.meetingUrl);
      if (result.status === 'LIVE') setInClassId(item.id);
    } catch (err) {
      Alert.alert('Cannot join', err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    }
  }

  const isLoading = upcoming.isLoading || completed.isLoading;
  const isError = upcoming.isError || completed.isError;

  return (
    <View style={styles.screen}>
      <GradientHeader title="Online class" subtitle="Live and recorded sessions" onBack={() => router.back()} />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message="Unable to load online classes."
          onRetry={() => {
            upcoming.refetch();
            completed.refetch();
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {inClassItem ? (
            <View style={styles.inClassBanner}>
              <View style={styles.liveDotLarge} />
              <View style={styles.inClassTextBlock}>
                <Text style={styles.inClassTitle}>{inClassItem.subjectName} · in class</Text>
                <Text style={styles.inClassSubtitle} numberOfLines={1}>
                  {inClassItem.topic}
                </Text>
              </View>
              <PrimaryButton label="Leave" size="compact" variant="outline" onPress={() => setInClassId(null)} />
            </View>
          ) : null}

          {upcomingItems.length === 0 && completedItems.length === 0 ? (
            <EmptyState message="No online classes yet." />
          ) : (
            <>
              {todayItems.length > 0 ? (
                <Section title="Today's sessions">
                  {todayItems.map((item) => (
                    <SessionCard
                      key={item.id}
                      item={item}
                      inClass={item.id === inClassId}
                      joining={join.isPending && join.variables === item.id}
                      onJoin={() => handleJoin(item)}
                    />
                  ))}
                </Section>
              ) : null}

              {laterItems.length > 0 ? (
                <Section title="Upcoming">
                  {laterItems.map((item) => (
                    <SessionCard
                      key={item.id}
                      item={item}
                      inClass={item.id === inClassId}
                      joining={join.isPending && join.variables === item.id}
                      onJoin={() => handleJoin(item)}
                    />
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
            </>
          )}
        </ScrollView>
      )}
    </View>
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

function SessionCard({
  item,
  inClass,
  joining,
  onJoin,
}: {
  item: ParentOnlineClass;
  inClass: boolean;
  joining: boolean;
  onJoin: () => void;
}) {
  const { label } = cardTone(item);
  const joinable = canJoinNow(item);

  return (
    <View style={styles.card}>
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
        {inClass ? (
          <PrimaryButton label="In class" size="compact" variant="outline" disabled onPress={() => {}} />
        ) : joinable ? (
          <PrimaryButton label="Join" size="compact" variant="accent" loading={joining} onPress={onJoin} />
        ) : (
          <PrimaryButton label="Not open yet" size="compact" variant="outline" disabled onPress={() => {}} />
        )}
      </View>
    </View>
  );
}

function RecordingRow({ item, isLast }: { item: ParentOnlineClass; isLast: boolean }) {
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 20, gap: 20, paddingBottom: 32 },
  inClassBanner: {
    backgroundColor: '#12162B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveDotLarge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3DDC84' },
  inClassTextBlock: { flex: 1, gap: 2 },
  inClassTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  inClassSubtitle: { fontFamily: fonts.regular, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
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
});
