CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY);
CREATE TABLE IF NOT EXISTS accounts (id uuid PRIMARY KEY, identity text UNIQUE NOT NULL, verified_at timestamptz NOT NULL DEFAULT now(), verification_kind text NOT NULL CHECK (verification_kind = 'development_fixture'));
CREATE TABLE IF NOT EXISTS challenges (id uuid PRIMARY KEY, identity text NOT NULL, code_hash text NOT NULL, expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0, consumed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS challenge_identity_time ON challenges(identity, created_at);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, owner_id uuid NOT NULL REFERENCES accounts(id), expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS records (id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES accounts(id), version integer NOT NULL CHECK(version > 0), data jsonb NOT NULL, deleted boolean NOT NULL DEFAULT false, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS records_owner ON records(owner_id, id);
CREATE TABLE IF NOT EXISTS operations (owner_id uuid NOT NULL REFERENCES accounts(id), operation_id uuid NOT NULL, payload text NOT NULL, acknowledgement jsonb NOT NULL, PRIMARY KEY(owner_id, operation_id));
-- Locked counter guarantees commit-ordered cursors (a sequence alone does not).
CREATE TABLE IF NOT EXISTS change_clock (id integer PRIMARY KEY CHECK(id=1), value bigint NOT NULL);
INSERT INTO change_clock VALUES (1,0) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS changes (cursor bigint PRIMARY KEY, owner_id uuid NOT NULL REFERENCES accounts(id), record jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS changes_owner_cursor ON changes(owner_id, cursor);
INSERT INTO schema_migrations VALUES (1) ON CONFLICT DO NOTHING;
