// Every MLS state-changing operation for a conversation (join, encrypt,
// decrypt) does read-modify-save on that SAME local group state -- exactly
// like a ratchet is supposed to work, this is only safe one operation at a
// time, strictly in order. Nothing about React Query's own scheduling
// guarantees that: refetch-on-mount, refetch-on-focus, and the websocket's
// own blanket "invalidate everything on any event" (see
// messaging/socket.ts) can all independently trigger useMessages/
// useConversationDetail to re-run for the same conversation while a
// previous run is still in flight. Two concurrent decrypt attempts for the
// same conversation can each read the same starting state and race to save,
// and MLS's ratchet-based generation counter isn't safe to advance from two
// competing starting points -- this is the real cause of "Desired gen in
// the past" happening on messages that were never actually decrypted
// before. Every call into cipher.ts/group.ts's state-mutating functions
// must go through this lock.

const locks = new Map<string, Promise<unknown>>();

export function withConversationLock<T>(
  conversationId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = locks.get(conversationId) ?? Promise.resolve();
  const settled = previous.then(fn, fn);
  // Never let one failed operation permanently jam the queue for this
  // conversation's later callers -- only used to sequence, never to
  // propagate a specific caller's error to a different caller.
  locks.set(
    conversationId,
    settled.then(
      () => undefined,
      () => undefined,
    ),
  );
  return settled;
}
