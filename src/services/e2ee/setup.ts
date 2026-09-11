// Shared crypto bootstrap for the whole e2ee module -- called once, lazily,
// by whichever e2ee file needs it first (keyPackage.ts, group.ts, cipher.ts
// all import getMlsCiphersuiteImpl() rather than each installing/resolving
// their own).
//
// Runtime requirement, verified against ts-mls's actual source this session:
// its nobleCryptoProvider unconditionally needs globalThis.crypto.getRandomValues,
// and opportunistically uses globalThis.crypto.subtle for Ed25519 (falling
// back to @noble/curves only if subtle is undefined) -- with no per-call
// injection hook. react-native-quick-crypto's install() polyfills
// globalThis.crypto fully (getRandomValues + subtle) and is confirmed (via a
// real on-device spike, not just Node) to make the whole stack work on
// Hermes.

import { install } from 'react-native-quick-crypto';
import {
  getCiphersuiteFromName,
  getCiphersuiteImpl,
  nobleCryptoProvider,
  type CiphersuiteImpl,
} from 'ts-mls';

// Classical (non-post-quantum) suite: X25519 DHKEM, AES-128-GCM, SHA-256,
// Ed25519. Confirmed via a real on-device round trip this session. Not the
// package's default X-Wing hybrid suite -- that pulls in post-quantum
// primitives/dependencies this app doesn't need. Persisted per-message as
// `encryptionVersion` so a future protocol migration has a clean
// discriminator to key off.
export const MLS_CIPHERSUITE_NAME = 'MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519';
export const MLS_ENCRYPTION_VERSION = `mls-1.6.4-${MLS_CIPHERSUITE_NAME}`;

let cryptoInstalled = false;

export function ensureCryptoInstalled(): void {
  if (cryptoInstalled) return;
  install();
  cryptoInstalled = true;
}

let implPromise: Promise<CiphersuiteImpl> | null = null;

export function getMlsCiphersuiteImpl(): Promise<CiphersuiteImpl> {
  ensureCryptoInstalled();
  if (!implPromise) {
    implPromise = getCiphersuiteImpl(
      getCiphersuiteFromName(MLS_CIPHERSUITE_NAME),
      nobleCryptoProvider,
    );
  }
  return implPromise;
}
