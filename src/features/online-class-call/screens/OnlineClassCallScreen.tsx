// Online Class -- in-app LiveKit call, mobile. Follows meeting-call's own
// MeetingCallScreen.tsx pattern exactly (registerGlobals() at module scope
// only, Track from 'livekit-client' not '@livekit/react-native', AudioSession
// lifecycle) since that screen is the already-verified reference for native
// WebRTC on this app -- NOT usable in Expo Go, only reached once a faculty
// taps Start/Resume or a parent taps Join on the online-classes screens.
//
// Adds roster (participants + raise-hand + faculty-only remote mute) and chat
// panels beyond the 1:1 meeting-call screen, since Online Class is
// multi-party -- both via @livekit/react-native's re-exported
// @livekit/components-react hooks (useParticipants, useChat, useDataChannel
// aren't 1:1-specific, they work the same for N participants). Screen share
// is NOT built here (Phase 1 scope, matches the website build) -- ReplayKit/
// foreground-service setup for native screen share is real additional native
// config, deferred rather than half-built.

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AudioSession,
  LiveKitRoom,
  registerGlobals,
  useChat,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  VideoTrack,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track, type Participant } from 'livekit-client';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentRoles } from '@/hooks/useCurrentRoles';
import { ApiError } from '@/lib/api';
import {
  endOnlineClassCall,
  muteOnlineClassParticipant,
  requestOnlineClassCallToken,
  type OnlineClassCallCredentials,
} from '@/features/online-classes/api';
import { parentColors } from '@/lib/theme';

registerGlobals();

export function OnlineClassCallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFaculty, isLoading: rolesLoading } = useCurrentRoles();

  const [credentials, setCredentials] = useState<OnlineClassCallCredentials | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rolesLoading || !id) return;
    let cancelled = false;
    requestOnlineClassCallToken(id)
      .then((creds) => {
        if (!cancelled) setCredentials(creds);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not join this class.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, rolesLoading]);

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

  if (!credentials || rolesLoading) {
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
        <CallRoom classId={id} role={isFaculty ? 'faculty' : 'parent'} onLeave={leave} />
      </LiveKitRoom>
    </View>
  );
}

type Role = 'faculty' | 'parent';
type Panel = null | 'students' | 'chat';

function CallRoom({ classId, role, onLeave }: { classId: string; role: Role; onLeave: () => void }) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks([Track.Source.Camera]);
  const { chatMessages, send: sendChat } = useChat();

  const remoteTrack = tracks.find((t) => !t.participant.isLocal);
  const localTrack = tracks.find((t) => t.participant.isLocal);

  const [panel, setPanel] = useState<Panel>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [ending, setEnding] = useState(false);

  const raisedCount = useMemo(
    () => participants.filter((p) => p.attributes?.handRaised === 'true').length,
    [participants],
  );

  function toggleHandRaise() {
    const next = !handRaised;
    setHandRaised(next);
    localParticipant.setAttributes({ handRaised: next ? 'true' : 'false' }).catch(() => undefined);
  }

  async function handleEnd() {
    setEnding(true);
    try {
      await endOnlineClassCall(classId);
    } catch {
      // Still leave even if the state-transition call fails -- never trap faculty on
      // a call screen they explicitly asked to end.
    }
    room.disconnect();
    onLeave();
  }

  async function handleMute(identity: string, muted: boolean) {
    try {
      await muteOnlineClassParticipant(classId, identity, muted);
    } catch {
      // Best-effort -- the roster panel just won't reflect the change; not worth a
      // blocking alert mid-call.
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.remoteWrap}>
        {remoteTrack && isTrackReference(remoteTrack) ? (
          <VideoTrack trackRef={remoteTrack} style={styles.remoteVideo} />
        ) : (
          <View style={styles.remoteWaiting}>
            <Ionicons name="person-circle-outline" size={72} color="#8494AB" />
            <Text style={styles.remoteWaitingText}>
              {role === 'faculty' ? 'Waiting for students to join…' : 'Waiting for the teacher…'}
            </Text>
          </View>
        )}
        {localTrack ? <LocalPreview trackRef={localTrack} /> : null}

        <View style={styles.topPillRow}>
          <View style={styles.pill}>
            <Ionicons name="people-outline" size={14} color="#fff" />
            <Text style={styles.pillText}>{participants.length} in class</Text>
          </View>
          {raisedCount > 0 && (
            <Pressable style={[styles.pill, styles.pillAmber]} onPress={() => setPanel('students')}>
              <Text style={styles.pillText}>✋ {raisedCount}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          style={[styles.controlButton, !isMicrophoneEnabled && styles.controlButtonOff]}
          onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        >
          <Ionicons name={isMicrophoneEnabled ? 'mic-outline' : 'mic-off-outline'} size={20} color="#fff" />
        </Pressable>
        <Pressable
          style={[styles.controlButton, !isCameraEnabled && styles.controlButtonOff]}
          onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        >
          <Ionicons name={isCameraEnabled ? 'videocam-outline' : 'videocam-off-outline'} size={20} color="#fff" />
        </Pressable>
        <Pressable style={styles.controlButton} onPress={() => setPanel(panel === 'students' ? null : 'students')}>
          <Ionicons name="people-outline" size={20} color="#fff" />
        </Pressable>
        {role === 'parent' && (
          <Pressable
            style={[styles.controlButton, handRaised && styles.controlButtonAmber]}
            onPress={toggleHandRaise}
          >
            <Text style={{ fontSize: 18 }}>✋</Text>
          </Pressable>
        )}
        <Pressable style={styles.controlButton} onPress={() => setPanel(panel === 'chat' ? null : 'chat')}>
          <Ionicons name="chatbubble-outline" size={20} color="#fff" />
        </Pressable>
        <Pressable
          style={styles.leaveControlButton}
          onPress={role === 'faculty' ? handleEnd : () => { room.disconnect(); onLeave(); }}
        >
          {ending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="call-outline" size={20} color="#fff" />}
        </Pressable>
      </View>

      <Modal visible={panel === 'students'} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
        <StudentsPanel
          participants={participants}
          localIdentity={localParticipant.identity}
          canModerate={role === 'faculty'}
          onMute={handleMute}
          onClose={() => setPanel(null)}
        />
      </Modal>
      <Modal visible={panel === 'chat'} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
        <ChatPanel messages={chatMessages} onSend={sendChat} onClose={() => setPanel(null)} />
      </Modal>
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

function StudentsPanel({
  participants,
  localIdentity,
  canModerate,
  onMute,
  onClose,
}: {
  participants: Participant[];
  localIdentity: string;
  canModerate: boolean;
  onMute: (identity: string, muted: boolean) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.sheetBackdrop}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetTitle}>In class · {participants.length}</Text>
          <Pressable onPress={onClose} style={styles.sheetCloseButton}>
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 360 }}>
          {participants.map((p) => {
            const isSelf = p.identity === localIdentity;
            const raised = p.attributes?.handRaised === 'true';
            const muted = !p.isMicrophoneEnabled;
            return (
              <View key={p.identity} style={styles.rosterRow}>
                <View style={styles.rosterAvatar}>
                  <Text style={styles.rosterAvatarText}>{(p.name ?? p.identity).slice(0, 2).toUpperCase()}</Text>
                </View>
                <Text style={styles.rosterName} numberOfLines={1}>
                  {p.name ?? p.identity}
                  {isSelf ? ' (you)' : ''}
                </Text>
                {raised && <Text style={{ fontSize: 16 }}>✋</Text>}
                {canModerate && !isSelf ? (
                  <Pressable style={styles.rosterMuteButton} onPress={() => onMute(p.identity, !muted)}>
                    <Text style={styles.rosterMuteButtonText}>{muted ? 'Unmute' : 'Mute'}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.rosterMutedLabel}>{muted ? 'Muted' : ''}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function ChatPanel({
  messages,
  onSend,
  onClose,
}: {
  messages: { timestamp: number; message: string; from?: { identity: string; name?: string; isLocal?: boolean } }[];
  onSend: (message: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setDraft('');
    try {
      await onSend(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.sheetBackdrop}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeaderRow}>
          <Text style={styles.sheetTitle}>Class chat</Text>
          <Pressable onPress={onClose} style={styles.sheetCloseButton}>
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 280 }}>
          {messages.length === 0 && <Text style={styles.chatEmpty}>No messages yet — say hello.</Text>}
          {messages.map((m) => (
            <View key={m.timestamp} style={{ alignSelf: m.from?.isLocal ? 'flex-end' : 'flex-start', maxWidth: '82%', marginBottom: 8 }}>
              <Text style={styles.chatFrom}>{m.from?.isLocal ? 'You' : m.from?.name ?? m.from?.identity ?? 'Someone'}</Text>
              <View style={[styles.chatBubble, m.from?.isLocal && styles.chatBubbleSelf]}>
                <Text style={styles.chatBubbleText}>{m.message}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.chatInputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the class"
            placeholderTextColor="#8494AB"
            style={styles.chatInput}
            onSubmitEditing={submit}
          />
          <Pressable style={styles.chatSendButton} disabled={sending || !draft.trim()} onPress={submit}>
            <Ionicons name="send" size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
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
  topPillRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,16,28,0.72)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillAmber: { backgroundColor: '#B45309' },
  pillText: { color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12 },
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
    gap: 14,
    paddingVertical: 20,
    paddingBottom: 36,
    backgroundColor: '#0F1B33',
    flexWrap: 'wrap',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  controlButtonOff: { backgroundColor: '#B33A2E' },
  controlButtonAmber: { backgroundColor: '#B45309' },
  leaveControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B33A2E',
    transform: [{ rotate: '135deg' }],
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#101B30',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  sheetCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rosterAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterAvatarText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11 },
  rosterName: { flex: 1, color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13.5 },
  rosterMuteButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  rosterMuteButtonText: { color: '#22C55E', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11.5 },
  rosterMutedLabel: { color: 'rgba(255,255,255,0.4)', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11.5 },
  chatEmpty: { color: 'rgba(255,255,255,0.45)', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12.5, paddingVertical: 8 },
  chatFrom: { color: 'rgba(255,255,255,0.45)', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.5, marginBottom: 2 },
  chatBubble: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  chatBubbleSelf: { backgroundColor: parentColors.blue },
  chatBubbleText: { color: '#fff', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 13 },
  chatInputRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  chatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#fff',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
  },
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: parentColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
