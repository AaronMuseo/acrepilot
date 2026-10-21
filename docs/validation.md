# Validation record — 2026-10-01

## Latest: Expo Go SDK 57 route

- User deferred Apple enrollment for cost and requested Expo Go on iPhone 13 Pro. Local Android compilation was stopped while obtaining the required NDK; no APK/native-build success is claimed.
- The iPhone's installed Expo Go reported SDK 57 and rejected the earlier SDK 54 bundle. The project now targets SDK 57.0.0 with `expo` package 57.0.26, React Native 0.86.3 and compatible native packages. The SDK 54 Metro override was removed.
- Current SDK 57 checks pass: `expo install --check`, lockfile peer check, strict TypeScript and all **10 integration tests**.
- The live API and iPhone manifest respond HTTP 200; the manifest reports SDK 57.0.0 and its iOS bundle returns HTTP 200 (6,889,050 bytes).
- Aaron reports the Expo Go preview loaded on his iPhone 13 Pro, he completed the test setup, and the test crop guide is visible. No on-phone offline/restart/sync outcome was reported yet.
- Android and iOS production JavaScript bundle exports pass on the current SDK 57 dependency set.
- API bound to the current Wi-Fi address; Metro uses LAN mode. No public tunnel, cloud build, enrollment or purchase.
- All earlier SDK 54 and 57 bundle/prebuild evidence below is historical; native prebuild must be regenerated before future signed builds.

## Passed

- TypeScript strict check (`pnpm typecheck`).
- Ten integration tests (`pnpm test`), exercising real SQLite, embedded PostgreSQL and NestJS HTTP requests, including fixture-only Expo Go storage isolation.
- Offline edit persists through database close/reopen; deliberately lost acknowledgement is replayed without a duplicate accepted server change.
- Cross-owner guessed IDs/parent links rejected; pull is owner-scoped; local account fence rejects a mismatched owner.
- Two-device conflict retains both values and records the explicit resolution.
- Older acknowledgement cannot overwrite newer local edit.
- Injected local write failure rolls back record/outbox and record/cursor together.
- OTP expiry, attempt limit, single-use code, resend cooldown and session revocation.
- Invalid/bounded payloads, operation-ID reuse detection, area conversion and complete translation keys.
- Concurrent identical pushes return identical acknowledgements; tombstone rejects stale reactivation.
- Future local schema is refused without rewriting its migration version.
- Android and iOS Hermes bundle exports succeed.
- Expo SDK dependency compatibility check succeeds.
- The current SDK 57 lockfile peer check and Expo compatibility check pass. TypeScript 5.9.3 satisfies EAS CLI's supported peer range.
- EAS CLI 24.8.0 login verified and project linked. Android native prebuild succeeds with `expo.sqlite.useSQLCipher=true` and external-storage permission removal directives. This does not yet prove native compilation or device encryption.
- EAS iOS archive inspection succeeds; shared packages are included and excluded local data/environment/signing/cache files are absent. EAS's archive inspection preserves basic Git metadata.
- EAS resolves the iOS `device-test` profile successfully: internal distribution, physical device, embedded JS (`developmentClient=false`), Node 24.16.0/pnpm 11.19.0. The development environment currently has no API URL configured.
- Development startup (`pnpm dev:fixture`) uses a persistent `.local/pglite` database. Startup directory creation fixed during smoke test.
- Preserved source specification SHA-256 matches Downloads original: `CBB1DA259A28D334D521D31AAE5663441DE5A07C1FB59A9BC2A9A0FD2CC10E97`.

## Not verified / open gates

- Physical Android/iPhone installs, SQLCipher binary/key lifecycle, native rendering/accessibility and signed builds. Expo config enables SQLCipher; application refuses plaintext fallback. Node tests do not prove phone encryption.
- Full production PostgreSQL connection/Docker image execution: local Docker Linux engine unavailable. PostgreSQL migration and transactional behavior were exercised with PGlite.
- CI configuration checked in; no remote CI run exists yet. Git repository initialized; no remote, commit or publication created.
- Real external phone/email ownership: development verification deliberately cannot establish it. No OTP sent.
- All data-provider credentials/licences/coverage, editorial and language review, push credentials, signing/store accounts, backup restore and production release criteria remain open.
- UI is compiled but has not been visually inspected on a physical device. Full P0 exit gate remains open.

## Scope of evidence

Tests use synthetic fixture records, never farmer data. Migration runs twice in tests to verify repeatability. No financial, agronomic, weather or market accuracy claim follows from these checks. Repeat device checklist in `device-test.md` before marking P0 complete.

### iPhone sync feedback confirmation
Aaron confirmed Retry sync feedback and the successful-sync timestamp work in Expo Go on iPhone 13 Pro, following online/offline testing. User-observed confirmation; no additional server-side edit-count or signed-build validation is claimed.

- User device check: Aaron confirmed the offline task-change / Waiting to sync flow works on iPhone 13 Pro in Expo Go. Reconnection of that pending edit remains unconfirmed.

- Aaron confirmed the complete Expo Go offline-edit/reconnection flow on iPhone 13 Pro: local task change and Waiting to sync while disconnected; edit retained, Synced status, and updated timestamp after Wi-Fi reconnection and Retry sync. This is user-observed device evidence; it does not establish offline app restart, native encryption, or server-side operation counts.

### Continuation baseline — 2026-10-11
Type checking passed. All ten integration tests passed when rerun with local network access. The initial restricted run failed seven HTTP-based cases with loopback EACCES; the three non-HTTP cases passed. No application code changed during this review. Remote CI was not queried.

### P1 navigation/settings — 2026-10-11
Type checking and all 13 integration tests passed. Android and iOS Expo exports passed. New tests verify persisted account-scoped area units without record/outbox mutation, retained legacy/new draft units after reopen, and conversion round trips/invalid input. Existing ownership, retry, conflict and rollback tests still pass. No native schema migration was required. Phone navigation, language reload, large-text/VoiceOver and the new settings workflow remain to be confirmed using docs/device-test.md.

### Password/session foundation — 2026-10-11
Type checking and all 22 tests passed. New coverage includes expired access renewal, refresh expiry/replay/concurrency, family revocation, recent-auth password setup, hashed storage, attempt limits, unavailable auth, concurrent mobile renewal, secure-persistence failure, and legacy database migration retention/reapplication. Android/iOS Expo exports passed. Password and renewal phone testing remains pending; this does not establish real phone/email ownership.

### Multiple-farm workflow — 2026-10-11
Type checking and all 25 tests passed. New integration coverage creates two farms offline, selects one, edits its task and the other's name, reopens the local database, synchronizes, and checks preserved farm/task associations and area. Invalid farm selections and task-as-farm edits are rejected. Phone workflow confirmation remains pending.

Farm slice mobile verification: Android and iOS Expo bundle exports completed successfully; final typecheck passed.

2026-10-12 Farm visibility refinement: Typecheck passed. Add/edit actions moved before lists/details, preview warnings compacted, and expired-session form scoped to More. Phone verification pending; existing records/schema unchanged.

Clean Expo preview verification: iOS manifest and rebuilt JavaScript bundle both returned HTTP 200. No physical-device visibility confirmation is claimed.

### Farm-area history — 2026-10-12
Typecheck and all 28 tests passed. Added offline restart and lost-ack retry coverage, date/reason validation, JSONB key-order tolerance, server rejection of missing/rewritten history, unknown-area handling, and two-device conflict resolution with retained audit. OpenAPI regenerated; Android/iOS exports passed. Phone rendering and workflow confirmation remain pending.

### Plot naming and selection — 2026-10-12
Typecheck and all 31 tests passed. Added per-farm selection/offline restart, lost-ack retries without duplicates, immutable/owned/live farm parent checks, legacy default-ID retention and explicit concurrent-name conflict resolution. OpenAPI regenerated. Android/iOS exports passed; final default-name conflict-label adjustment typechecked. Phone plot workflow remains pending.

Control clarity: shared action/input/selection styles typecheck; Android and iOS exports pass; live iOS preview bundle returns HTTP 200. Physical-phone visual confirmation remains pending.

Plot areas: typecheck and all 34 tests passed. Coverage adds offline history persistence, local capacity rejection, reductions, concurrent server allocations and recovery, missing-history rejection, legacy default materialization and unknown farm totals. OpenAPI regenerated.
Plot-area Android/iOS exports passed; refreshed iOS bundle and API health both returned HTTP 200. Phone testing remains pending.

Rendered UI check: actual AreaEditor through React Native Web, 390px container, fake app-state adapter. Verified visible heading/labels, empty input error, valid 5,000 m² save closing the editor, reopened value. Screenshot .local/area-editor-ui-check.png. This does not establish native keyboard behaviour, actual SQLite persistence or resolution of Aaron’s phone symptom. Fresh Metro restarted; physical confirmation pending.

2026-10-18 soil observations: typecheck and 36 tests passed, including offline history/restart/lost ack, immutable snapshots, owner/parent enforcement, invalid dates and note limits. UI inspected at 390px using actual component + mocked state: future date shows error; valid clay observation closes form and displays retained notes. Screenshot .local/soil-ui-check.png. Native phone/keyboard confirmation remains pending.
Soil slice Android/iOS bundle exports passed.

Water observations: typecheck and all 38 tests pass. Covers multi-source/unknown/none persistence, duplicate-source and contradictory-state rejection, lost acknowledgements, immutable history and owned parent linkage. Actual React Native Web component checked at 390px: default state fixed after visual discovery, required source validation, multiple source selection, successful save/history and Cancel. Phone checks remain pending.
Water slice Android/iOS exports passed; final default-state correction also typechecked and was verified in the rebuilt rendered preview.

Soil-test UI: actual SoilTests component via React Native Web with fake state at 390px; checked visible fields, invalid pH, decimal-comma save, displayed pH/reference history, reset and Cancel. Native keyboard and real-phone sync remain pending.
Soil-test integration checks: typecheck and all 39 tests passed, covering report persistence/retry, immutable history, numeric bounds, note length and owned parents. Android/iOS exports passed; OpenAPI regenerated.

Tenure UI: actual TenureHistory component at 390px through React Native Web with fake state; checked Unknown default, leased fields, reverse-date error, successful save/history and reset/Cancel. Screenshot .local/tenure-ui-check.png; native phone checks pending.
Tenure integration verification: typecheck and all 40 tests passed; Android/iOS exports passed and OpenAPI regenerated. Coverage includes offline restart/lost acknowledgement, immutable tenure snapshots, parent ownership and lease validation.

Lease pricing/date selectors: final check has 42 passing tests (initial full run had one ECONNRESET in an existing test, passed rerun). Calendar roundtrips, exact KES parsing/bounds, acre/hectare/plot estimates, half-up rounding, overflow rejection, historical area snapshots and retry persistence covered. Native iOS/Android exports passed. Browser form at 390px verified selected/cleared dates, precision validation, live estimate, price+period history; native iOS UI requires device confirmation. Screenshot .local/lease-pricing-ui-check.png.

Explicit soil copy: typecheck and 44 tests passed, OpenAPI generated. Actual SoilObservations component with fake state checked for source choice, editable prefill, copied history/provenance, Cancel retention and fresh reset. Native phone flow remains pending.
Soil-copy Android and iOS exports passed.

Plot conditions: typecheck and all 46 tests passed; unknown/known history, offline restart/lost acknowledgements, immutable snapshots, note limits, dates/enums and parent ownership covered. Actual component checked at 390px for defaults, date error, valid save/history, long labels, reset and Cancel. Screenshot .local/plot-conditions-ui-check.png; native phone checks pending.
Plot-condition Android/iOS exports passed.

Shared storage: typecheck and all 49 tests passed. New tests cover capacity units/precision/null, multi-plot persistence/retry, edit retention, invalid/cross-farm/cross-owner links, farm immutability and two-device resolution audit. UI checked at 390px with actual component and fake state: required name/positive capacity, litres equivalent, links, add/edit, Cancel and draft restoration. Native phone checks pending.
Shared storage Android/iOS exports passed.

## UI cleanup audit — 2026-10-19

Typecheck and 49 tests pass. Actual combined FarmManager rendered with fake state in the browser; toggles, retained draft/save, plot switching, history, management open/cancel and storage add/save/edit/cancel exercised. Narrow/default and 390px layout inspected; screenshot .local/farm-cleanup-ui.png. Native iPhone behaviour remains pending.

An extra `expo export --platform all` attempt failed in the web target resolving expo-sqlite's wa-sqlite.wasm. Full web app export is not verified/supported by this pass; the React Native Web component harness uses mocked storage. Android/iOS exports are checked separately. No native storage workaround introduced.

Separate Android and iOS exports both passed after cleanup (2026-10-19).

## Design refinement validation — 2026-10-21

Typecheck and all 49 tests passed. Sandboxed integration tests initially failed with EACCES connecting to their loopback fixture API; rerunning with local-network permission passed. Native Hermes export initially failed writing sandbox temporary bytecode; rerunning outside that restriction passed both iOS and Android. Full web export retains the known expo-sqlite wa-sqlite.wasm resolution failure; the browser harness intentionally mocks storage/API/router.

Chrome rendered checks: 390px English light/dark, 320px Kiswahili, desktop. Exercised Farm rename blank error/save; add/cancel; plot-area editor/cancel; soil disclosure collapse/reopen/save; conditional lease fields/cancel; storage blank error/add/edit/cancel; water known-source validation; pH required validation; conditions open/cancel; all six navigation destinations; Home task completion and pending feedback; loading skeleton/error/empty fixtures. Palette text contrast minimum among checked pairs 5.76:1; input boundary minimum 3.15:1. Screenshot `.local/design-refinement.png`.

The preview repository is in-memory fake data and does not prove real SQLite, sync or iPhone behaviour. Native keyboard/date picker/large text/VoiceOver and physical-device dark-mode checks remain pending. No standalone linter is configured; TypeScript is the configured static check. Motion is omitted rather than animated, including the date sheet, so no reduced-motion branch is needed.

## Shared water sources — 2026-10-21
Typecheck + 52 tests pass; OpenAPI regenerated. The full-shell browser harness uses actual components with a fake repository. Checked required-name validation, defaults, type/reliability, two links, shortage note, add/save, edit/save, Cancel/draft restoration, Kiswahili/English and dark/light rendering at the narrow browser viewport. .local/water-source-ui.png is local visual evidence. Browser clipboard focus interruptions required re-observation/retry; saved field values were verified afterwards. Native keyboard, VoiceOver and offline device behaviour remain unverified.

Shared-source Android and iOS exports passed (52-test slice).

## Native render failure report — follow-up
Aaron reports a black screen with seven uncaught errors and one render error involving `pick` after the shared-source handoff. Native acceptance is blocked; passing exports/browser mocks did not establish native startup. Two eager form draft-schema `.pick` calls exist (plot conditions/shared sources); exact error/stack not yet supplied. Current bundle compiles. Verified/restarted the AcrePilot Expo process with --clear and requested a full phone close/reopen while capturing fresh Metro output. Stale runtime is a hypothesis, not a proven root cause or resolved defect. No feature work or data reset should proceed until the phone result/error is checked. The ambient browser :8090 had no server listening; current component harness is :8092 and is not the Expo Go application.

Phone recovery: Aaron confirmed “it works perfect” after the corrected LAN QR. Expo manifest/iOS bundle and fixture API health returned HTTP 200 at 192.168.1.8 before handoff. Native startup now confirmed; original pick error root cause not established.

## Irrigation — 2026-10-21
55 tests/typecheck/OpenAPI and Android/iOS exports pass. Actual IrrigationHistory in full-shell React Native Web preview with fake repository verified required-method feedback, above-plot coverage rejection, 2,000m² with drip+sprinkler, saved 49.4% for a 4,046.8564224m² snapshot, Cancel/restored draft, unknown and no-irrigation states, both languages/themes, desktop and 390px layout. Screenshot .local/irrigation-ui.png. Browser clipboard focus errors required re-observation and retry; successful field values were checked before save. Tests use actual SQLite + PGlite/API and cover offline historical snapshot acceptance after another device reduces plot area. Native keyboard/date/VoiceOver and device offline acceptance remain pending.
