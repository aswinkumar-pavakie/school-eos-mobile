// Realtime connection to the messaging microservice's own Socket.IO gateway
// (WSS /messaging/socket -- see school-eos-messaging's messaging.gateway.ts).
// Mirrors push-token.ts's useRegisterPushToken pattern: a status-gated
// effect, failures swallowed (realtime is a background enhancement a screen
// never blocks on). On any inbound event, blanket-invalidates
// messagingV2Keys.all -- same convention as src/features/messaging/hooks.ts
// -- rather than trying to splice a still-encrypted payload into the React
// Query cache by hand. Reconnect re-syncs via a plain query invalidation
// (REST is always the source of truth for durable state; the socket is
// never trusted alone for consistency -- see the gateway's own
// `sync.required` event, handled the same way as every other event here).

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import type { SessionStatus } from '@/lib/auth';
import { getValidAccessToken } from '@/lib/auth';
import { loadDeviceIdentity } from '../e2ee/storage';
import { messagingV2Keys } from '@/features/messaging-v2/hooks';

const RAW_MESSAGING_BASE_URL =
  (Constants.expoConfig?.extra?.messagingApiBaseUrl as string | undefined) ??
  'http://localhost:3001';

// Every real event this app cares about -- see messaging.gateway.ts's own
// client.emit(...) call sites. A blanket invalidate on any of these is
// simple and correct: the UI always re-fetches (and re-decrypts) from REST,
// never trusts a WebSocket payload as authoritative content.
const INVALIDATING_EVENTS = [
  'message.new',
  'message.read',
  'message.accepted',
  'conversation.updated',
  'request.new',
  'request.accepted',
  'request.declined',
  'sync.required',
  'sync.response',
  'typing.started',
  'typing.stopped',
] as const;

export function useMessagingSocket(status: SessionStatus): void {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status !== 'signedIn') {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const identity = await loadDeviceIdentity().catch(() => null);
      const token = await getValidAccessToken().catch(() => null);
      if (cancelled || !identity || !token) return;

      const socket = io(RAW_MESSAGING_BASE_URL, {
        path: '/messaging/socket',
        auth: { token, deviceId: identity.deviceId },
        transports: ['websocket'],
        reconnection: true,
      });

      const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: messagingV2Keys.all });

      for (const event of INVALIDATING_EVENTS) {
        socket.on(event, invalidate);
      }
      // A fresh connect (including every reconnect) always re-syncs from
      // REST -- never assumes the socket alone kept state consistent while
      // it was disconnected.
      socket.on('connect', invalidate);

      socketRef.current = socket;
    })().catch(() => {});

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [status, queryClient]);
}
