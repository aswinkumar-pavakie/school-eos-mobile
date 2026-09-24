// The backend returns whatever LIVEKIT_URL it was configured with. In local
// development that is usually ws://localhost:7880 -- fine for a browser on the
// same machine, but on a phone "localhost" is the phone itself, so the call
// could never connect. When the address points at localhost and the app is
// reaching the backend over a different host (the laptop's LAN address), use
// that host for LiveKit too; a hosted address (LiveKit Cloud, wss://...) is
// left exactly as given.

import { API_BASE_URL } from './api';

const LOCAL_HOSTS = /^(wss?):\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

function hostOf(url: string): string | null {
  const match = /^https?:\/\/([^/:]+)/i.exec(url);
  return match?.[1] ?? null;
}

export function resolveLiveKitUrl(url: string): string {
  const local = LOCAL_HOSTS.exec(url);
  if (!local) return url;
  const apiHost = hostOf(API_BASE_URL);
  if (!apiHost || apiHost === 'localhost' || apiHost === '127.0.0.1') return url;
  return url.replace(LOCAL_HOSTS, `${local[1]}://${apiHost}${local[3] ?? ''}`);
}

export function withResolvedLiveKitUrl<T extends { url: string }>(credentials: T): T {
  return { ...credentials, url: resolveLiveKitUrl(credentials.url) };
}
