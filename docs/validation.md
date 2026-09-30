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
