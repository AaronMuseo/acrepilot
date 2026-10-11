-- Additive P1 migration: legacy fixture sessions remain usable until their existing expiry.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS family_id uuid;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_hash text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_expires_at timestamptz;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS refresh_consumed boolean NOT NULL DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS authenticated_at timestamptz NOT NULL DEFAULT '1970-01-01';
CREATE UNIQUE INDEX IF NOT EXISTS sessions_refresh_hash ON sessions(refresh_hash);
CREATE INDEX IF NOT EXISTS sessions_family ON sessions(family_id);
CREATE TABLE IF NOT EXISTS auth_limits (key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL);
INSERT INTO schema_migrations VALUES (2) ON CONFLICT DO NOTHING;
