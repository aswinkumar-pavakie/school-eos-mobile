// Server-wire encoding for the two MLS artifacts this app's REST API
// transports: a KeyPackage (published in a batch, fetched one at a time by
// whoever starts a conversation) and a Welcome (delivered once, to the
// joining member). Uses the same encodeMlsMessage/decodeMlsMessage envelope
// the README's own worked example uses -- proven end-to-end on a real
// Hermes device this session, not swapped for an unverified direct
// subpath import.

import {
  decodeMlsMessage,
  encodeMlsMessage,
  type KeyPackage,
  type Welcome,
} from 'ts-mls';
import { fromBase64, toBase64 } from './codec';

export function encodeKeyPackageForWire(keyPackage: KeyPackage): string {
  const bytes = encodeMlsMessage({
    keyPackage,
    wireformat: 'mls_key_package',
    version: 'mls10',
  });
  return toBase64(bytes);
}

export function decodeKeyPackageFromWire(base64: string): KeyPackage {
  const decoded = decodeMlsMessage(fromBase64(base64), 0);
  if (!decoded || decoded[0].wireformat !== 'mls_key_package') {
    throw new Error('Expected a KeyPackage on the wire, got something else.');
  }
  return decoded[0].keyPackage;
}

export function encodeWelcomeForWire(welcome: Welcome): string {
  const bytes = encodeMlsMessage({
    welcome,
    wireformat: 'mls_welcome',
    version: 'mls10',
  });
  return toBase64(bytes);
}

export function decodeWelcomeFromWire(base64: string): Welcome {
  const decoded = decodeMlsMessage(fromBase64(base64), 0);
  if (!decoded || decoded[0].wireformat !== 'mls_welcome') {
    throw new Error('Expected a Welcome on the wire, got something else.');
  }
  return decoded[0].welcome;
}
