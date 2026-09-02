# wallet

Status: not yet implemented.

Parent-facing wallet: balance, ledger, UPI-first top-up (balance updates only
after server-side gateway confirmation via webhook - **never** on a
client-side payment callback), auto top-up (UPI Autopay mandate), spending
limits, item blocks, freeze, and canteen menu browsing / pre-order placement
and collection. The canteen _sale terminal_ itself is the separate native
Kotlin product, out of scope here (see `docs/architecture/overview.md`).

PIN gate required, same as `features/finance`.

**Source**: HLD §4.10 (wallet top-up sequence, "never confirm from the client callback"); API docs v4.0 Phase 5 · Wallet & Canteen (39 endpoints).
**Roles**: Parent.
