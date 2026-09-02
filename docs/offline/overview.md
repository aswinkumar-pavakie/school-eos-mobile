# Offline architecture

`src/services/offline` is a **generic, domain-agnostic** durable command
queue. It knows nothing about attendance, boarding, or wallet sales - see
`docs/architecture/services-vs-features.md` for why that boundary matters.

## Flow

```
feature action
  -> src/services/offline: enqueue()        durable SQLite row, PENDING
  -> (app resumes / connectivity restored)
  -> src/services/offline: runSyncPass()     replays PENDING items in order
  -> src/services/api: apiRequest()          the SAME client every online call uses
  -> outcome:
       success            -> ACCEPTED, row removed
       CONFLICT / STATE_TRANSITION_INVALID -> CONFLICT, needs reconciliation
       VALIDATION_ERROR / SEMANTIC_RULE_VIOLATION / IDEMPOTENCY_CONFLICT -> REJECTED (permanent, kept visible)
       network/timeout/dependency-unavailable -> retried with backoff, eventually BLOCKED after max attempts
```

## Queue item shape (`src/services/offline/queue/types.ts`)

`clientEventId`, `localSequence` (SQLite `rowid`), `actorId`, `deviceId`,
`operation` (feature-scoped label, for telemetry only), `method`,
`endpoint`, `idempotencyKey`, `payload`, `status`, `attempts`,
`nextAttemptAt`, `lastError`, timestamps.

## Rules

- **Every queued item is bound to `actorId`.** Sign-out (or a detected
  account switch) clears that actor's queue
  (`src/services/auth/session/sessionStore.ts` calls `clearForActor`) -
  never replay one account's writes under another session.
- **The idempotency key is generated once, at enqueue time, and reused on
  every retry.** A retry after a timeout must not produce a second business
  effect - this is why the queue owns key generation, not the sync pass.
- **A `CONFLICT` or `BLOCKED` item never resolves itself.** See
  `src/services/offline/reconciliation/reconcile.ts` - resolving what a
  domain-specific conflict _means_ (a locked attendance session vs. a closed
  trip are different problems) is the feature's job; this layer only
  provides the safe generic action (explicit re-queue).
- **Fail-closed vs. fail-open is a feature-level decision**, not encoded in
  the generic queue. Per the LLD: payment/wallet-debit/canteen-sale fail
  closed (refuse rather than risk overspend); attendance/boarding fail open
  and reconcile (never strand a child at a bus stop over a sync failure).
  Build this into each feature's sync adapter, not into
  `src/services/offline/sync/syncEngine.ts`.

## Building a feature's sync adapter

A feature does not call the generic queue's outcome handling directly for
UI purposes - it enqueues via `enqueue()`, and separately reads
`listByActor`/`listUnresolvedForActor` to show sync status in its own UI
(an "X unsynced" badge, a review screen for rejected items). Do not fork
`runSyncPass` per feature; if a feature's batch endpoint needs per-item
`ACCEPTED`/`DUPLICATE`/`REJECTED` semantics beyond what the generic engine
gives you, build that interpretation in the feature's own `api/` adapter on
top of this infrastructure.
