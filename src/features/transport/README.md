# transport

Status: not yet implemented.

Two distinct surfaces:

- **Parent**: live bus status (Not boarded / On bus / Dropped / Did not
  board), 15s-polling live map only during the child's active trip, no
  historical location ever.
- **Bus Attendant**: today's trip, stop list oversight, exceptions review,
  close-boarding. The raw NFC tap capture itself is device-credential
  authenticated hardware (`🔌 DEVICE` in the API docs) - most likely the
  separate physical bus terminal, not this app; confirm before assuming this
  app performs the tap. See `docs/api/gaps.md`.

Vehicle/route/stop/driver setup and the live fleet map are Admin-web-only.

**Source**: API docs v4.0 Phase 6 · Transport/NFC/GPS/Devices (67 endpoints); HLD §4.6 "Bus boarding" sequence.
**Roles**: Parent, Bus Attendant.
