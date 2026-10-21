# AcrePilot delivery checklist

Updated 2026-10-18. Specification: [build-plan.md](build-plan.md). Detailed evidence: [progress.md](progress.md), [validation.md](validation.md). Checked means implemented within the stated scope; full P0/P1/P2 acceptance remains open.

## Implemented foundations and farm workflows

- [x] Workspace, Expo SDK 57 mobile app, Nest API, SQLite outbox, SQL migrations, shared validation and OpenAPI.
- [x] English/Kiswahili, bottom navigation, account-specific area units and persistent drafts.
- [x] Fixture test-code accounts, password/session foundation, rotating refresh tokens and account isolation.
- [x] Multiple farms and plots: create, rename and switch with offline persistence.
- [x] Farm and plot area revisions with dates, retained history and measured plot-total validation.
- [x] Plot soil observations: type/notes/history and explicit editable copying within a farm with source provenance.
- [x] Dated slope, drainage and road-access observations with unknown defaults and offline history.
- [x] Plot water observations: multiple sources, unknown/none states, overall reliability and shortage notes.
- [x] Shared water-storage resources with optional litre/m³ capacity, multi-plot links and offline add/edit.
- [x] Manual soil-test pH records with date and optional report reference.
- [x] Plot tenure records: owned/leased/unknown, native date selectors, optional lease dates, KES rates/basis/payment periods and historical area estimates.
- [x] Fixture crop guide and complete/reopen test task.
- [x] Automatic/manual sync, visible pending/success feedback, idempotent retries and explicit conflict recovery/audit.
- [x] Clear button/input/selection styles and reusable rendered-component UI preview.

## Remaining foundation and release gates (P0/P1, R01/R02/R15/R16)

- [ ] Real SMS/email verification, account linking/recovery, remaining sign-in work (deferred by Aaron).
- [ ] Secure admin shell and full foundation acceptance.
- [ ] Signed native builds, real-device SQLCipher/key persistence, affordable Android coverage and complete offline restart/performance checks.
- [ ] Production PostgreSQL/deployment, private HTTPS, backups and restore drill.
- [ ] Reviewed translations, accessibility/large-text/screen-reader checks, privacy/account deletion and release operations.
- [ ] Broad all-domain offline sync acceptance and downloadable guide lifecycle.

## Remaining farm model (P2, R03/R04)

- [ ] Map pins and map/provider integration.
- [ ] Remaining farm-wide/shared resources: water-source entities, irrigation methods/coverage and pumping costs (basic water-storage resources are implemented).
- [ ] Machinery, labour, budget, infrastructure and remaining condition/resource fields (basic slope/drainage/access are implemented).
- [ ] Further lab values/methods/report support and copying of remaining condition types (soil copying is implemented).
- [ ] Atomic subdivision/split/merge, parent/child lineage and area snapshots.
- [ ] Sold/inactive land and partial sales, historical totals, visible task/planting handling.
- [ ] Lease reminders and harvest-beyond-lease acknowledgement (rates and payment periods are implemented).
- [ ] Comprehensive phone acceptance for farm/plot/observation/tenure flows.

## Product phases still ahead

- [ ] P3 (R05/R06): 20 reviewed crops (5 grains, 10 vegetables, 5 fruits), sourced varieties, comparisons/custom entries, admin publication/versioning/translations and offline packages.
- [ ] P4 (R07–R10): suitability, plantings/perennials/intercropping, readiness/tasks/reminders, seed/rotation/machinery tools.
- [ ] P5 (R08/R11): budgets, expenses/allocations, repeated harvests and sales, break-even and dashboard.
- [ ] P6 (R07/R12): weather adapter/cache, planting-window evidence, advisories and alerts.
- [ ] P7 (R13/R14): verified market/grade prices, broker offers, seasonal evidence, history/follows/alerts.
- [ ] P8 (R16): full device/security/privacy/accessibility/performance testing and store release.

## External dependencies

- [ ] Messaging credentials and verified channel ownership provider.
- [ ] Reviewed/cited agronomy catalogue and translation review.
- [ ] Map/weather provider terms, credentials where required, and coverage validation.
- [ ] Verified licensed/comparable market data and ingestion sources.
- [ ] Native signing/release access when budget and devices permit; free Expo Go remains the current route.

The specification's explicitly deferred features remain deferred; all R01–R16 requirements are retained. No production crop, weather, market or financial recommendation is supplied by the fixture preview.

- [x] 2026-10-19: Farm UI audit/cleanup; grouped details/history, clear context, misleading summaries removed; desktop rendered controls checked. See ui-audit.md.
- [ ] Cleanup iPhone reload/keyboard/scroll/VoiceOver check; all broader device and release gates remain open.

## UI refinement follow-up — 2026-10-21
- [x] Semantic light/dark tokens, reusable Button/Skeleton, readable navigation and shared form styles.
- [x] Browser-rendered interaction checks and 49 tests; see validation.md for evidence and limits.
- [ ] iPhone full reload, missing-control check, keyboard/native picker, VoiceOver and large text remain open.

## Shared water sources — 2026-10-21
- [x] Named farm supplies with explicit source type/reliability, multi-plot links, shortage notes and offline add/edit/conflict handling.
- [x] Aaron confirms Add farm/Edit farm name work on iPhone after reload.
- [ ] Phone source add/edit/keyboard/offline restart/reconnect check. Irrigation coverage/methods/pumping costs and remaining resource fields remain pending.

## Irrigation slice — 2026-10-21
- [x] Plot irrigation methods, explicit unknown/no-irrigation states, optional irrigated area, dated offline snapshots and preserved plot-area context.
- [x] 55 tests, typecheck, OpenAPI, Android/iOS exports and browser UI checks pass.
- [ ] iPhone irrigation/native picker/keyboard/offline restart and reconnect checks.
- [ ] Pumping costs, irrigation-to-resource links and remaining P2 features remain open.
