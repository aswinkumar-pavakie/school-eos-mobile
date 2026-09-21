// Tiny shared base64<->Uint8Array helpers, used everywhere in this module for
// both server-wire transport and SecureStore persistence. Relies on the
// global Buffer polyfill react-native-quick-crypto's install() provides (see
// setup.ts, called before anything in this module touches these).

export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}
