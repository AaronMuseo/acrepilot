# P0 data dictionary

| Store/table | Meaning and constraints |
|---|---|
| PostgreSQL accounts | UUID owner; unique normalized email/E.164 phone; `development_fixture` verification kind explicitly prevents treating it as real verification |
| challenges | Random UUID, hashed challenge+code, expiry, attempt count, single-use state, creation time; resend index |
| sessions | SHA-256 of random 256-bit token; owner FK, expiry and revoked state |
| records | Globally unique UUID, owner FK/index, positive optimistic version, schema-validated JSONB farm/task, tombstone, update timestamp |
| operations | Owner + operation ID unique; canonical validated operation payload and immutable acknowledgement |
| change_clock | Locked singleton with transactional bigint cursor |
| changes | Commit-ordered cursor, owner FK/index, immutable full record snapshot |
| schema_migrations | Applied migration version, initially 1 |
| SQLite records | Local UUID/version/JSON/tombstone; optimistic version includes queued edits |
| SQLite outbox | AUTOINCREMENT ordering, record ID, immutable operation JSON, optional retained failure acknowledgement |
| SQLite metadata | Owner fence, pull cursor, sync timestamp, non-secret farm draft |
| SQLite resolutions | Both local/server values, explicit choice and timestamp |
| SecureStore | Per-account random SQLCipher key, persistent device UUID, current session, selected language |

`farm` payload: name, default plot UUID, positive/null `areaM2`, null/validated lat-long location, explicit unknown soil/water. `task`: parent farm UUID, stable translation key, completion boolean. Names max 100 characters; area cap 1e9 m² is a defensive input bound, not a farm-size recommendation. No monetary floating-point representation is introduced.

Migration: `apps/api/migrations/001_initial.sql`; repeat application is idempotent in P0. Future changes must use new numbered files and an actual migration runner, never rewrite this schema against real stored records. Local version 1 rejects future versions. Full model in build-plan section 15 is retained, including composite ownership constraints for later normalized entities.
