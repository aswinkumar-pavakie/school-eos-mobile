import { NoGroupStateError } from './cipher';

// Curates the one E2EE error we can safely and specifically recognize
// (NoGroupStateError -- the only named/exported error class this layer has)
// into an actionable message, without touching cipher.ts/group.ts's own
// technical error text (those stay developer-facing for logs). Every other
// MLS protocol/state error in this layer is a plain, unnamed `Error` with no
// safe way to distinguish one cause from another here, so those
// deliberately fall back to the caller's own generic message rather than
// guessing at a cause we can't actually confirm.
export function getSendMessageErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof NoGroupStateError) {
    return 'You need to reopen this conversation before you can send messages.';
  }
  return fallback;
}
