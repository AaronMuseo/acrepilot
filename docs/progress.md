# Progress and requirement-to-test checklist

Updated 2026-10-01. The full accepted specification is `build-plan.md`; no accepted capability is removed by this slice. Checked items describe implemented/tested scope only. **P0 exit gate remains open until signed physical-device checks pass.**

## P0 / first slice

- [x] Preserve specification and R01–R16 traceability.
- [x] pnpm workspace, exact lockfile, Expo mobile and NestJS API.
- [x] Typed validation contracts, initial SQL migration and generated OpenAPI.
- [x] English/Kiswahili choice and translated first-workflow labels, validation and status text.
- [x] Explicit development verification codes: expiry, attempt limit, single use, resend cooldown; hashed revocable session tokens.
- [x] Local farm/default plot with nullable area/location and unknown soil/water; durable form draft.
- [x] Bundled bilingual development maize guide; no sourced production guidance claimed.
- [x] Task complete/reopen with atomic SQLite outbox and persistent device/account IDs.
- [x] Retry-safe server acknowledgement, owner/parent checks and commit-ordered pull cursor.
- [x] Two-device conflict retains both versions with explicit choice and resolution audit.
- [x] Offline task edit → SQLite close/reopen → lost server acknowledgement → retry; exactly one accepted server edit in integration test.
- [x] Storage failure rolls back local record/outbox and pull/cursor transactions.
- [x] Source/provider risks, architecture decisions, screen-state inventory and device runbook.
- [x] Strict type check, ten integration tests, Android/iOS bundle exports and lockfile dependency checks.
- [x] EAS CLI installed; Expo project linked under aaronmuseo; development and self-contained device-test profiles configured.
- [x] Android native prebuild confirms SQLCipher; local EAS iOS archive includes shared packages and excludes local data/secrets.
- [ ] Apple Developer enrollment/activation deferred for cost; Aaron selected free Expo Go on iPhone, with no Mac/Android phone available.
- [ ] iPhone registration/provisioning and reachable private HTTPS fixture API configured.
- [x] Explicit Expo Go fixture-only storage exception implemented; native encryption requirement preserved. See `expo-go.md`.
- [x] Restored Expo SDK 57.0.0 for the installed iPhone client; package compatibility, tests, manifest and iOS bundle verified.
- [x] iPhone 13 Pro Expo Go preview opens; Aaron reports completing the test setup flow and seeing the test crop guide. This validates the first-screen journey with fixture data, not signed-build encryption.
- [ ] On-phone airplane-mode task edit, app restart, reconnection and one accepted server update observed together.
- [ ] Signed Android and iOS development builds installed; iPhone 13 Pro and affordable Android checks.
- [ ] Real-device SQLCipher/key persistence, airplane mode, restart, reconnection, storage pressure and large-text/screen-reader checks.
- [ ] Actual SMS/email provider and channel ownership verification (development fixtures do not count).
- [ ] PostgreSQL Docker/production connection, deployment and backup restore drill (embedded engine tests do not count).
- [ ] Provider permission, coverage, price/data quality and editorial/translation review.

## Accepted requirements retained

| ID | Phase | Current evidence and next gate |
|---|---|---|
| R01 | P1 | Fixture OTP/session tests only; real phone/email, password/code login, linking, rotation/recovery pending |
| R02 | P1 onward | Bilingual first slice; full settings, units/navigation and reviewed terminology pending |
| R03 | P2 | Multiple local farms with default plots, selected-farm tasks and name edits; plot subdivision, pins/resources/conditions pending |
| R04 | P2 | Owned/leased, sold, expansion, split/merge and preserved area history pending |
| R05 | P3 | Explicit test guide only; 20 reviewed crops (5/10/5), varieties, comparisons/custom entries pending |
| R06 | P3 | Source register started; admin, publication, translations/versioning/citations workflow pending |
| R07 | P4/P6 | Suitability and evidenced planting windows pending; no recommendations fabricated |
| R08 | P4/P5 | Existing/perennial/intercrop and repeated harvest model pending |
| R09 | P4 | Task toggle in slice; editable schedule, checklist and local/in-app reminders pending |
| R10 | P4 | Area conversion tested; seed, rotation and machinery tools pending |
| R11 | P5 | Optional finance, allocations, harvests/sales, break-even/dashboard pending in full |
| R12 | P6 | Weather provider candidates documented; cache, seasonal context, alerts pending |
| R13 | P7 | Market/grade/broker/seasonal/offer features pending; no unverified data published |
| R14 | P7 | Price history, follows and alerts pending |
| R15 | All | Durable local writes, retry/conflict tests; guide transfers, tombstone lifecycle and all-domain sync pending |
| R16 | All | Isolation and reliability tests, CI/runbooks; privacy flows, backup restore, accessibility/device release gates pending |

## Verification record

Automated tests are in `tests/slice.test.ts`: restart/lost acknowledgement; cross-owner access; two-device conflict; edit during in-flight sync; atomic rollback; OTP/session lifecycle; input validation/idempotency/units/translations. They run real SQLite and embedded PostgreSQL with the Nest HTTP boundary. Native encryption and physical device behavior are explicitly outside these tests.

Use `pnpm check` and mobile export to reproduce the latest verification. Build/export results and any remaining toolchain issues are recorded in `docs/validation.md`.

## Next implementation order

1. Finish signed-device P0 gate and qualify messaging providers with test credentials.
2. P1 real identity/session flows, admin protection, full shell/settings, sync recovery and operational hardening.
3. P2–P8 in the specification's order. Public launch still requires all R01–R16, including unavailable-data states. Android first, iOS maintained, Kenya, one owner/account, English/Kiswahili, open registration and free initial access remain accepted.

Deferred items remain exactly those listed in specification section 2; none are smuggled into this slice.

- [x] Retry sync now shows progress and its result beside the button in English/Kiswahili; prevents repeated taps during sync. API health checked successfully. Phone confirmation of this feedback and offline reconnection remains pending.

- [x] Aaron observed offline detection and brief syncing on the iPhone. Added last successful sync timestamp (including seconds) beside Retry sync; server-confirmed offline edit/reconnection remains pending.

- [x] Aaron confirmed the iPhone Expo Go Retry sync feedback and successful-sync timestamp work after testing online/offline feedback. This confirms the observed UI flow; signed-build encryption and offline restart gates remain open.

- [x] Pending task changes now show Waiting to sync directly on the task card and beside Retry sync, independently of network progress/error feedback. Typecheck passed. Aaron reported the prior waiting status was not visible; offline task-change confirmation remains pending.

- [x] Aaron confirmed the offline task edit and visible Waiting to sync status work after the task-card feedback update. Reconnection of this pending edit still needs user confirmation.

- [x] iPhone 13 Pro Expo Go offline-edit/reconnection test passed by Aaron's confirmation: task changed offline, Waiting to sync appeared, reconnecting and Retry sync preserved the edit, status became Synced, and the successful-sync timestamp updated. App restart, server-side duplicate-count verification, and signed-build encryption remain separate unverified gates.

- [x] Prepared GitHub-facing README with current scope, local setup, architecture, verification limits, and documentation links. Expanded .gitignore for environment secrets, signing material, local databases, generated native projects, builds, and logs; verified safe examples and lockfile remain includable. No GitHub repository creation or push performed.

## Continuation review — 2026-10-11

- [x] Reviewed current implementation and accepted phase gates; recorded the next credential-free P1 workflow in [next-slice.md](next-slice.md).
- [ ] Implement the bilingual navigation/persistent-settings slice and its acceptance checks. P0 native/device/provider gates remain open.

## P1 navigation and settings slice — 2026-10-11

- [x] Six bilingual routes: Home, Farm, Crops, Tools, Markets, More; wrapped navigation stays visible while content scrolls.
- [x] Shared provider owns the session/repository/sync lifecycle across routes. Existing record IDs, database filenames and schema remain compatible.
- [x] Home retains the task, Farm shows/setup the farm, Crops contains the labelled fixture guide, Tools/Markets explicitly show unavailable states.
- [x] More provides language, account-local area-unit preferences, retry/last-sync feedback, conflict resolution and guarded sign-out.
- [x] Acres/hectares/square metres use canonical square metres; unfinished drafts keep their entry unit, including legacy acre drafts.
- [x] Network, server failure, expired session and rejected-record feedback are distinct and translated.
- [x] Thirteen integration tests pass, including reopened preferences/drafts and unchanged record/outbox assertions.
- [ ] iPhone smoke test for the new navigation/settings UI; translation and screen-reader/large-text review remain open.

Language remains a device preference (existing SecureStore key); area units and farm drafts are isolated per account. No new services, credentials, production authentication, or reviewed crop data have been enabled. P0 native gates and full P1 acceptance remain open.

- [x] P1 slice validation: TypeScript, 13 integration tests, Android/iOS Expo exports passed. Phone smoke test remains open.

- [x] Moved all six destinations into a fixed bottom navigation bar with symbols, translated labels, selected/pressed states and safe-area spacing. At larger system text sizes it wraps to two rows. Typecheck passed; phone appearance confirmation pending.

## P1 password/session slice — 2026-10-11

- [x] Password setup/change and password sign-in for existing fixture phone/email accounts; hashed passwords, recent-authentication requirement, persisted attempt limits.
- [x] Short-lived opaque access tokens, hashed rotating refresh tokens, reuse detection and family revocation.
- [x] Mobile renewal coalesces concurrent failures and saves credentials securely before retry; offline records remain available.
- [x] Additive migration 002, code-delivery interface with fixture adapter, updated OpenAPI and bilingual security UI in More.
- [ ] Phone password setup, sign-out/sign-in and renewal smoke test.
- [ ] Real SMS/email providers, verified-channel linking/recovery, admin and full P1 acceptance remain open. See auth-sessions.md.

- [x] Password/session validation: 22 tests, typecheck and Android/iOS exports passed; additive legacy migration verified.

- [ ] Aaron reported a blank password sign-in button label. Both translation keys are present; restarted Metro with a cleared cache to rule out stale shared translations. Phone confirmation pending.

- [x] Added immediate English/Kiswahili sign-in validation beside identity/password/code fields, preserved separate code-only login, cleared obsolete challenges when identity changes, and placed server errors/progress within the sign-in form. Typecheck and focused validation tests run; phone confirmation pending.

## Farm management slice — 2026-10-11

Aaron asked to proceed with farm work and defer remaining sign-in work. R01 remains accepted; its outstanding requirements and phone checks are retained.

- [x] Multiple farms using the existing account-isolated records/outbox and one fixture task per farm.
- [x] Selected farm persists locally per account; Home shows the matching farm's task.
- [x] Farm tab lists/selects farms and creates new farms with saved name/area drafts and the current unit policy.
- [x] Rename a farm offline, preserving its ID, area, plot reference and task links; draft name retained locally until saved.
- [ ] Phone smoke test: add a second fake farm, switch farms, rename offline, reconnect and sync.
- [ ] Full P2: explicit plot entities/subdivision, resources/conditions/map, land tenure, dated area revisions and split/merge/sale remain planned.

Area editing is reserved for the revision/history workflow. No farm data is deleted and no new agronomy is supplied.

- [x] Farm slice validation: typecheck, 25 tests, Android/iOS bundle exports pass. Sign-in follow-up remains deferred at Aaron's request; phone farm-flow check pending.

## Next-session reminder — 2026-10-11

- [ ] Aaron reports some app items are missing/not visible on his iPhone; affected screens and cause not yet identified. Remind him when resuming, reproduce and fix before more feature work. See resume.md.
- Session stopped at Aaron's request; he will commit/push himself. Sign-in follow-up remains deferred.

## Farm visibility follow-up — 2026-10-12

- [x] Aaron identified missing Add farm/Edit farm name controls. Moved both actions above farm lists/details and positioned forms immediately after actions; compact preview notices retain fixture/unencrypted warnings and expandable details.
- [x] Expired-session reauthentication is shown in More while cached Farm screens remain accessible; keyboard inset handling added. Typecheck passed.
- [ ] Phone confirmation: Farm actions visible and usable after full reload. Historical undefined-function runtime error observed in Metro; no stack/root cause available, so this is not claimed resolved merely from source checks.

- [x] Clean-cache Expo iOS preview rebuilt and served successfully (manifest/bundle HTTP 200). Awaiting Aaron's Farm visibility confirmation.

## Farm-area revision slice — 2026-10-12

- [x] Change farm area from the Farm actions; draft retains unit, amount, effective date and reason across restart.
- [x] Dated correction/expansion/reduction revisions preserve a baseline (original date unknown), stored in square metres and displayed in the selected unit.
- [x] Offline outbox persistence, immutable accepted history, retry deduplication, date/reason validation and explicit conflict handling.
- [x] Keeping a conflicting local area appends today's correction to server history; both original versions remain in the resolution audit.
- [x] Typecheck, all 28 tests, OpenAPI generation and Android/iOS exports passed.
- [ ] Phone: confirm Add/Edit/Change area buttons visible; save an area revision offline, reload, reconnect and confirm sync/history.
- [ ] Full P2 plot/resource/tenure/split/merge/sale work remains open. Existing requirements and deferred sign-in work are preserved.

Prototype history limit: 100 entries including baseline. No old entries are discarded. No credentials or external agronomy data are required for this local fixture slice.

## Plot naming and selection slice — 2026-10-12

Aaron replied “ok perfect” after the farm-area handoff and authorized this next slice. This records his acceptance; it does not imply every detailed device test was run.

- [x] Explicit plot records with immutable farm links and server ownership checks.
- [x] New farms atomically create a default plot; legacy farms keep their reserved default ID and materialize it when named, without rewriting existing farm/task records.
- [x] Add/name/select plots offline, persist per-farm selection and name drafts; retain conflict versions for explicit resolution.
- [x] English/Kiswahili plot controls and unknown area/soil/water states. Farm totals remain independent; no copied or invented plot measurements.
- [ ] Phone: add and rename a plot offline, reopen, switch farms/plots and reconnect to sync.
- [ ] Plot areas/revisions/subdivision, lineage, tenure, resources and map integration remain open. Sign-in follow-up remains deferred.

No new credentials or verified external data are needed for this slice. Map and agronomy integrations remain unconfigured.

- [x] Plot slice validation: all 31 tests and typecheck pass, OpenAPI regenerated, Android/iOS exports pass. Phone plot check pending.

## Control clarity — 2026-10-12

- [x] Replaced ambiguous outlined plot actions with filled rounded buttons; secondary actions use a tinted rounded style.
- [x] Shared text fields use a neutral fill, small corner radius and stronger bottom border; selection rows use radio markers on Farm/Plots/area reasons and a selected side indicator.
- [x] Shared pressed/disabled feedback for actions; added visible new-password label. Typecheck passed.
- [ ] Aaron to confirm distinction and readability on iPhone.

## Plot areas and dated revisions — 2026-10-12

- [x] Aaron accepted the clearer controls (“ok nice”); retain this visual distinction.
- [x] Plot area editor uses the selected unit, persisted draft, effective date and reason; baseline and previous values remain in history.
- [x] Local and serialized server checks keep measured plot totals within a known farm area. Unknown farm/plot areas are not invented; totals summarize only measured plots.
- [x] Concurrent over-allocation retains the rejected local version for explicit conflict recovery. Farm reduction also checks recorded plot totals.
- [x] Legacy default plots materialize atomically before the first measurement. Plot conflicts preserve accepted history when keeping a local area.
- [x] Typecheck and all 34 tests pass; OpenAPI regenerated.
- [ ] Phone: record plot area offline, reopen, sync; test a total exceeding farm area and inspect history.
- [ ] Subdivision/split/merge and lineage, sale/inactivation, tenure, resources/conditions and maps remain open. No surveyed-boundary or overlap verification is claimed.

No new provider credentials or verified external data are required. All accepted requirements and deferred sign-in work remain preserved.
- [x] Plot-area Android/iOS exports and local preview/API checks passed.

## Save/label report and rendered UI checks — 2026-10-12

- Aaron reports plot-size text missing and Save not closing the editor. Fresh desktop component preview displays the label and saves 5,000 m², closes, and reopens with the saved value. Native issue remains pending confirmation after a clean Expo reload; stale runtime is a hypothesis, not a proven root cause.
- [x] Added reusable pnpm ui:preview (real AreaEditor/styles/translations/domain validation, mocked app state and storage; no production account/data). Inspected at 390px container width and checked required-field feedback and valid-save interaction.
- [x] Corrected required-area validation wording; typecheck passed.
- [x] Recorded mandatory rendered UI checks in AGENTS.md.
- [ ] Aaron to retry in freshly reopened Expo Go and confirm label/save.
