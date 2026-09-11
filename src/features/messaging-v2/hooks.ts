// TanStack Query hooks for the new E2EE messaging feature -- same
// <feature>Keys.all root + useInvalidate<Feature>() blanket-invalidate
// convention as src/features/messaging/hooks.ts and
// src/features/online-classes/hooks.ts. Every hook here that touches message
// content encrypts/decrypts through src/services/e2ee/cipher.ts -- the UI
// never sees ciphertext.

import * as Crypto from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createConversation,
  createRequest,
  discoverUsers,
  getConversation,
  getKeyBundle,
  listConversations,
  listMessages,
  listRequests,
  acceptRequest,
  cancelRequest,
  declineRequest,
  markRead,
  sendMessage,
  type ConversationSummary,
} from '@/lib/messaging-api';
import { createGroupForConversation } from '@/services/e2ee/group';
import { renameGroupState } from '@/services/e2ee/storage';
import { decryptMessage, encryptMessage } from '@/services/e2ee/cipher';
import { ensureConversationJoined } from '@/services/messaging/welcome';
import type { DecryptedMessage } from './types';

export const messagingV2Keys = {
  all: ['messaging-v2'] as const,
  discovery: (search: string) => ['messaging-v2', 'discovery', search] as const,
  conversations: ['messaging-v2', 'conversations'] as const,
  conversation: (id: string) => ['messaging-v2', 'conversations', id] as const,
  messages: (id: string) => ['messaging-v2', 'conversations', id, 'messages'] as const,
  requests: (status: string, as: string) =>
    ['messaging-v2', 'requests', status, as] as const,
};

function useInvalidateMessagingV2() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: messagingV2Keys.all });
}

// ---- Discovery -------------------------------------------------------------

export function useDiscoverUsers(search: string) {
  return useQuery({
    queryKey: messagingV2Keys.discovery(search),
    queryFn: async () => (await discoverUsers({ search })).data,
  });
}

// ---- Conversations -----------------------------------------------------

export function useConversations() {
  return useQuery({
    queryKey: messagingV2Keys.conversations,
    queryFn: async () => (await listConversations()).data,
  });
}

/** Fetches the conversation, and transparently joins it first if it has a
 * pending, not-yet-delivered MLS Welcome (see messaging/welcome.ts) --
 * exactly the "opening a conversation triggers the join" behavior the plan
 * describes. */
export function useConversationDetail(id: string | undefined) {
  return useQuery({
    queryKey: messagingV2Keys.conversation(id ?? ''),
    queryFn: async () => {
      const { data } = await getConversation(id as string);
      await ensureConversationJoined(data);
      return data;
    },
    enabled: !!id,
  });
}

/** Real-decrypted messages -- never exposes ciphertext to a caller. Assumes
 * the conversation was already joined (via useConversationDetail, which the
 * conversation screen always calls first). */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: messagingV2Keys.messages(conversationId ?? ''),
    queryFn: async (): Promise<DecryptedMessage[]> => {
      const { data } = await listMessages(conversationId as string);
      const decrypted: DecryptedMessage[] = [];
      for (const message of data) {
        decrypted.push({
          id: message.id,
          conversationId: message.conversationId,
          senderPersonId: message.senderPersonId,
          sequence: message.sequence,
          plaintext: await decryptMessage(conversationId as string, message.ciphertext),
          createdAt: message.createdAt,
        });
      }
      return decrypted;
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage(conversationId: string) {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: async (plaintext: string) => {
      const encrypted = await encryptMessage(conversationId, plaintext);
      return sendMessage(conversationId, {
        clientMessageId: Crypto.randomUUID(),
        ciphertext: encrypted.ciphertext,
        encryptionVersion: encrypted.encryptionVersion,
      });
    },
    onSuccess: () => invalidate(),
  });
}

export function useMarkRead(conversationId: string) {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: (sequence: number) => markRead(conversationId, sequence),
    onSuccess: () => invalidate(),
  });
}

/** Starts a new conversation with someone already ALLOW_DIRECT-eligible
 * (per discovery's own messagingMode field -- the UI decides DIRECT vs
 * REQUEST from that, this hook just executes the DIRECT path). Fetches the
 * target's published MLS KeyPackage, creates the group locally, sends the
 * Welcome (and, if given, an encrypted first message) in the same
 * POST /conversations call, then renames the temp-keyed local group state to
 * the real, server-confirmed conversation id. */
export function useStartDirectConversation() {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: async (input: { targetPersonId: string; plaintext?: string }) => {
      const { data: bundles } = await getKeyBundle(input.targetPersonId);
      const bundle = bundles.find((b) => b.mlsKeyPackage);
      if (!bundle?.mlsKeyPackage) {
        throw new Error(
          'This person has not finished setting up secure messaging on any device yet.',
        );
      }

      const { welcomeWire, tempGroupId } = await createGroupForConversation(
        bundle.mlsKeyPackage.data,
      );

      const initialMessage = input.plaintext
        ? await (async () => {
            const encrypted = await encryptMessage(tempGroupId, input.plaintext!);
            return {
              clientMessageId: Crypto.randomUUID(),
              ciphertext: encrypted.ciphertext,
              encryptionVersion: encrypted.encryptionVersion,
            };
          })()
        : undefined;

      const { data: result } = await createConversation({
        targetPersonId: input.targetPersonId,
        mlsWelcome: welcomeWire,
        initialMessage,
      });

      await renameGroupState(tempGroupId, result.conversationId);
      return result;
    },
    onSuccess: () => invalidate(),
  });
}

/** Same shape as useStartDirectConversation, but for an UNSCOPED target
 * (messagingMode REQUEST) -- initialMessage is mandatory here, matching
 * POST /requests's own DTO contract. */
export function useCreateRequest() {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: async (input: { targetPersonId: string; plaintext: string }) => {
      const { data: bundles } = await getKeyBundle(input.targetPersonId);
      const bundle = bundles.find((b) => b.mlsKeyPackage);
      if (!bundle?.mlsKeyPackage) {
        throw new Error(
          'This person has not finished setting up secure messaging on any device yet.',
        );
      }

      const { welcomeWire, tempGroupId } = await createGroupForConversation(
        bundle.mlsKeyPackage.data,
      );
      const encrypted = await encryptMessage(tempGroupId, input.plaintext);

      const { data: result } = await createRequest({
        targetPersonId: input.targetPersonId,
        mlsWelcome: welcomeWire,
        initialMessage: {
          clientMessageId: Crypto.randomUUID(),
          ciphertext: encrypted.ciphertext,
          encryptionVersion: encrypted.encryptionVersion,
        },
      });

      await renameGroupState(tempGroupId, result.conversationId);
      return result;
    },
    onSuccess: () => invalidate(),
  });
}

// ---- Requests --------------------------------------------------------------

export function useRequests(
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED',
  as: 'recipient' | 'requester',
) {
  return useQuery({
    queryKey: messagingV2Keys.requests(status, as),
    queryFn: async () => (await listRequests({ status, as })).data,
  });
}

export function useAcceptRequest() {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: (id: string) => acceptRequest(id),
    onSuccess: () => invalidate(),
  });
}

export function useDeclineRequest() {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: (id: string) => declineRequest(id),
    onSuccess: () => invalidate(),
  });
}

export function useCancelRequest() {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: (id: string) => cancelRequest(id),
    onSuccess: () => invalidate(),
  });
}

export type { ConversationSummary };
