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
}

export async function hasGroupState(conversationId: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(groupStateKey(conversationId))) !== null;
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
}
