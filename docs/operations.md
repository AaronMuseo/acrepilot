# Deployment and backup runbook (development scaffold)

No deployment, purchases or store publication performed. `compose.yaml` supplies a local PostgreSQL instance only; use synthetic data and change all credentials before any real environment. `Dockerfile` is a development API runner; production bundling/hardening and worker/Redis/media services remain P1 onward.

Apply migrations before start. Use TLS for all off-device traffic. Keep database inaccessible publicly, keep provider keys only server-side, disable development authentication, and never log OTPs, session tokens, coordinates or finances. Current code logs only generic startup/framework messages.

Before production: choose permitted hosting region, configure secrets and restricted service accounts, implement real authentication and refresh rotation, add provider budgets/rate limits, readiness/metrics/error monitoring, separate protected admin, retention/deletion policies and audited support access. Do not open registration from this P0 scaffold.

## Backup/restore gate

For a real PostgreSQL test environment, create an encrypted `pg_dump --format=custom` backup in restricted storage, retain schema migration versions, and back up licensed media/version manifests separately. Restore into a fresh isolated database using `pg_restore`, run migrations, then verify owner isolation, record counts, operation acknowledgements/cursors and replay of an already-accepted operation. Record timings/checksums and confirm point-in-time recovery policy. Delete only explicitly disposable test environments. This drill is **not yet run**.

Phone outbox is not a backup: local-only changes can be lost with device loss/reinstall. Preserve encrypted cache on sign-out; warn/block while unsynced. Never roll back a mobile migration by erasing user data. Future schema updates must include forward migration fixtures and retained histories.
