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

Farm-area revisions (2026-10-12): optional areaHistory on farm JSON contains 2–100 entries with UUID, effectiveDate (YYYY-MM-DD or null for baseline), areaM2 (nullable only for an unknown baseline), and reason (baseline/correction/expansion/reduction). Legacy farms need no backfill. First change captures the previous value with unknown date, then appends the change. Accepted entries cannot be removed or rewritten; changes must append in nondecreasing effective-date order and cannot be future-dated in Africa/Nairobi. Current area equals the latest entry. Draft metadata uses draftAreaRevision:<farm UUID>. No SQLite or SQL column migration is required for this optional validated JSON field.

Plot naming slice: plot JSON has kind=plot, immutable farmId, trimmed 1–100 character name (null means translated Default plot), areaM2=null, soil=unknown and water=unknown. The sync parent check requires a live farm owned by the authenticated account. New farms enqueue farm, default plot and fixture task atomically. Older farms expose their reserved plotId locally without a write during rendering; naming that plot creates its record and normal version conflicts protect concurrent names. selectedPlot:<farm UUID> stores device-local selection; draftPlotName:<farm UUID>:<plot UUID or new> stores an unfinished name. Adding plots does not allocate or increase area. No new SQL columns are needed.

Plot area extension: areaM2 is now positive/null, with optional immutable areaHistory matching farm revisions (2–100 entries). Plot creation starts with unknown area; first measurement captures a null baseline. Legacy virtual defaults enqueue creation and measurement atomically. Measured plot totals exclude unknown values and cannot exceed a known farm area (1e-6 square-metre numeric tolerance). Capacity is checked under the existing server change-clock lock, including farm reductions; concurrent capacity conflicts retain local/server versions for recovery. Plot edits do not revise farm total automatically. Dates do not establish surveyed boundaries or validate overlap; splits and historical lineage remain pending.
