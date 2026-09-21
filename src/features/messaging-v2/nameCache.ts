// Display-name resolution for conversation participants. The messaging
// microservice deliberately never stores or returns a person's name (LLD
// anti-enumeration/privacy boundary -- it only knows opaque person ids); Core
// owns real names, and Core/Messaging talk to each other only for specific,
// audited server-to-server purposes (e.g. push-notification copy), not a
// generic id-to-name lookup the mobile client could call directly.
//
// V1, pragmatic approach: cache every display name this device ever learns
// from Discovery (the one place the messaging service DOES surface a name,
// since it's relayed from Core's own scoped-relationship projection) into a
// simple in-memory + AsyncStorage-backed map, keyed by personId. A
// conversation opened without ever having gone through Discovery on this
// device (e.g. a fresh install syncing existing conversations) has no cached
// name yet -- resolveDisplayName's fallback is named and visible, not
// silently blank, so this gap is honest rather than hidden.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DiscoveryItem } from '@/lib/messaging-api';

const STORAGE_KEY = 'messaging-v2:person-name-cache';
const memoryCache = new Map<string, string>();
let hydrated = false;

async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as [string, string][];
    for (const [id, name] of entries) memoryCache.set(id, name);
  } catch {
    // A corrupt/missing cache just means names resolve to the fallback until
    // re-learned from Discovery -- never worth failing anything over.
  }
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...memoryCache.entries()]),
    );
  } catch {
    // Best-effort only.
  }
}

export async function rememberNamesFromDiscovery(
  items: DiscoveryItem[],
): Promise<void> {
  await hydrate();
  let changed = false;
  for (const item of items) {
    if (memoryCache.get(item.userId) !== item.displayName) {
      memoryCache.set(item.userId, item.displayName);
      changed = true;
    }
  }
  if (changed) await persist();
}

/** Synchronous on purpose -- UI render paths call this directly. Callers
 * should still `await hydrate()`-equivalent once at app start (the
 * conversations-list screen does, via useEffect) so this isn't reading an
 * empty cache on cold start when it doesn't have to. */
export function resolveDisplayName(personId: string): string {
  return memoryCache.get(personId) ?? 'School EOS user';
}

export async function ensureNameCacheHydrated(): Promise<void> {
  await hydrate();
}
