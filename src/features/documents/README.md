# documents

Status: not yet implemented.

Read surfaces for generated/uploaded documents available to mobile roles -
report card PDFs, certificates - always via short-lived signed URLs from the
API, never a client-constructed or permanent public URL. Document
generation/upload management is largely Admin-web-only.

**Source**: LLD v5.1 §3.11 ("private documents... never expose permanent public URLs").
**Roles**: Parent (report cards, certificates), Faculty (study material - see `features/lms`).
