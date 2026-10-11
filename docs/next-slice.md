# Next implementation slice — P1 navigation and settings

Review date: 2026-10-11.

## Baseline

The first farm/task/fixture-guide workflow exists. Aaron confirmed offline task edits, visible waiting status, reconnection, retained edits, and successful sync feedback on iPhone 13 Pro in Expo Go. The repository has an initial commit and a configured GitHub origin; this review did not query remote CI or remote branch state.

P0 is still open: signed native builds, physical-device encryption/restart, affordable Android testing, provider qualification, and operational database checks are not complete. Moving ahead with independent P1 work does not waive these gates or change R01–R16.

## Recommended next slice

Build the bilingual navigation and persistent settings workflow before adding more farming features:

- [x] Extract session, local repository, and sync lifecycle from the single Home screen into shared app state, with one sync engine per active account.
- [x] Add Home, Farm, Crops, Tools, Markets, and More navigation from the specification; unfinished destinations clearly state their current availability and offer no fabricated data.
- [x] Move existing farm/task and fixture-guide views into appropriate destinations without changing saved record IDs or clearing local data.
- [x] Add persistent language and area-unit preferences: acres, hectares, square metres. Store areas in square metres; changing display units never rewrites their values.
- [x] Put account actions and sync details in More; retain pending status beside editable tasks and explicit conflict resolution.
- [x] Separate connection failures, expired sessions, and rejected edits in translated recovery messages.
- [x] Automated tests verify area preferences and unit-tagged drafts survive database reopening without rewriting records/outbox; existing account-isolation, retry and conflict tests pass.
- [ ] Phone smoke test: navigation, language persistence, units, retained drafts, and offline task edit/reconnection.
- [ ] Run type checks, relevant persistence/sync tests, Android/iOS bundle exports, and the phone smoke test; update progress evidence.

No paid services or new credentials are required for this slice. Fixture authentication remains visibly labelled. Production authentication and full P1 completion are not claimed.

## Subsequent work

1. Real identity/session slice: delivery-adapter boundary, verified phone/email, password/code sign-in, safe channel linking, rotating revocable sessions, and recovery. Live delivery requires qualified SMS/email providers, credentials, sender/domain setup, and agreed spending controls.
2. Protected admin foundation and operational verification: real PostgreSQL migration/restore checks, CI execution evidence, and deployment configuration. Hosting needs its own concrete decision before expenditure.
3. Resume outstanding native P0 tests when signing/device access is available. Keep Expo Go for affordable fixture testing meanwhile.
4. Proceed through P2 farm/land modelling and later phases in specification order. Agricultural, weather, and market features require reviewed or verified sources before enabling real guidance.
