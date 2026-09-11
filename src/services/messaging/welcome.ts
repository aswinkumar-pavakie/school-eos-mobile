// Orchestrates the retry-safe Welcome-join flow: fetch (already done by the
// caller, via the conversation's own mlsWelcome field) -> join locally ->
// persist -> ONLY THEN ack server-side. Deliberately separate from
// e2ee/group.ts (pure crypto+storage, no network) -- this is the one place
// that combines crypto with the network call, and the ordering here is the
// actual retry-safety contract: if anything before the ack throws, the next
// attempt simply re-reads the same still-undelivered Welcome and retries;
// joinConversationFromWelcome's own "already joined?" check makes a retry
// after a successful local join (but a failed ack) a safe no-op, not a
// double-join.

import { ackConversationWelcome, type ConversationSummary } from '@/lib/messaging-api';
import { joinConversationFromWelcome } from '../e2ee/group';

export async function ensureConversationJoined(
  conversation: Pick<ConversationSummary, 'id' | 'mlsWelcome'>,
): Promise<void> {
  if (!conversation.mlsWelcome) return;
  await joinConversationFromWelcome(conversation.id, conversation.mlsWelcome);
  await ackConversationWelcome(conversation.id);
}
