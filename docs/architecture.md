# Architecture decision log

## ADR 001 — vertical P0 spike (accepted engineering default)

Use Expo Router + TypeScript on mobile and a NestJS REST modular monolith. The app targets **Expo SDK 57.0.0**, using the compatible `expo` package patch 57.0.26 and React Native 0.86.3. The user's iPhone reported Expo Go SDK 57; the earlier SDK 54 workaround was replaced. The lockfile is authoritative. Node 24 LTS. Admin and worker folders are reserved boundaries, not implemented services. No AI dependency.

## ADR 002 — explicit PostgreSQL transactions for feasibility

Use `pg` plus a checked-in SQL migration for this slice. This is an intentional deviation from the plan's **default**, not an accepted-feature change: explicit transactions make the acknowledgement/change-log commit boundary and commit-ordered cursor easy to inspect. Prisma remains a P1 evaluation decision rather than a second simultaneous persistence layer. Embedded PGlite executes PostgreSQL in tests and the optional local fixture server because Docker Desktop's engine was unavailable. Production remains PostgreSQL; native PG connection/restore must be tested separately.

## ADR 003 — SQLite source of truth

Shared synchronous SQL repository interface supports Expo SQLite on the phone and Node SQLite in tests. Short transactions save record and immutable outbox together. UI never writes directly to the API. Each account gets a distinct encrypted database and key in SecureStore; opening requires SQLCipher capability. `user_version=1`; newer schemas fail closed. Node test SQLite is intentionally unencrypted and contains synthetic data only.

User-authorized Expo Go exception: only `development_fixture` accounts can open separate unencrypted `expo-go-fixture-*` databases, with a distinct secure session pointer and a visible bilingual test-data warning. Signed native builds retain fail-closed encryption. This does not satisfy the P0 encryption/device restart gate. Paid Apple enrollment is deferred for cost.

## ADR 004 — authentication boundary is honest

Development fixture codes are explicitly returned to the test UI. They prove code lifecycle, local session continuity and account isolation, **not ownership of an external channel**. API fixture mode requires `NODE_ENV=development` and `DEV_FIXTURE_AUTH=true`. The separate fixture command is local-only by default and refuses production mode. Tokens are random, hashed server-side and kept in SecureStore, with seven-day expiration/revocation. Rotating refresh/access sessions, password hashing, device management, linking, support access and production abuse limits remain P1 gates. No vendor is quietly simulated as working.

## ADR 005 — deliberately narrow record aggregate

Farm contains a default plot UUID and shared area in P0. One task references that farm. Records preserve owner, UUID, version, data and tombstone field. P2 normalizes farms/plots, revisions/lineage/tenure without dropping histories. No finance, planting, agronomy or land-lifecycle rules are guessed here. Area is m² internally; acres displayed. Unknown inputs are explicit.

## ADR 006 — serialized proof before scale

Server locks a change-clock row to serialize operations and guarantee cursor commit order. A PostgreSQL sequence alone can expose cursor N+1 before N commits. P1 can partition the lock/cursor by account once equivalent concurrency tests pass. Conflicts are never silent last-writer-wins. P0 stops the local queue at a failed dependency and asks for resolution.

## Verified platform references (2026-10-01)

- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/): SQLCipher requires native plugin configuration; persistent DB alone does not implement sync.
- [NestJS setup](https://docs.nestjs.com/first-steps): supported Node baseline checked; repository targets Node 24.
- [Physical iOS builds](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/): Apple signing account and device setup required.
