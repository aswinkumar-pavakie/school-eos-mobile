// In-app recording playback -- real, working video player (native controls:
// play/pause, scrub, fullscreen), not a hand-rolled one. Plays whatever real
// URL is actually stored in online_class.recording_url -- there is currently
// no automated capture (LiveKit Egress) wiring a recording there, so this
// screen only ever has something to play once a faculty member has manually
// attached a real recording link via "Add recording" (see
// OnlineClassDetailScreen). The player itself doesn't care how the URL got
// there; it's real playback of a real video either way, not a mock.

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { GradientHeader } from '@/components/GradientHeader';
import { colors, fonts } from '@/lib/theme';
import { useOnlineClassDetail } from '../hooks';
import { formatClassDate } from '../utils';

export function RecordingPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const detail = useOnlineClassDetail(id);
  const recordingUrl = detail.data?.recordingUrl ?? null;

  const player = useVideoPlayer(recordingUrl ?? null, (p) => {
    p.loop = false;
  });
  const { status, error: playerError } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    if (recordingUrl && status === 'readyToPlay') {
      player.play();
    }
  }, [recordingUrl, status, player]);

  if (detail.isLoading) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Recording" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Recording" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Couldn&apos;t load this recording.</Text>
        </View>
      </View>
    );
  }

  if (!recordingUrl) {
    return (
      <View style={styles.screen}>
        <GradientHeader title="Recording" onBack={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="videocam-off-outline" size={32} color={colors.textMuted} />
          <Text style={styles.errorText}>No recording is available for this class yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <GradientHeader
        title={detail.data.subjectName}
        subtitle={`${detail.data.topic} · ${formatClassDate(detail.data.scheduledDate)}`}
        onBack={() => router.back()}
      />
      <View style={styles.playerWrap}>
        {status === 'error' ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={28} color="#fff" />
            <Text style={styles.errorTextLight}>
              {playerError?.message ?? 'Could not play this recording.'}
            </Text>
          </View>
        ) : (
          <>
            <VideoView
              style={styles.video}
              player={player}
              nativeControls
              contentFit="contain"
            />
            {status === 'loading' && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  errorText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  errorTextLight: { fontFamily: fonts.medium, fontSize: 14, color: '#fff', textAlign: 'center' },
  playerWrap: {
    flex: 1,
    backgroundColor: '#0B1220',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  video: { width: '100%', aspectRatio: 16 / 9 },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,18,32,0.5)',
  },
});
