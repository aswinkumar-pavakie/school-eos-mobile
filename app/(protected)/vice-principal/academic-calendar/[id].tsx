// Vice Principal -> Academic Calendar event detail (Phase 12) -- view-only,
// real backend data only. No create/edit/delete actions -- writes stay
// ADMIN-only on the real serving controller (academic/calendar-events.
// controller.ts), enforced server-side. Scope resolved via the same
// /grades /sections calls already authorized for VP since Phase 4 -- no new
// lookup endpoint.

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/AppHeader';
import { ErrorState } from '@/components/ScreenStates';
import { StatusBadge, type StatusTone } from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { parentColors } from '@/lib/theme';
import { getCalendarEvent } from '@/lib/vice-principal-academic-calendar-api';
import { listGrades, listSections } from '@/lib/vice-principal-students-api';

const cardShadow = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};

function humanize(code: string): string {
  return code
    .split('_')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');
}

function eventTypeMeta(eventType: string, isHoliday: boolean): { label: string; tone: StatusTone } {
  if (isHoliday) return { label: 'Holiday', tone: 'negative' };
  switch (eventType) {
    case 'TERM_START':
    case 'TERM_END':
      return { label: humanize(eventType), tone: 'positive' };
    case 'EXAM_WINDOW':
      return { label: 'Exam window', tone: 'warning' };
    default:
      return { label: humanize(eventType), tone: 'neutral' };
  }
}

export default function VicePrincipalAcademicCalendarDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const eventQuery = useQuery({ queryKey: ['vp-calendar', 'event', id], queryFn: () => getCalendarEvent(id) });
  const gradesQuery = useQuery({
    queryKey: ['vp-calendar', 'grades'],
    queryFn: listGrades,
    enabled: eventQuery.data?.scopeType === 'GRADE' || eventQuery.data?.scopeType === 'SECTION',
  });
  const sectionsQuery = useQuery({
    queryKey: ['vp-calendar', 'sections'],
    queryFn: () => listSections(),
    enabled: eventQuery.data?.scopeType === 'SECTION',
  });

  if (eventQuery.isLoading) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Event" onBack={() => router.back()} />
        <ActivityIndicator color={parentColors.blue} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (eventQuery.isError || !eventQuery.data) {
    return (
      <View style={styles.flex}>
        <AppHeader title="Event" onBack={() => router.back()} />
        <ErrorState
          message={eventQuery.error instanceof ApiError ? eventQuery.error.message : "Couldn't load this event."}
          onRetry={() => eventQuery.refetch()}
        />
      </View>
    );
  }

  const event = eventQuery.data;
  const meta = eventTypeMeta(event.eventType, event.isHoliday);

  let scopeLabel = 'Whole school';
  if (event.scopeType === 'CAMPUS') scopeLabel = 'Specific campus';
  else if (event.scopeType === 'STAGE') scopeLabel = event.scopeStage ? humanize(event.scopeStage) : 'Stage';
  else if (event.scopeType === 'GRADE') {
    const grade = gradesQuery.data?.find((g) => g.id === event.scopeId);
    scopeLabel = grade?.name ?? 'A specific grade';
  } else if (event.scopeType === 'SECTION') {
    const section = sectionsQuery.data?.find((s) => s.id === event.scopeId);
    const grade = section ? gradesQuery.data?.find((g) => g.id === section.gradeId) : undefined;
    scopeLabel = section ? `${grade?.name ?? ''} ${section.name}`.trim() : 'A specific section';
  }

  return (
    <View style={styles.flex}>
      <AppHeader title={event.title} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, cardShadow, styles.headerRow]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.dateText}>
              {formatDate(event.startDate)}
              {event.endDate !== event.startDate ? ` – ${formatDate(event.endDate)}` : ''}
            </Text>
          </View>
          <StatusBadge {...meta} />
        </View>

        {event.description ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.body}>{event.description}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Applies to</Text>
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.body}>{scopeLabel}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: parentColors.background },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dateText: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: parentColors.ink },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  body: { fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', color: parentColors.ink, lineHeight: 20 },
  sectionTitle: { fontSize: 13.5, fontFamily: 'PlusJakartaSans_800ExtraBold', color: parentColors.ink, marginTop: 4 },
});
