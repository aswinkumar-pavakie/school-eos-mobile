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
//
// IMPORTANT: 'react-native-quick-crypto' is a native (JSI/TurboModule)
// package -- it has no Expo Go build, and merely IMPORTING it (not just
// calling install()) throws "TurboModuleRegistry.getEnforcing(...):
// 'QuickBase64' could not be found" inside Expo Go, confirmed live. Because
// Expo Router eagerly imports every file under app/ to build its route
// table, a static top-level import here previously crashed the ENTIRE app on
// startup in Expo Go -- not just the Messaging screens -- since group.ts ->
// hooks.ts -> ConversationScreen.tsx -> messaging/[conversationId].tsx sits
// on that eager import graph. Deferred to a dynamic import inside
// ensureCryptoInstalled() so merely loading this module (as part of the
// route table) is harmless; E2EE messaging itself still genuinely requires a
// real development/production build to work, same as before -- that's a
// real native-module constraint, not something a JS-only fix can remove.
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

let installPromise: Promise<void> | null = null;

export async function ensureCryptoInstalled(): Promise<void> {
  if (!installPromise) {
    installPromise = import('react-native-quick-crypto').then(({ install }) => {
      install();
    });
  }
  return installPromise;
}

let implPromise: Promise<CiphersuiteImpl> | null = null;

export function getMlsCiphersuiteImpl(): Promise<CiphersuiteImpl> {
  if (!implPromise) {
    implPromise = ensureCryptoInstalled().then(() =>
      getCiphersuiteImpl(getCiphersuiteFromName(MLS_CIPHERSUITE_NAME), nobleCryptoProvider),
    );
  }
  return implPromise;
}
