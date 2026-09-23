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
import Constants from 'expo-constants';
import { ed25519 } from '@noble/curves/ed25519.js';
import { getCurrentPersonId, type SessionStatus } from '@/lib/auth';
import { MessagingApiError, registerDevice } from '@/lib/messaging-api';
import { toBase64 } from '../e2ee/codec';
import { replenishKeyPackagesIfNeeded } from '../e2ee/keyPackage';
import { ensureCryptoInstalled } from '../e2ee/setup';
import { clearDeviceIdentity, ensureIdentityForPerson, saveDeviceIdentity } from '../e2ee/storage';

// react-native-quick-crypto is a native (JSI) module with no Expo Go build --
// confirmed live: ed25519.keygen() below needs globalThis.crypto.getRandomValues,
// which only exists once install() has genuinely run, which cannot happen
// inside Expo Go at all. Skipping the whole bootstrap under Expo Go (once,
// via console.warn) is correct and expected here -- not a bug to keep
// retrying and re-logging on every single login -- a real development or
// production build is required for E2EE messaging to work, same native-module
// constraint documented in setup.ts.
const IS_EXPO_GO = Constants.appOwnership === 'expo';

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

// Module-scope: a device only ever has one live session at a time, so a
// single in-flight promise (not keyed by anything) is enough to coalesce
// concurrent invocations of this hook -- React Strict Mode's dev-only double
// effect invoke, Fast Refresh remounting the screen, or `status` flapping
// right after sign-in. Confirmed live as a real bug on the website's twin of
// this hook (see its own comment): two overlapping runs each registered a
// fresh device with their own keypair, and since only one device may be
// ACTIVE per person, each new registration revoked the last -- while the
// KeyPackage publish for whichever device ended up ACTIVE never landed
// before it got revoked too. Net result: a real ACTIVE device with zero
// published KeyPackages, permanently unreachable until another bootstrap
// happens to run alone. Coalescing means only one registration/replenish
// sequence ever runs per sign-in, so there's nothing left to race.
let bootstrapInFlight: Promise<void> | null = null;

function runBootstrap(): Promise<void> {
  if (bootstrapInFlight) return bootstrapInFlight;

  bootstrapInFlight = (async () => {
    await ensureDeviceIdentity();
    // Best-effort: a failed replenish just means this device's KeyPackage
    // pool stays wherever it was, not something worth surfacing to the
    // person signing in -- the same posture push-token.ts takes. Still
    // logged (never a bare swallow) -- a brand-new device stuck at zero
    // KeyPackages is silently unreachable by everyone until it retries on
    // a later login, and that's worth being able to diagnose.
    try {
      await replenishKeyPackagesIfNeeded();
    } catch (err) {
      // ACCESS_DENIED is the other real code this self-scoped call can
      // get -- devicesRepo.findById() finds nothing at all for this
      // device's cached id (e.g. after an operator-run data reset
      // truncates messaging_devices while this phone's storage still
      // remembers a deviceId that no longer exists anywhere). Since this
      // call always uses this device's own token + its own cached
      // deviceId, ACCESS_DENIED here can never mean a real cross-user
      // permission denial -- only "this cached identity is stale" --
      // exactly like DEVICE_REVOKED, and self-heals the same way. Mirrors
      // the website's own fix.
      if (
        err instanceof MessagingApiError &&
        (err.code === 'DEVICE_REVOKED' || err.code === 'ACCESS_DENIED')
      ) {
        // Locally-restored identity is stale -- the server will never
        // accept it again. Wipe it and register a fresh device on this
        // same login, so a revoked/vanished device self-heals in one
        // login instead of failing the same way forever.
        await clearDeviceIdentity();
        await ensureDeviceIdentity();
        await replenishKeyPackagesIfNeeded().catch((retryErr) => {
          console.error('[e2ee bootstrap] KeyPackage replenish failed after re-registering device:', retryErr);
        });
      } else {
        console.error('[e2ee bootstrap] KeyPackage replenish failed:', err);
      }
    }
  })()
    .catch((err) => {
      // Unlike the replenish above, a failed ensureDeviceIdentity() means
      // this person has NO registered device at all -- every message sent
      // to them will fail. Never swallow this silently; at minimum it must
      // be visible in the Metro/device logs for diagnosis.
      console.error('[e2ee bootstrap] device identity setup failed:', err);
    })
    .finally(() => {
      bootstrapInFlight = null;
    });

  return bootstrapInFlight;
}

/** The one real "for every login" E2EE bootstrap hook -- see
 * push-token.ts's useRegisterPushToken for the exact pattern this mirrors. */
export function useE2eeBootstrap(status: SessionStatus): void {
  const installedRef = useRef(false);

  useEffect(() => {
    if (IS_EXPO_GO) return;
    if (!installedRef.current) {
      ensureCryptoInstalled().catch((err) => {
        console.error('[e2ee bootstrap] native crypto install failed on a real build (not Expo Go -- investigate):', err);
      });
      installedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (IS_EXPO_GO) {
      console.warn('[e2ee bootstrap] skipped -- E2EE messaging requires a real development/production build, not Expo Go.');
      return;
    }
    if (status !== 'signedIn') return;

    // Deliberately NOT cancellable partway through: this is one atomic "make
    // sure this account has a working device + at least some KeyPackages"
    // operation. A React-lifecycle unmount/re-run (status flapping right
    // after sign-in, a fast account switch during testing, etc.) must never
    // silently abandon it after registration succeeds but before the
    // KeyPackage publish that makes the device actually reachable -- that
    // previously left a real, ACTIVE device with zero usable key material,
    // forever, until another login happened to win the race.
    runBootstrap();
  }, [status]);
}
