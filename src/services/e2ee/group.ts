// MLS group lifecycle for a School EOS conversation: exactly 2 members,
// created once, never resized (see the messaging plan's "How MLS maps onto
// this app"). No Update/Commit rekeying in V1 -- deliberately, not by
// omission: a fixed 2-member group with no membership changes has no
// legitimate post-creation event that would produce one, and per-message
// forward secrecy (the actual property required) already comes from MLS's
// own secret-tree ratchet on every application message, independent of
// whether any Update commit ever fires.

import * as Crypto from 'expo-crypto';
import { createCommit, createGroup, joinGroup, emptyPskIndex } from 'ts-mls';
import { getMlsCiphersuiteImpl } from './setup';
import { generateOwnKeyPackage } from './keyPackage';
import {
  listPoolEntries,
  loadGroupState,
  removeFromPool,
  saveGroupState,
} from './storage';
import { decodeKeyPackageFromWire, encodeWelcomeForWire, decodeWelcomeFromWire } from './wire';

/** Creator flow -- called once, when starting a brand-new conversation.
 * The real School EOS conversation id isn't known until the server responds
 * to POST /conversations or POST /requests, but this plan's own ordering
 * requirement ("persist the post-commit ClientState locally before sending
 * anything") means state must be durably saved before that response
 * arrives -- so this generates its own temporary local id, saves under that,
 * and returns it for the caller to rename (see storage.ts's
 * renameGroupState) once the real conversation id is known.
 *
 * Generates a fresh, never-published KeyPackage for this device's own leaf,
 * creates the group, commits an add-proposal for the target (embedding the
 * ratchet tree via ratchetTreeExtension so the joiner needs nothing else
 * out-of-band), persists the resulting POST-commit state, and returns the
 * wire-encoded Welcome for the caller to attach to the
 * POST /conversations or POST /requests call. */
export async function createGroupForConversation(
  targetKeyPackageWire: string,
): Promise<{ welcomeWire: string; tempGroupId: string }> {
  const impl = await getMlsCiphersuiteImpl();
  const self = await generateOwnKeyPackage();
  const tempGroupId = Crypto.randomUUID();

  let state = await createGroup(
    new TextEncoder().encode(tempGroupId),
    self.publicPackage,
    self.privatePackage,
    [],
    impl,
  );

  const targetKeyPackage = decodeKeyPackageFromWire(targetKeyPackageWire);
  const commitResult = await createCommit(
    { state, cipherSuite: impl },
    {
      extraProposals: [{ proposalType: 'add', add: { keyPackage: targetKeyPackage } }],
      ratchetTreeExtension: true,
    },
  );
  state = commitResult.newState;
  if (!commitResult.welcome) {
    throw new Error('MLS group creation did not produce a Welcome.');
  }

  // Persist the POST-commit state BEFORE returning anything -- an
  // initial chat message must only ever be encrypted against this
  // already-durable state, never the pre-commit one.
  await saveGroupState(tempGroupId, state);

  return { welcomeWire: encodeWelcomeForWire(commitResult.welcome), tempGroupId };
}

/** Joiner flow -- called the first time this device sees a conversation with
 * a pending mlsWelcome. The server never tells the joining client WHICH of
 * its own previously-published KeyPackages a given Welcome targets, so this
 * tries each locally-cached, not-yet-matched pool entry (cheap, local,
 * offline) until one actually decrypts the Welcome, then removes that entry
 * from the pool. Persists the resulting state; the caller is responsible for
 * only then acking the Welcome server-side (see messaging/bootstrap.ts /
 * useConversationSync). */
export async function joinConversationFromWelcome(
  conversationId: string,
  welcomeWire: string,
): Promise<void> {
  const alreadyJoined = await loadGroupState(conversationId);
  if (alreadyJoined) return; // idempotent: a retried ack-less fetch is a safe no-op

  const impl = await getMlsCiphersuiteImpl();
  const welcome = decodeWelcomeFromWire(welcomeWire);
  const pool = await listPoolEntries();

  let joined: { state: Awaited<ReturnType<typeof joinGroup>>; serverId: string } | null = null;
  for (const entry of pool) {
    try {
      const state = await joinGroup(
        welcome,
        entry.publicPackage,
        entry.privatePackage,
        emptyPskIndex,
        impl,
      );
      joined = { state, serverId: entry.serverId };
      break;
    } catch {
      // Wrong KeyPackage for this Welcome -- expected for every pool entry
      // except the one the server actually consumed; try the next.
      continue;
    }
  }

  if (!joined) {
    throw new Error(
      'Could not join this conversation: no locally-cached KeyPackage matches the received Welcome. ' +
        'This device may have republished/replenished since the Welcome was created, or state was lost.',
    );
  }

  await saveGroupState(conversationId, joined.state);
  await removeFromPool(joined.serverId);
}
