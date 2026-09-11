// The messaging equivalent of push-token.ts's useRegisterPushToken -- fires
// once per genuine sign-in, for every role, no role check (matching the
// backend routes it calls, exactly like push-token registration). On a
// device with no saved MLS identity yet: generates one, registers the
// device, and publishes an initial KeyPackage batch. On every login
// (including subsequent ones): replenishes the KeyPackage pool only if it's
// run low. Failures are swallowed -- like push registration, this is a
// background enhancement a screen never blocks on, never something a user
// action should visibly fail because of.

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { ed25519 } from '@noble/curves/ed25519.js';
import type { SessionStatus } from '@/lib/auth';
import { registerDevice } from '@/lib/messaging-api';
import { toBase64 } from '../e2ee/codec';
import { replenishKeyPackagesIfNeeded } from '../e2ee/keyPackage';
import { ensureCryptoInstalled } from '../e2ee/setup';
import { loadDeviceIdentity, saveDeviceIdentity } from '../e2ee/storage';

async function ensureDeviceIdentity(): Promise<void> {
  const existing = await loadDeviceIdentity();
  if (existing) return;

  const keypair = ed25519.keygen();
  const identityPublicKey = toBase64(keypair.publicKey);

  const { data: device } = await registerDevice({
    devicePublicKey: identityPublicKey,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
  });

  await saveDeviceIdentity({
    deviceId: device.id,
    identityPublicKey,
    identityPrivateKey: toBase64(keypair.secretKey),
  });
}

/** The one real "for every login" E2EE bootstrap hook -- see
 * push-token.ts's useRegisterPushToken for the exact pattern this mirrors. */
export function useE2eeBootstrap(status: SessionStatus): void {
  const installedRef = useRef(false);

  useEffect(() => {
    if (!installedRef.current) {
      ensureCryptoInstalled();
      installedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (status !== 'signedIn') return;
    let cancelled = false;

    (async () => {
      await ensureDeviceIdentity();
      if (cancelled) return;
      // Best-effort: a failed replenish just means this device's KeyPackage
      // pool stays wherever it was, not something worth surfacing to the
      // person signing in -- the same posture push-token.ts takes.
      await replenishKeyPackagesIfNeeded().catch(() => {});
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [status]);
}
