// Persistence for this device's MLS identity, its pool of published-but-not-
// yet-locally-matched KeyPackage private material, and each conversation's
// group ratchet state. expo-secure-store key names may only contain
// [A-Za-z0-9._-] -- dot-separated here, not colon-separated (colons are not
// a valid SecureStore key character).
//
// Real, on-device-measured sizing (this session's spike): a fresh 2-person
// ClientState encodes to ~1.2-1.6KB -- comfortably within SecureStore's
// per-item limits, so this is the primary and only storage path. No
// encrypted-file fallback is built pre-emptively; if a future need for one
// appears (much larger group state), that is a real, separate change.
//
// ---- Multi-identity support (archive/restore) ------------------------------
//
// This app's real design is one device per person (see the messaging plan),
// but a SINGLE PHYSICAL PHONE used to test/demo multiple roles -- switching
// accounts back and forth -- is a completely normal, expected thing to do
// during development, QA, and demos, not an edge case. Earlier, the "live"
// slots below were a single global slot per data type, and switching to a
// different person wiped it; switching BACK to a person you'd already used
// found nothing there and registered a brand-new device+identity, silently
// abandoning everything (KeyPackage pool, joined conversations' group state)
// that person had before -- which is exactly what caused "Desired gen in
// the past" and "this device has lost access" on conversations that should
// have kept working.
//
// The fix: whichever person ISN'T currently active gets their entire local
// world (identity, pool, every joined conversation's group state, cached
// plaintext) archived under their own personId before the live slots are
// reused for someone else -- and restored, byte for byte, the next time
// they sign back in on this same device. This makes switching back and
// forth on one phone behave exactly like each person having their own
// separate device, which is what it actually needs to be.

import * as SecureStore from 'expo-secure-store';
import {
  decodeGroupState,
  encodeGroupState,
  type ClientState,
  type KeyPackage,
  type PrivateKeyPackage,
} from 'ts-mls';
// Not part of the curated top-level export list -- a real subpath supported
// by the package's own exports map (see ts-mls's package.json "./*.js").
// ClientState = GroupState & { clientConfig } (clientConfig is local runtime
// config, not part of the serialized wire/storage format), so it must be
// reattached after every decodeGroupState call.
import { defaultClientConfig } from 'ts-mls/clientConfig.js';
import { fromBase64, toBase64 } from './codec';
import { decodeKeyPackageFromWire, encodeKeyPackageForWire } from './wire';

// ---- Device identity ---------------------------------------------------

const DEVICE_IDENTITY_KEY = 'e2ee.device.identity';

export interface DeviceIdentity {
  /** The server-assigned messaging_devices.id -- only known once
   * registration succeeds; see bootstrap.ts. */
  deviceId: string;
  identityPublicKey: string; // base64, Ed25519 raw public key
  identityPrivateKey: string; // base64, Ed25519 raw secret key -- NEVER sent anywhere
  /** Whichever person this identity was registered for. Compared against
   * the currently signed-in person (see ensureIdentityForPerson below) so
   * switching to a DIFFERENT person on the same physical device correctly
   * archives/restores whole identities instead of silently overwriting or
   * abandoning one. */
  personId: string;
}

export async function loadDeviceIdentity(): Promise<DeviceIdentity | null> {
  const raw = await SecureStore.getItemAsync(DEVICE_IDENTITY_KEY);
  return raw ? (JSON.parse(raw) as DeviceIdentity) : null;
}

export async function saveDeviceIdentity(
  identity: DeviceIdentity,
): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_IDENTITY_KEY, JSON.stringify(identity));
}

// ---- KeyPackage pool (published; not yet matched to a real join) -------

const KEY_PACKAGE_POOL_KEY = 'e2ee.mls.keypackagepool';

interface StoredPoolEntry {
  serverId: string;
  publicPackage: string; // wire-encoded (see wire.ts)
  privatePackage: {
    initPrivateKey: string;
    hpkePrivateKey: string;
    signaturePrivateKey: string;
  };
}

async function loadPool(): Promise<StoredPoolEntry[]> {
  const raw = await SecureStore.getItemAsync(KEY_PACKAGE_POOL_KEY);
  return raw ? (JSON.parse(raw) as StoredPoolEntry[]) : [];
}

async function savePool(pool: StoredPoolEntry[]): Promise<void> {
  await SecureStore.setItemAsync(KEY_PACKAGE_POOL_KEY, JSON.stringify(pool));
}

export async function addKeyPackagesToPool(
  entries: {
    serverId: string;
    publicPackage: KeyPackage;
    privatePackage: PrivateKeyPackage;
  }[],
): Promise<void> {
  const pool = await loadPool();
  for (const entry of entries) {
    pool.push({
      serverId: entry.serverId,
      publicPackage: encodeKeyPackageForWire(entry.publicPackage),
      privatePackage: {
        initPrivateKey: toBase64(entry.privatePackage.initPrivateKey),
        hpkePrivateKey: toBase64(entry.privatePackage.hpkePrivateKey),
        signaturePrivateKey: toBase64(entry.privatePackage.signaturePrivateKey),
      },
    });
  }
  await savePool(pool);
}

export async function getPoolSize(): Promise<number> {
  return (await loadPool()).length;
}

export interface DecodedPoolEntry {
  serverId: string;
  publicPackage: KeyPackage;
  privatePackage: PrivateKeyPackage;
}

/** Every locally-cached, not-yet-matched KeyPackage this device has
 * published -- the server never tells the joining client WHICH of its own
 * published KeyPackages a given Welcome was built against, so
 * group.ts's join flow tries each of these in turn (cheap, local, offline)
 * until one actually decrypts the Welcome. See group.ts for the full
 * rationale. */
export async function listPoolEntries(): Promise<DecodedPoolEntry[]> {
  const pool = await loadPool();
  return pool.map((entry) => ({
    serverId: entry.serverId,
    publicPackage: decodeKeyPackageFromWire(entry.publicPackage),
    privatePackage: {
      initPrivateKey: fromBase64(entry.privatePackage.initPrivateKey),
      hpkePrivateKey: fromBase64(entry.privatePackage.hpkePrivateKey),
      signaturePrivateKey: fromBase64(entry.privatePackage.signaturePrivateKey),
    },
  }));
}

/** Removes one entry once it's been identified as the one a real join
 * actually consumed -- keeps the local pool size accurate for
 * replenishment decisions (see keyPackage.ts). */
export async function removeFromPool(serverId: string): Promise<void> {
  const pool = await loadPool();
  await savePool(pool.filter((entry) => entry.serverId !== serverId));
}

// ---- Per-conversation group state ---------------------------------------

function groupStateKey(conversationId: string): string {
  return `e2ee.mls.group.${conversationId}`;
}

// A manifest of every conversationId this device currently holds group state
// for -- expo-secure-store has no "list all keys" API, so this is the only
// way to find and move them all when the active identity changes (see
// archiveCurrentWorld/restoreArchivedWorld below). Kept in sync by
// saveGroupState/renameGroupState/discardGroupState, the only places group
// state is ever written or removed.
const GROUP_STATE_MANIFEST_KEY = 'e2ee.mls.group.manifest';

async function loadGroupStateManifest(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(GROUP_STATE_MANIFEST_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function saveGroupStateManifest(manifest: string[]): Promise<void> {
  await SecureStore.setItemAsync(GROUP_STATE_MANIFEST_KEY, JSON.stringify(manifest));
}

async function trackGroupStateConversation(conversationId: string): Promise<void> {
  const manifest = await loadGroupStateManifest();
  if (!manifest.includes(conversationId)) {
    manifest.push(conversationId);
    await saveGroupStateManifest(manifest);
  }
}

export async function loadGroupState(
  conversationId: string,
): Promise<ClientState | null> {
  const raw = await SecureStore.getItemAsync(groupStateKey(conversationId));
  if (!raw) return null;
  const decoded = decodeGroupState(fromBase64(raw), 0);
  if (!decoded) return null;
  return { ...decoded[0], clientConfig: defaultClientConfig };
}

/** Every MLS state-changing operation (join, encrypt, decrypt) must persist
 * its resulting state here before the operation is considered complete --
 * never advance in-memory state and continue without a durable write
 * succeeding first (see group.ts/cipher.ts). */
export async function saveGroupState(
  conversationId: string,
  state: ClientState,
): Promise<void> {
  const encoded = encodeGroupState(state);
  await SecureStore.setItemAsync(groupStateKey(conversationId), toBase64(encoded));
  await trackGroupStateConversation(conversationId);
}

// ---- Locally-cached plaintext of messages THIS device sent -----------------
//
// Real forward secrecy means the secret used to encrypt an outgoing message
// is advanced/discarded the moment it's used (cipher.ts's encryptMessage) --
// by design, even the sender's own later re-fetch of that same ciphertext
// from the server can no longer be decrypted. Every real E2EE client (this
// is not unique to MLS) instead shows its own sent messages from what it
// already knew locally before encrypting, keyed by the clientMessageId it
// generated for that send -- never by attempting to decrypt its own
// ciphertext again.

function sentPlaintextKey(conversationId: string): string {
  return `e2ee.sent.${conversationId}`;
}

async function loadSentPlaintexts(
  conversationId: string,
): Promise<Record<string, string>> {
  const raw = await SecureStore.getItemAsync(sentPlaintextKey(conversationId));
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}

export async function saveSentPlaintext(
  conversationId: string,
  clientMessageId: string,
  plaintext: string,
): Promise<void> {
  const entries = await loadSentPlaintexts(conversationId);
  entries[clientMessageId] = plaintext;
  await SecureStore.setItemAsync(
    sentPlaintextKey(conversationId),
    JSON.stringify(entries),
  );
}

export async function getSentPlaintext(
  conversationId: string,
  clientMessageId: string,
): Promise<string | null> {
  const entries = await loadSentPlaintexts(conversationId);
  return entries[clientMessageId] ?? null;
}

// ---- Locally-cached plaintext of messages RECEIVED and already decrypted --
//
// The same forward-secrecy property above applies just as much to incoming
// messages: processMessage() advances/discards the ratchet key for that
// exact message the moment it succeeds, for EVERY member's per-sender
// ratchet, not just the sender's own. So decrypting a given message twice
// (e.g. because the conversation screen re-fetches history on every visit)
// fails the second time -- the key it needs is already gone, by design, not
// a bug in the crypto. Every message, once genuinely decrypted, must be
// cached so later fetches never attempt decryptMessage() on it again.

function receivedPlaintextKey(conversationId: string): string {
  return `e2ee.received.${conversationId}`;
}

async function loadReceivedPlaintexts(
  conversationId: string,
): Promise<Record<string, string>> {
  const raw = await SecureStore.getItemAsync(receivedPlaintextKey(conversationId));
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}

export async function saveReceivedPlaintext(
  conversationId: string,
  messageId: string,
  plaintext: string,
): Promise<void> {
  const entries = await loadReceivedPlaintexts(conversationId);
  entries[messageId] = plaintext;
  await SecureStore.setItemAsync(
    receivedPlaintextKey(conversationId),
    JSON.stringify(entries),
  );
}

export async function getReceivedPlaintext(
  conversationId: string,
  messageId: string,
): Promise<string | null> {
  const entries = await loadReceivedPlaintexts(conversationId);
  return entries[messageId] ?? null;
}

export async function hasGroupState(conversationId: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(groupStateKey(conversationId))) !== null;
}

/** Discards a group this device created locally but that the server never
 * actually used -- see useStartDirectConversation/useCreateRequest's isNew
 * check: when POST /conversations or /requests resolves to an
 * ALREADY-existing conversation, this device's freshly-generated group was
 * never processed server-side (the real conversation has its own real
 * group/history instead), so it must be thrown away, never persisted under
 * the real conversationId where it would silently replace/orphan whatever
 * (if anything) is genuinely valid there. */
export async function discardGroupState(conversationId: string): Promise<void> {
  await SecureStore.deleteItemAsync(groupStateKey(conversationId));
  const manifest = await loadGroupStateManifest();
  const next = manifest.filter((id) => id !== conversationId);
  if (next.length !== manifest.length) {
    await saveGroupStateManifest(next);
  }
}

/** A brand-new conversation's real id isn't known until the server responds
 * to POST /conversations or POST /requests -- but the plan's own ordering
 * requirement ("persist the post-commit ClientState locally before sending
 * anything") means group creation must save state under SOME key before
 * that response arrives. createGroupForConversation (group.ts) saves under a
 * fresh temporary id it generates itself; the calling hook renames it to the
 * real conversationId once the server confirms it. */
export async function renameGroupState(
  fromId: string,
  toId: string,
): Promise<void> {
  const raw = await SecureStore.getItemAsync(groupStateKey(fromId));
  if (!raw) return;
  await SecureStore.setItemAsync(groupStateKey(toId), raw);
  await SecureStore.deleteItemAsync(groupStateKey(fromId));
  const manifest = await loadGroupStateManifest();
  const next = manifest.filter((id) => id !== fromId);
  if (!next.includes(toId)) next.push(toId);
  await saveGroupStateManifest(next);
}

// ---- Archive/restore a whole person's local world --------------------------

interface ArchivedWorld {
  identity: DeviceIdentity;
  pool: StoredPoolEntry[];
  groupStates: Record<string, string>; // conversationId -> base64 encoded state
  sentPlaintexts: Record<string, Record<string, string>>; // conversationId -> {clientMessageId: plaintext}
  receivedPlaintexts: Record<string, Record<string, string>>; // conversationId -> {messageId: plaintext}
}

function archiveKey(personId: string): string {
  // SecureStore keys may only contain [A-Za-z0-9._-]; personId (a UUID) is
  // already safe as-is.
  return `e2ee.archive.${personId}`;
}

/** Moves everything currently in the "live" slots into this person's own
 * archive entry, then clears the live slots. Only ever called with the
 * personId of whoever the CURRENTLY live identity actually belongs to (see
 * ensureIdentityForPerson) -- never call this for anyone else. */
async function archiveCurrentWorld(personId: string): Promise<void> {
  const identity = await loadDeviceIdentity();
  if (!identity) return; // nothing live to archive

  const pool = await loadPool();
  const manifest = await loadGroupStateManifest();
  const groupStates: Record<string, string> = {};
  const sentPlaintexts: Record<string, Record<string, string>> = {};
  const receivedPlaintexts: Record<string, Record<string, string>> = {};
  for (const conversationId of manifest) {
    const raw = await SecureStore.getItemAsync(groupStateKey(conversationId));
    if (raw) groupStates[conversationId] = raw;
    const sent = await loadSentPlaintexts(conversationId);
    if (Object.keys(sent).length > 0) sentPlaintexts[conversationId] = sent;
    const received = await loadReceivedPlaintexts(conversationId);
    if (Object.keys(received).length > 0) receivedPlaintexts[conversationId] = received;
  }

  const world: ArchivedWorld = { identity, pool, groupStates, sentPlaintexts, receivedPlaintexts };
  await SecureStore.setItemAsync(archiveKey(personId), JSON.stringify(world));

  // Clear EVERY live slot, including the identity itself -- leaving the old
  // identity in place while its pool/group-states were already wiped would
  // be an inconsistent state: if the very next step (the caller restoring a
  // different archive, or saving a brand-new identity) never completes for
  // any reason, a later call could see this stale identity as "already
  // live" and wrongly skip re-establishing it, while its real data is gone.
  // After this, the live slot correctly means "no one" until the caller
  // finishes the switch.
  await SecureStore.deleteItemAsync(DEVICE_IDENTITY_KEY);
  await SecureStore.deleteItemAsync(KEY_PACKAGE_POOL_KEY);
  for (const conversationId of manifest) {
    await SecureStore.deleteItemAsync(groupStateKey(conversationId));
    await SecureStore.deleteItemAsync(sentPlaintextKey(conversationId));
    await SecureStore.deleteItemAsync(receivedPlaintextKey(conversationId));
  }
  await SecureStore.deleteItemAsync(GROUP_STATE_MANIFEST_KEY);
}

/** Restores a previously-archived world as the live one, if this person has
 * used this device before. Returns the restored identity, or null if no
 * archive exists for them (a genuinely new person on this device). */
async function restoreArchivedWorld(personId: string): Promise<DeviceIdentity | null> {
  const raw = await SecureStore.getItemAsync(archiveKey(personId));
  if (!raw) return null;
  const world = JSON.parse(raw) as ArchivedWorld;

  await saveDeviceIdentity(world.identity);
  await savePool(world.pool);
  const manifest = Object.keys(world.groupStates);
  for (const conversationId of manifest) {
    await SecureStore.setItemAsync(groupStateKey(conversationId), world.groupStates[conversationId]!);
  }
  for (const [conversationId, entries] of Object.entries(world.sentPlaintexts)) {
    await SecureStore.setItemAsync(sentPlaintextKey(conversationId), JSON.stringify(entries));
  }
  for (const [conversationId, entries] of Object.entries(world.receivedPlaintexts)) {
    await SecureStore.setItemAsync(receivedPlaintextKey(conversationId), JSON.stringify(entries));
  }
  await saveGroupStateManifest(manifest);

  await SecureStore.deleteItemAsync(archiveKey(personId));
  return world.identity;
}

/** The one entry point bootstrap.ts should use instead of directly comparing
 * loadDeviceIdentity() against the current person. Handles all three cases:
 *  - This person is already the live identity: no-op, returns it as-is.
 *  - A DIFFERENT person is currently live: archives that person's whole
 *    world first, then checks whether THIS person has their own archive to
 *    restore.
 *  - This person has used this device before (an archive exists): restores
 *    their identity/pool/joined-conversations exactly as they left them --
 *    no new device registration, nothing abandoned.
 *  - This person has never used this device before: returns null: the
 *    caller must register a fresh device (see bootstrap.ts). */
export async function ensureIdentityForPerson(
  personId: string,
): Promise<DeviceIdentity | null> {
  const current = await loadDeviceIdentity();
  if (current && current.personId === personId) return current;

  if (current) {
    await archiveCurrentWorld(current.personId);
  }

  return restoreArchivedWorld(personId);
}
