// A random per-install id, generated once and kept in secure storage (it survives
// sign-out; a reinstall makes a new one). Sent as X-Device-Id on every request so
// the backend can tell WHICH PHONE a session and an account link belong to. It only
// names the phone -- it grants nothing by itself. Design:
// school-eos-website/rnd-linked-account-switching.md.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'deviceInstallId';
let cached: string | null = null;

function generate(): string {
  // 32 hex chars from a real UUID: matches the backend's [A-Za-z0-9_-]{8,64}.
  return Crypto.randomUUID().replace(/-/g, '');
}

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  try {
    const existing =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(DEVICE_ID_KEY) ?? null
        : await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
    const fresh = generate();
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(DEVICE_ID_KEY, fresh);
    else await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
    cached = fresh;
    return fresh;
  } catch {
    // Storage unavailable: use a per-run id so requests still work; account
    // linking simply will not persist across restarts in that case.
    cached = cached ?? generate();
    return cached;
  }
}
