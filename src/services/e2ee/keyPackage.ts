// KeyPackage generation and publish/replenish against the messaging
// backend. Every KeyPackage this device ever generates (whether published to
// the pool below, or generated ad hoc as a creator's own leaf in group.ts)
// reuses the SAME long-term Ed25519 identity signing key -- one stable
// identity per device, matching real-world messenger practice, rather than a
// fresh identity per KeyPackage.

import {
  defaultCapabilities,
  defaultLifetime,
  type Credential,
  type KeyPackage,
  type PrivateKeyPackage,
} from 'ts-mls';
import { generateKeyPackageWithKey } from 'ts-mls';
import { publishMlsKeyPackages as publishMlsKeyPackagesApi } from '@/lib/messaging-api';
import { fromBase64 } from './codec';
import { getMlsCiphersuiteImpl } from './setup';
import {
  addKeyPackagesToPool,
  getPoolSize,
  loadDeviceIdentity,
} from './storage';
import { encodeKeyPackageForWire } from './wire';

const REPLENISH_THRESHOLD = 10;
const REPLENISH_BATCH_SIZE = 30;

function deviceCredential(deviceId: string): Credential {
  return { credentialType: 'basic', identity: new TextEncoder().encode(deviceId) };
}

/** Generates ONE KeyPackage using this device's persistent identity signing
 * key -- shared by both the pool-replenishment path below and group.ts's
 * creator flow (which needs a fresh, never-published KeyPackage for its own
 * leaf, generated the same way, just not sent through publishKeyPackageBatch). */
export async function generateOwnKeyPackage(): Promise<{
  publicPackage: KeyPackage;
  privatePackage: PrivateKeyPackage;
}> {
  const identity = await loadDeviceIdentity();
  if (!identity) {
    throw new Error(
      'generateOwnKeyPackage called before this device has a saved identity -- bootstrap must run first.',
    );
  }
  const impl = await getMlsCiphersuiteImpl();
  return generateKeyPackageWithKey(
    deviceCredential(identity.deviceId),
    defaultCapabilities(),
    defaultLifetime,
    [],
    {
      signKey: fromBase64(identity.identityPrivateKey),
      publicKey: fromBase64(identity.identityPublicKey),
    },
    impl,
  );
}

/** Publishes a fresh batch of KeyPackages and keeps the local private-material
 * pool in sync with what the server now holds -- pure addition, never a
 * replacement of what's already published. */
export async function publishKeyPackageBatch(count: number): Promise<void> {
  const identity = await loadDeviceIdentity();
  if (!identity) {
    throw new Error(
      'publishKeyPackageBatch called before this device has a saved identity -- bootstrap must run first.',
    );
  }

  const generated: { publicPackage: KeyPackage; privatePackage: PrivateKeyPackage }[] =
    [];
  for (let i = 0; i < count; i++) {
    generated.push(await generateOwnKeyPackage());
  }

  const wireEncoded = generated.map((g) => encodeKeyPackageForWire(g.publicPackage));
  const { data } = await publishMlsKeyPackagesApi(identity.deviceId, wireEncoded);
  if (data.ids.length !== generated.length) {
    throw new Error(
      `Published ${generated.length} KeyPackages but the server returned ${data.ids.length} ids -- refusing to guess a mapping.`,
    );
  }

  await addKeyPackagesToPool(
    generated.map((g, i) => ({
      serverId: data.ids[i]!,
      publicPackage: g.publicPackage,
      privatePackage: g.privatePackage,
    })),
  );
}

/** Called on every login (see bootstrap.ts) -- replenishes only when the
 * local pool has fallen below a safe threshold, never blindly republishes
 * every time. */
export async function replenishKeyPackagesIfNeeded(): Promise<void> {
  const size = await getPoolSize();
  if (size >= REPLENISH_THRESHOLD) return;
  await publishKeyPackageBatch(REPLENISH_BATCH_SIZE);
}
