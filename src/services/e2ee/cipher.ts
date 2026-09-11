// Application-message encryption/decryption -- the steady-state path used
// for every message after a conversation's group already exists. Per-message
// forward secrecy comes from MLS's own secret-tree ratchet advancing on
// every single call here, independent of any Update commit (see group.ts).

import {
  createApplicationMessage,
  decodeMlsMessage,
  emptyPskIndex,
  encodeMlsMessage,
  processMessage,
} from 'ts-mls';
import { fromBase64, toBase64 } from './codec';
import { getMlsCiphersuiteImpl, MLS_ENCRYPTION_VERSION } from './setup';
import { loadGroupState, saveGroupState } from './storage';

export class NoGroupStateError extends Error {
  constructor(conversationId: string) {
    super(
      `No local MLS group state for conversation ${conversationId} -- join it (see group.ts) before sending or receiving.`,
    );
    this.name = 'NoGroupStateError';
  }
}

export interface EncryptedMessage {
  ciphertext: string; // base64, opaque to the server
  encryptionVersion: string;
}

/** Encrypts one outgoing message. Advances and durably persists this
 * conversation's group state BEFORE returning -- a send must never be
 * transmitted from state that could not be saved (see storage.ts's own
 * contract). */
export async function encryptMessage(
  conversationId: string,
  plaintext: string,
): Promise<EncryptedMessage> {
  const state = await loadGroupState(conversationId);
  if (!state) throw new NoGroupStateError(conversationId);

  const impl = await getMlsCiphersuiteImpl();
  const result = await createApplicationMessage(
    state,
    new TextEncoder().encode(plaintext),
    impl,
  );

  await saveGroupState(conversationId, result.newState);

  const wire = encodeMlsMessage({
    privateMessage: result.privateMessage,
    wireformat: 'mls_private_message',
    version: 'mls10',
  });
  return { ciphertext: toBase64(wire), encryptionVersion: MLS_ENCRYPTION_VERSION };
}

/** Decrypts one incoming message. Advances and durably persists this
 * conversation's group state BEFORE the plaintext is returned to the
 * caller -- never expose decrypted content from state that wasn't first
 * saved. */
export async function decryptMessage(
  conversationId: string,
  ciphertextBase64: string,
): Promise<string> {
  const state = await loadGroupState(conversationId);
  if (!state) throw new NoGroupStateError(conversationId);

  const impl = await getMlsCiphersuiteImpl();
  const decoded = decodeMlsMessage(fromBase64(ciphertextBase64), 0);
  if (!decoded || decoded[0].wireformat !== 'mls_private_message') {
    throw new Error('Expected an MLS application message on the wire.');
  }

  const result = await processMessage(
    decoded[0],
    state,
    emptyPskIndex,
    () => 'accept',
    impl,
  );

  await saveGroupState(conversationId, result.newState);

  if (result.kind !== 'applicationMessage') {
    throw new Error(
      `Expected an application message, got MLS state-change kind "${result.kind}" -- this V1 build has no post-creation control-message traffic (see group.ts), so this indicates a protocol mismatch, not a normal case.`,
    );
  }
  return new TextDecoder().decode(result.message);
}
