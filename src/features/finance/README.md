# finance

Status: not yet implemented.

Parent-facing only in this app: viewing fee obligations, paying (with a
combined multi-child total and a separate receipt per student even from one
transaction), and requesting due-date extensions. Fee structure
configuration, collections, defaulters/reminders, refunds/expenses and
payroll are Finance-web-only - not in scope for this repo.

Every wallet/fee screen requires the parent PIN gate - see
`docs/security/overview.md` before building the entry flow.

**Source**: API docs v4.0 Phase 5 · Finance (43 endpoints: 38 `WEB`, 4 `APP` - payments + extension requests only); frontend workflow doc, Parent §"Fees".
**Roles**: Parent.
