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
  type DiscoveryItem,
} from '@/lib/messaging-api';
import { getCurrentPersonId } from '@/lib/auth';
import { createGroupForConversation } from '@/services/e2ee/group';
import {
  discardGroupState,
  getSentPlaintext,
  hasGroupState,
  renameGroupState,
  saveSentPlaintext,
} from '@/services/e2ee/storage';
import { decryptMessageCached, encryptMessage } from '@/services/e2ee/cipher';
import { ensureConversationJoined } from '@/services/messaging/welcome';
import { rememberNamesFromDiscovery } from './nameCache';
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

// Directory pages cap at 100 (Core's own hard limit -- see directory.service.ts
// on the backend). "New message" must show the FULL messaging-enabled
// directory (1000+ real accounts), scoped contacts first then everyone else,
// never just a first page -- so this walks every page via nextCursor and
// hands the screen one combined list. The page cap below is only a runaway
// guard (never expected to be hit for a real school-sized directory).
const DISCOVERY_PAGE_LIMIT = 100;
const DISCOVERY_MAX_PAGES = 200;

export function useDiscoverUsers(search: string) {
  return useQuery({
    queryKey: messagingV2Keys.discovery(search),
    queryFn: async () => {
      const items: DiscoveryItem[] = [];
      const seenUserIds = new Set<string>();
      let cursor: string | undefined;

      for (let page = 0; page < DISCOVERY_MAX_PAGES; page++) {
        const { data } = await discoverUsers({
          search,
          cursor,
          limit: DISCOVERY_PAGE_LIMIT,
        });
        for (const item of data.items) {
          if (seenUserIds.has(item.userId)) continue;
          seenUserIds.add(item.userId);
          items.push(item);
        }
        if (!data.nextCursor || data.nextCursor === cursor) break;
        cursor = data.nextCursor;
      }

      await rememberNamesFromDiscovery(items);
      return { items, nextCursor: null as string | null };
    },
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

/** Real-decrypted messages -- never exposes ciphertext to a caller. Requires
 * the conversation to have already been joined -- `joined` must be
 * useConversationDetail's own isSuccess for this same conversation (see
 * ConversationScreen), NOT just "the conversationId is known": that query is
 * what actually performs the join (ensureConversationJoined), and it's a
 * genuinely separate, independent useQuery from this one. Without this
 * explicit gate, both queries fire the moment the screen mounts with no
 * ordering guarantee between them -- decrypting real cryptographic work
 * (joinGroup, trying each locally-cached KeyPackage) is slower than just
 * fetching+attempting-decrypt, so the decrypt attempt here would routinely
 * win the race and run before the join has actually happened, failing
 * before a real decrypt was ever possible -- not a flaky/rare case, a
 * reliably-losing race every time. */
export function useMessages(conversationId: string | undefined, joined: boolean) {
  return useQuery({
    queryKey: messagingV2Keys.messages(conversationId ?? ''),
    queryFn: async (): Promise<DecryptedMessage[]> => {
      const { data } = await listMessages(conversationId as string);
      const myPersonId = await getCurrentPersonId();
      const decrypted: DecryptedMessage[] = [];
      for (const message of data) {
        // A message THIS person sent can never be decrypted again from its
        // ciphertext -- real forward secrecy discards that key the moment
        // it's used to encrypt (see cipher.ts). Show what was actually typed,
        // cached locally at send time, instead of attempting to decrypt.
        let plaintext: string;
        if (message.senderPersonId === myPersonId) {
          const cached = await getSentPlaintext(conversationId as string, message.clientMessageId);
          plaintext = cached ?? '[Unable to decrypt this message]';
        } else {
          // decryptMessageCached checks the already-decrypted cache and
          // performs the real decrypt inside ONE atomic, per-conversation
          // lock (see its own comment in cipher.ts) -- required because a
          // message can only ever be decrypted once, and this hook re-runs
          // on every visit/refetch/websocket-triggered invalidation, so two
          // overlapping runs racing on the same message is a real,
          // observed case, not a hypothetical one.
          try {
            plaintext = await decryptMessageCached(
              conversationId as string,
              message.id,
              message.ciphertext,
            );
          } catch (err) {
            // A single message that can't be shown (a rare, genuine edge
            // case -- e.g. local storage was cleared) must never blank the
            // whole conversation for every other message in it.
            console.error(
              `[useMessages] decrypt failed for message ${message.id} in conversation ${conversationId}:`,
              err,
            );
            plaintext = '[Unable to decrypt this message]';
          }
        }
        decrypted.push({
          id: message.id,
          conversationId: message.conversationId,
          senderPersonId: message.senderPersonId,
          sequence: message.sequence,
          plaintext,
          createdAt: message.createdAt,
        });
      }
      return decrypted;
    },
    enabled: !!conversationId && joined,
  });
}

export function useSendMessage(conversationId: string) {
  const invalidate = useInvalidateMessagingV2();
  return useMutation({
    mutationFn: async (plaintext: string) => {
      const encrypted = await encryptMessage(conversationId, plaintext);
      const clientMessageId = Crypto.randomUUID();
      const result = await sendMessage(conversationId, {
        clientMessageId,
        ciphertext: encrypted.ciphertext,
        encryptionVersion: encrypted.encryptionVersion,
      });
      // Cache what was actually typed, keyed by this exact send's id -- see
      // useMessages, which shows this instead of re-decrypting (structurally
      // impossible once a forward-secret key has been used to encrypt).
      await saveSentPlaintext(conversationId, clientMessageId, plaintext);
      return result;
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

/** Handles the create-conversation/create-request response for both
 * useStartDirectConversation and useCreateRequest below. When the server
 * says this was a genuinely NEW conversation, the group this device just
 * created locally (under tempGroupId) really is the group -- persist it
 * under the real id, and cache the initial message's plaintext the normal
 * way.
 *
 * When it was NOT new (someone already had an active conversation with this
 * target -- see conversations.service.ts/requests.service.ts's own
 * describeExisting), the server never even looked at this device's
 * mlsWelcome/initialMessage: the real conversation already has its own real
 * group and history. This device's freshly-generated group must be thrown
 * away, never persisted over the real conversationId. If this device
 * already has valid state for that real conversation (the normal case --
 * it's a member, it just already existed), the typed message is sent for
 * real through the ordinary steady-state path instead, so it's never
 * silently lost. If this device has no valid state for it (e.g. local
 * storage was cleared after the conversation was created), sending simply
 * isn't possible from here -- surfaced as a clear error rather than
 * corrupting anything. */
async function finishConversationCreation(
  tempGroupId: string,
  result: { conversationId: string; isNew: boolean },
  plaintext: string | undefined,
  initialClientMessageId: string,
): Promise<void> {
  if (result.isNew) {
    await renameGroupState(tempGroupId, result.conversationId);
    if (plaintext) {
      await saveSentPlaintext(result.conversationId, initialClientMessageId, plaintext);
    }
    return;
  }

  await discardGroupState(tempGroupId);
  if (!plaintext) return;

  if (!(await hasGroupState(result.conversationId))) {
    throw new Error(
      'You already have a conversation with this person, but this device has lost access to it. Open it from your conversations list instead.',
    );
  }
  const clientMessageId = Crypto.randomUUID();
  const encrypted = await encryptMessage(result.conversationId, plaintext);
  await sendMessage(result.conversationId, {
    clientMessageId,
    ciphertext: encrypted.ciphertext,
    encryptionVersion: encrypted.encryptionVersion,
  });
  await saveSentPlaintext(result.conversationId, clientMessageId, plaintext);
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

      const initialClientMessageId = Crypto.randomUUID();
      const initialMessage = input.plaintext
        ? await (async () => {
            const encrypted = await encryptMessage(tempGroupId, input.plaintext!);
            return {
              clientMessageId: initialClientMessageId,
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

      await finishConversationCreation(tempGroupId, result, input.plaintext, initialClientMessageId);
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
      const initialClientMessageId = Crypto.randomUUID();

      const { data: result } = await createRequest({
        targetPersonId: input.targetPersonId,
        mlsWelcome: welcomeWire,
        initialMessage: {
          clientMessageId: initialClientMessageId,
          ciphertext: encrypted.ciphertext,
          encryptionVersion: encrypted.encryptionVersion,
        },
      });

      await finishConversationCreation(tempGroupId, result, input.plaintext, initialClientMessageId);
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
