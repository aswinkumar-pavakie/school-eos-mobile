// Parent-Teacher Meeting -- 1:1 video call. Native WebRTC via LiveKit; NOT
// usable in Expo Go (see this file's own imports) -- only reachable once
// "Join call" is tapped on an APPROVED booking (faculty/parent-meetings.tsx
// / my-class/meetings/index.tsx), so a driver/other-role user who never taps
// that button never pays the native-module cost. registerGlobals() lives
// here (module scope), not the root _layout.tsx, for exactly that reason --
// importing @livekit/react-native anywhere eagerly loaded would break Expo
// Go for the whole app, not just this screen.
//
// Both Faculty and Parent land on this same screen -- the call itself is
// symmetric (either side can publish+subscribe, see the backend's own
// mintJoinToken grants), only which call-token endpoint gets hit differs.

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { ApiError } from '@/lib/api';
import {
  requestFacultyCallToken,
  requestParentCallToken,
  type MeetingCallCredentials,
} from '@/lib/faculty-parent-meetings-api';
import { parentColors } from '@/lib/theme';

registerGlobals();

export function MeetingCallScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const router = useRouter();
  const { isFaculty: isFacultyRole, isClassTeacherLogin, isLoading: rolesLoading } = useCurrentRoles();
  // A Class Teacher login hosts parent meetings too (the backend's faculty
  // call-token endpoint accepts CLASS_ADVISOR), so it takes the host side.
  const isFaculty = isFacultyRole || isClassTeacherLogin;

  const [credentials, setCredentials] = useState<MeetingCallCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rolesLoading || !bookingId) return;
    let cancelled = false;
    (isFaculty ? requestFacultyCallToken(bookingId) : requestParentCallToken(bookingId))
      .then((creds) => {
        if (!cancelled) setCredentials(creds);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not join the call.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, isFaculty, rolesLoading]);

  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  function leave() {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }

  if (error) {
    return (
      <View style={styles.centerFlex}>
        <Ionicons name="alert-circle-outline" size={32} color="#B33A2E" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.leaveButton} onPress={leave}>
          <Text style={styles.leaveButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!credentials) {
    return (
      <View style={styles.centerFlex}>
        <ActivityIndicator color={parentColors.blue} size="large" />
        <Text style={styles.loadingText}>Connecting…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <LiveKitRoom
        serverUrl={credentials.url}
        token={credentials.token}
        connect
        audio
        video
        options={{ adaptiveStream: { pixelDensity: 'screen' } }}
        onDisconnected={leave}
      >
        <CallRoom onLeave={leave} />
      </LiveKitRoom>
    </View>
  );
}

function CallRoom({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera]);
  const remoteTrack = tracks.find((t) => !t.participant.isLocal);
  const localTrack = tracks.find((t) => t.participant.isLocal);

  return (
    <View style={styles.flex}>
      <View style={styles.remoteWrap}>
        {remoteTrack && isTrackReference(remoteTrack) ? (
          <VideoTrack trackRef={remoteTrack} style={styles.remoteVideo} />
        ) : (
          <View style={styles.remoteWaiting}>
            <Ionicons name="person-circle-outline" size={72} color="#8494AB" />
            <Text style={styles.remoteWaitingText}>Waiting for the other person to join…</Text>
          </View>
        )}
        {localTrack ? <LocalPreview trackRef={localTrack} /> : null}
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.controlButton, !isMicrophoneEnabled && styles.controlButtonOff]}
          onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        >
          <Ionicons name={isMicrophoneEnabled ? 'mic-outline' : 'mic-off-outline'} size={22} color="#fff" />
        </Pressable>
        <Pressable
          style={[styles.controlButton, !isCameraEnabled && styles.controlButtonOff]}
          onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        >
          <Ionicons name={isCameraEnabled ? 'videocam-outline' : 'videocam-off-outline'} size={22} color="#fff" />
        </Pressable>
        <Pressable
          style={styles.leaveControlButton}
          onPress={() => {
            room.disconnect();
            onLeave();
          }}
        >
          <Ionicons name="call-outline" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function LocalPreview({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
  if (!isTrackReference(trackRef)) return null;
  return (
    <View style={styles.localPreviewWrap}>
      <VideoTrack trackRef={trackRef} style={styles.localVideo} mirror />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0F1B33' },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1B33', gap: 12, padding: 20 },
  loadingText: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  errorText: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, textAlign: 'center' },
  leaveButton: { marginTop: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: parentColors.blue },
  leaveButtonText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  remoteWrap: { flex: 1, position: 'relative' },
  remoteVideo: { flex: 1 },
  remoteWaiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  remoteWaitingText: { color: '#8494AB', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  localPreviewWrap: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideo: { flex: 1 },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 24,
    paddingBottom: 40,
    backgroundColor: '#0F1B33',
  },
  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  controlButtonOff: { backgroundColor: '#B33A2E' },
  leaveControlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B33A2E',
    transform: [{ rotate: '135deg' }],
  },
});
