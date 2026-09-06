import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ApiError } from '@/lib/api';
import { colors, fonts } from '@/lib/theme';
import { hasRole, useMe } from '@/hooks/useMe';
import { GradientHeader } from '@/components/GradientHeader';
import { PrimaryButton } from '../components/PrimaryButton';
import { SessionStatusPill } from '../components/SessionStatusPill';
import { ErrorState, LoadingState } from '@/components/ScreenStates';
import {
  useAddOnlineClassRecording,
  useCancelOnlineClass,
  useCompleteOnlineClass,
  useJoinOnlineClass,
  useOnlineClassDetail,
  useStartOnlineClass,
} from '../hooks';
import type { FacultyOnlineClass, OnlineClassStatus, ParentOnlineClass } from '../types';
import { canAttemptJoin, formatClassDate, formatClassTimeRange } from '../utils';

const STATUS_LABEL: Record<OnlineClassStatus, string> = {
  DRAFT: 'Setting up',
  SCHEDULED: 'Scheduled',
  LIVE: 'Live now',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

interface OnlineClassDetailScreenProps {
  id: string;
  /** The route family this screen was reached under -- reschedule is a sibling
   * route, and which stack it must push into depends on which entry point (the
   * old generic `/online-classes` list, or the new Academics tab's own nested
   * stack) hosted this screen. Pushing to the wrong one jumps across a hidden
   * tab boundary and breaks back-navigation. */
  basePath?: string;
}

export function OnlineClassDetailScreen({ id, basePath = '/(protected)/online-classes' }: OnlineClassDetailScreenProps) {
  const router = useRouter();
  const me = useMe();
  const isFaculty = hasRole(me.data?.roles, 'FACULTY');

  const detail = useOnlineClassDetail(id);
  const join = useJoinOnlineClass();
  const start = useStartOnlineClass(id);
  const complete = useCompleteOnlineClass(id);
  const cancel = useCancelOnlineClass(id);
  const addRecording = useAddOnlineClassRecording(id);

  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [recordingMode, setRecordingMode] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');

  function reportError(err: unknown, fallback: string) {
    Alert.alert('Something went wrong', err instanceof ApiError ? err.message : fallback);
  }

  async function handleParentJoin() {
    try {
      const result = await join.mutateAsync(id);
      await Linking.openURL(result.meetingUrl);
    } catch (err) {
      reportError(err, 'Unable to join this class right now.');
    }
  }

  async function handleStart() {
    try {
      await start.mutateAsync();
    } catch (err) {
      reportError(err, 'Unable to start this class.');
    }
  }

  async function handleComplete() {
    try {
      await complete.mutateAsync();
    } catch (err) {
      reportError(err, 'Unable to mark this class as completed.');
    }
  }

  async function handleConfirmCancel() {
    try {
      await cancel.mutateAsync({ reason: cancelReason.trim() || undefined });
      setCancelMode(false);
      setCancelReason('');
    } catch (err) {
      reportError(err, 'Unable to cancel this class.');
    }
  }

  async function handleConfirmRecording() {
    if (!recordingUrl.trim()) return;
    try {
      await addRecording.mutateAsync({ recordingUrl: recordingUrl.trim() });
      setRecordingMode(false);
      setRecordingUrl('');
    } catch (err) {
      reportError(err, 'Unable to save the recording link.');
    }
  }

  if (detail.isLoading || me.isLoading) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Online class" onBack={() => router.back()} />
        <LoadingState />
      </View>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Online class" onBack={() => router.back()} />
        <ErrorState
          message={detail.error instanceof ApiError ? detail.error.message : 'Unable to load this class.'}
          onRetry={() => detail.refetch()}
        />
      </View>
    );
  }

  const item = detail.data;

  return (
    <View style={styles.screen}>
      <GradientHeader title={item.subjectName} subtitle={item.topic} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardMeta}>
              {item.gradeName} - {item.sectionName}
            </Text>
            <SessionStatusPill status={item.status} label={STATUS_LABEL[item.status]} />
          </View>

          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

          <View style={styles.cardDivider} />
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleValue}>{formatClassDate(item.scheduledDate)}</Text>
            <Text style={styles.scheduleValue}>{formatClassTimeRange(item.startTime, item.endTime)}</Text>
          </View>
        </View>

        {item.status === 'CANCELLED' && item.cancellationReason ? (
          <View style={styles.noticeBlock}>
            <Text style={styles.noticeLabel}>Cancelled</Text>
            <Text style={styles.noticeText}>{item.cancellationReason}</Text>
          </View>
        ) : null}

        {isFaculty ? (
          <FacultyActions
            item={item as FacultyOnlineClass}
            onStart={handleStart}
            starting={start.isPending}
            onComplete={handleComplete}
            completing={complete.isPending}
            cancelMode={cancelMode}
            setCancelMode={setCancelMode}
            cancelReason={cancelReason}
            setCancelReason={setCancelReason}
            onConfirmCancel={handleConfirmCancel}
            cancelling={cancel.isPending}
            recordingMode={recordingMode}
            setRecordingMode={setRecordingMode}
            recordingUrl={recordingUrl}
            setRecordingUrl={setRecordingUrl}
            onConfirmRecording={handleConfirmRecording}
            savingRecording={addRecording.isPending}
            onReschedule={() => router.push(`${basePath}/${id}/reschedule` as never)}
          />
        ) : (
          <ParentActions item={item as ParentOnlineClass} onJoin={handleParentJoin} joining={join.isPending} />
        )}
      </ScrollView>
    </View>
  );
}

function FacultyActions(props: {
  item: FacultyOnlineClass;
  onStart: () => void;
  starting: boolean;
  onComplete: () => void;
  completing: boolean;
  cancelMode: boolean;
  setCancelMode: (v: boolean) => void;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  onConfirmCancel: () => void;
  cancelling: boolean;
  recordingMode: boolean;
  setRecordingMode: (v: boolean) => void;
  recordingUrl: string;
  setRecordingUrl: (v: string) => void;
  onConfirmRecording: () => void;
  savingRecording: boolean;
  onReschedule: () => void;
}) {
  const { item } = props;
  const canReschedule = item.status === 'DRAFT' || item.status === 'SCHEDULED';
  const canCancel = canReschedule;

  return (
    <View style={styles.actions}>
      {item.status === 'DRAFT' ? (
        <Text style={styles.meetingStatusText}>
          {item.meetingCreationStatus === 'FAILED'
            ? `Meeting setup failed: ${item.meetingCreationError ?? 'unknown error'}`
            : 'Setting up the Google Meet link...'}
        </Text>
      ) : null}

      {item.status === 'LIVE' && item.meetingUrl ? (
        <PrimaryButton label="Join meeting" variant="accent" onPress={() => Linking.openURL(item.meetingUrl as string)} />
      ) : null}

      {item.status === 'SCHEDULED' ? (
        <PrimaryButton label="Start class" variant="accent" onPress={props.onStart} loading={props.starting} />
      ) : null}

      {item.status === 'LIVE' ? (
        <PrimaryButton label="Mark completed" onPress={props.onComplete} loading={props.completing} variant="outline" />
      ) : null}

      {item.status === 'COMPLETED' ? (
        item.recordingUrl ? (
          <PrimaryButton
            label="Open recording"
            variant="outline"
            onPress={() => Linking.openURL(item.recordingUrl as string)}
          />
        ) : props.recordingMode ? (
          <View style={styles.inlineForm}>
            <TextInput
              value={props.recordingUrl}
              onChangeText={props.setRecordingUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
            />
            <View style={styles.inlineFormRow}>
              <PrimaryButton
                label="Save recording"
                size="compact"
                variant="accent"
                onPress={props.onConfirmRecording}
                loading={props.savingRecording}
              />
              <PrimaryButton
                label="Cancel"
                size="compact"
                variant="outline"
                onPress={() => props.setRecordingMode(false)}
              />
            </View>
          </View>
        ) : (
          <PrimaryButton label="Add recording" variant="outline" onPress={() => props.setRecordingMode(true)} />
        )
      ) : null}

      {canReschedule ? <PrimaryButton label="Reschedule" variant="outline" onPress={props.onReschedule} /> : null}

      {canCancel ? (
        props.cancelMode ? (
          <View style={styles.inlineForm}>
            <TextInput
              value={props.cancelReason}
              onChangeText={props.setCancelReason}
              placeholder="Reason (optional)"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.inlineFormRow}>
              <PrimaryButton
                label="Confirm cancel"
                size="compact"
                variant="danger"
                onPress={props.onConfirmCancel}
                loading={props.cancelling}
              />
              <PrimaryButton
                label="Never mind"
                size="compact"
                variant="outline"
                onPress={() => props.setCancelMode(false)}
              />
            </View>
          </View>
        ) : (
          <PrimaryButton label="Cancel class" variant="danger" onPress={() => props.setCancelMode(true)} />
        )
      ) : null}
    </View>
  );
}

function ParentActions({
  item,
  onJoin,
  joining,
}: {
  item: ParentOnlineClass;
  onJoin: () => void;
  joining: boolean;
}) {
  if (canAttemptJoin(item)) {
    return (
      <View style={styles.actions}>
        <PrimaryButton label="Join class" variant="accent" onPress={onJoin} loading={joining} />
      </View>
    );
  }
  if (item.status === 'COMPLETED' && item.recordingUrl) {
    return (
      <View style={styles.actions}>
        <PrimaryButton
          label="Watch recording"
          variant="outline"
          onPress={() => Linking.openURL(item.recordingUrl as string)}
        />
      </View>
    );
  }
  if (item.status === 'DRAFT' || item.status === 'SCHEDULED') {
    return (
      <View style={styles.actions}>
        <PrimaryButton label="Not open yet" variant="outline" disabled onPress={() => {}} />
        <Text style={styles.helperText}>The meeting link is not ready yet. Check back closer to the class time.</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20, paddingBottom: 32 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardMeta: { fontFamily: fonts.medium, fontSize: 13, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  cardDivider: { height: 1, backgroundColor: colors.border, marginTop: 4 },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10 },
  scheduleValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  noticeBlock: { backgroundColor: colors.errorBg, borderRadius: 16, padding: 16, gap: 4 },
  noticeLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.errorText, textTransform: 'uppercase' },
  noticeText: { fontFamily: fonts.regular, fontSize: 14, color: colors.errorText },
  actions: { gap: 10 },
  helperText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  meetingStatusText: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  inlineForm: { gap: 10 },
  inlineFormRow: { flexDirection: 'row', gap: 8 },
  input: {
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
});
