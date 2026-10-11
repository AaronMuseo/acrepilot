# Password and session foundation

Implemented 2026-10-11 for development-fixture accounts only. No real phone/email ownership is claimed. Password setup and login, code verification, and refresh are unavailable when fixture authentication is disabled; a live provider is not wired.

## Behavior

- A successful code verification or password sign-in issues a random opaque access token (15 minutes) and refresh token (30-day absolute session-family lifetime). The database stores only SHA-256 hashes of these high-entropy tokens.
- Refresh consumes its token and revokes the previous access token atomically. Replay revokes that family, including its latest child. A lost refresh response may therefore require sign-in again; local records/outbox remain intact.
- The phone shares a single refresh across concurrent expired requests, saves the rotated pair in SecureStore before retrying, and retries the original request once. Network failures do not attempt refresh. Legacy sessions without refresh tokens can reauthenticate normally.
- Passwords accept 15–128 characters, without trimming or forced composition rules. Each uses a random salt and Node's asynchronous scrypt (N=131072, r=8, p=1, 64-byte output). Passwords are not persisted on the phone or logged.
- Setting/changing a password requires authentication within the past 10 minutes. A refresh does not extend that authentication age. Saving revokes all previous account sessions and returns a new pair.
- Password login allows five attempts per normalized identity per 15-minute window, stored server-side. Unknown identities use the same password derivation and generic failure. This is an initial account limiter; deployment still needs network-wide abuse controls, spending caps and monitoring.
- Sign-out revokes the current family. The existing local-pending guard remains in place.
- Migration 002 adds fields and indexes without replacing accounts, sessions or records. Existing session expiry is preserved; legacy authentication timestamps require fresh authentication before password setup.

## Endpoints

POST `/v1/auth/password/login`: identity and password; returns a session.
POST `/v1/auth/password`: authenticated recent session plus password; returns a replacement session.
POST `/v1/sessions/refresh`: refreshToken; returns a rotated session.
Existing code, revocation and sync endpoints remain available. See generated `openapi.json`.

## Provider boundary and outstanding requirements

`CodeDelivery` and `FixtureDelivery` define the first delivery boundary; the only wired adapter exposes a labelled development code. A real adapter needs verified sender/domain configuration, credentials, delivery/error states and tested permissions/cost controls. Do not plug network delivery into the current serialized challenge transaction without adding a reliable delivery/outbox workflow and production verification states.

Safe channel linking, dedicated password recovery, session-management UI, protected admin, account access/deletion and broader abuse controls remain planned P1 work. No accounts are auto-merged, and no paid service is activated by this slice.

## Sources checked

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): scrypt parameters when Argon2id is unavailable. Node's built-in scrypt avoids adding a native dependency here.
- [RFC 9700, section 4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14): refresh rotation and replay detection principles. AcrePilot's opaque fixture session endpoints are not a claim of a complete OAuth implementation.
