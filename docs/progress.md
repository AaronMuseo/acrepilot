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
| R03 | P2 | One local farm/default plot; multiple farms/plots, pins/resources/conditions pending |
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
