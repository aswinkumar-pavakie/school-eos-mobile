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
import { getCurrentPersonId, type SessionStatus } from '@/lib/auth';
import { registerDevice } from '@/lib/messaging-api';
import { toBase64 } from '../e2ee/codec';
import { replenishKeyPackagesIfNeeded } from '../e2ee/keyPackage';
import { ensureCryptoInstalled } from '../e2ee/setup';
import { ensureIdentityForPerson, saveDeviceIdentity } from '../e2ee/storage';

async function ensureDeviceIdentity(): Promise<void> {
  const personId = await getCurrentPersonId();
  if (!personId) return; // shouldn't happen while signedIn; nothing to bootstrap yet

  // Handles three cases in one call: this person is already the live
  // identity (no-op); a DIFFERENT person is currently live (their whole
  // world gets archived first, safely, before anything here touches the
  // live slots); or this exact person has used this device before, in
  // which case their identity/KeyPackage pool/joined-conversation state is
  // restored exactly as they left it -- no new device registration, no
  // server-side revocation, nothing abandoned. See storage.ts's own
  // extensive comment on why this exists: a single physical phone being
  // used to test/demo multiple accounts is normal, not an edge case, and
  // silently discarding a person's whole local state every time someone
  // switches back to them was the actual cause of "Desired gen in the
  // past" and "this device has lost access" on conversations that should
  // have kept working fine.
  const restored = await ensureIdentityForPerson(personId);
  if (restored) return;

  // Genuinely the first time this person has ever used this device.
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
    personId,
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

    // Deliberately NOT cancellable partway through: this is one atomic "make
    // sure this account has a working device + at least some KeyPackages"
    // operation. A React-lifecycle unmount/re-run (status flapping right
    // after sign-in, a fast account switch during testing, etc.) must never
    // silently abandon it after registration succeeds but before the
    // KeyPackage publish that makes the device actually reachable -- that
    // previously left a real, ACTIVE device with zero usable key material,
    // forever, until another login happened to win the race.
    (async () => {
      await ensureDeviceIdentity();
      // Best-effort: a failed replenish just means this device's KeyPackage
      // pool stays wherever it was, not something worth surfacing to the
      // person signing in -- the same posture push-token.ts takes. Still
      // logged (never a bare swallow) -- a brand-new device stuck at zero
      // KeyPackages is silently unreachable by everyone until it retries on
      // a later login, and that's worth being able to diagnose.
      await replenishKeyPackagesIfNeeded().catch((err) => {
        console.error('[e2ee bootstrap] KeyPackage replenish failed:', err);
      });
    })().catch((err) => {
      // Unlike the replenish above, a failed ensureDeviceIdentity() means
      // this person has NO registered device at all -- every message sent
      // to them will fail. Never swallow this silently; at minimum it must
      // be visible in the Metro/device logs for diagnosis.
      console.error('[e2ee bootstrap] device identity setup failed:', err);
    });
  }, [status]);
}
