# AcrePilot

**Your farm, one clear step at a time.**

A Kenya-first farming companion built around local saves, clear sync feedback, and English/Kiswahili support. AcrePilot is designed to help farmers manage their farms even when connectivity is unreliable.

> **Development preview · P0 + initial P1 foundations**
> The current app uses test accounts and labelled fixture content. It is not ready for production or agricultural decision-making.

## What works today

- **Navigation and settings:** Home, Farm, Crops, Tools, Markets, and More; saved language and account-specific acres/hectares/square-metres preferences. Tools and Markets clearly show unavailable states.
- **Account security preview:** set/change a test password, sign in with it, and renew sessions automatically. Real SMS/email ownership verification remains pending.
- **Bilingual setup:** English and Kiswahili, with a development verification-code flow.
- **Farm setup:** multiple farms with a default plot each, farm switching and name edits, optional area, and explicit unknown soil, water, and location states.
- **Offline task updates:** complete or reopen a task, save locally, and queue changes for sync.
- **Sync recovery:** automatic foreground retries, manual retry, visible pending status, and a successful-sync timestamp.
- **Conflict handling:** retain both local and server values and let the user choose explicitly.
- **Test crop guide:** a bundled, clearly labelled maize fixture without planting dates, rates, or yield claims.

The offline task-edit and reconnection flow has been tested by the project owner on an **iPhone 13 Pro using Expo Go**. Automated tests cover persistence, retry/idempotency, account isolation, conflicts, rollback, and fixture authentication. Full P0 acceptance is still open.

## Built with

| Layer | Technology |
| --- | --- |
| Mobile | Expo SDK 57, React Native, Expo Router, TypeScript |
| Local storage | SQLite with a durable outbox; SecureStore for session material |
| API | NestJS with shared Zod contracts |
| Database | PostgreSQL; embedded PGlite for local development |
| Workspace | pnpm workspaces |
| Checks | TypeScript and Node integration tests using SQLite, PGlite, and HTTP |

Native builds are configured for SQLCipher. **The Expo Go preview uses a separate, unencrypted fixture cache** and must use made-up data. Native encryption and signed-build offline restart have not yet been verified.

## Run locally

### Prerequisites

- Node.js 24 and pnpm 11.19.0 (the version pinned in `package.json`).
- Expo Go compatible with SDK 57 for the phone preview.
- A phone and computer on the same trusted Wi-Fi network.

Install dependencies and run the checks from the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm check
```

### 1. Start the development API

In a PowerShell terminal, replace the example address with your computer's Wi-Fi IPv4 address:

```powershell
$env:API_HOST='192.168.1.100'
pnpm dev:fixture
```

This starts the fixture API on port 3000 and stores its local database in `.local/pglite`. Docker and messaging credentials are not needed. Without `API_HOST`, it binds to `127.0.0.1`, which a physical phone cannot reach.

### 2. Point the mobile app at the API

Create `apps/mobile/.env.local` with the same address:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

This file is ignored by Git. `EXPO_PUBLIC_` values are included in the mobile bundle: never put secrets in them. Local HTTP is only for this synthetic-data preview; deployed private traffic requires HTTPS.

### 3. Open the app

In a second terminal:

```powershell
pnpm dev:go
```

Scan the QR code with your phone. If Expo Go requires sign-in, use the same Expo account on the phone and CLI; their sign-ins are separate. Restart Metro after changing the API address.

Use a made-up identity such as `demo@example.test`. The app displays a development code; **no email or SMS is sent**, and real ownership is not verified. Create a fake farm to explore the task and guide.

For connection troubleshooting and the current device setup, see the [Expo Go runbook](docs/expo-go.md). A reachable API returns a response at `http://YOUR_COMPUTER_IP:3000/v1/health`.

### Try the offline flow

1. Keep the app open and turn off Wi-Fi and mobile data.
2. Change the task's completion state. It should save immediately and show **Waiting to sync**.
3. Reconnect to the computer's Wi-Fi and tap **Retry sync**.
4. Confirm the edit remains, the task shows **Synced**, and **Last synced** updates.

This checks an already-loaded Expo Go session. Offline cold-start behavior is a separate native-build acceptance check.

### Optional: use PostgreSQL through Docker

With Docker Desktop's Linux engine running:

```powershell
docker compose up -d db
$env:DATABASE_URL='postgresql://acrepilot:local-only@localhost:5432/acrepilot'
$env:NODE_ENV='development'
$env:DEV_FIXTURE_AUTH='true'
pnpm db:migrate
pnpm dev:api
```

The example database password is for local development only. The PostgreSQL runtime and backup/restore path still need verification; the current integration suite uses PGlite.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev:fixture` | Start the local fixture API with PGlite |
| `pnpm dev:go` | Start Metro for Expo Go over LAN |
| `pnpm dev:mobile` | Start Metro for a custom development client |
| `pnpm check` | Run type checking and integration tests |
| `pnpm openapi` | Regenerate the API contract |
| `pnpm db:migrate` | Apply migrations to the configured PostgreSQL database |
| `pnpm --filter @acrepilot/mobile export` | Export Android/iOS JavaScript bundles |
| `pnpm --filter @acrepilot/mobile exec expo install --check` | Check Expo dependency compatibility |

A bundle export is not a signed native build. CI is configured in `.github/workflows/ci.yml`; remote execution is not yet verified.

## Repository layout

```text
apps/
  mobile/       Expo app, SQLite repository, and sync client
  api/          NestJS API and database migrations
  admin/        Planned admin application (placeholder)
  worker/       Planned worker service (placeholder)
packages/
  contracts/    Shared validation and API types
  domain/       Shared domain helpers
  translations/ English and Kiswahili strings
docs/           Specification, decisions, progress, and runbooks
scripts/        Contract generation tooling
tests/          Persistence, API, and sync integration tests
```

## Scope and next steps

The original [build specification](docs/build-plan.md) is preserved, and all accepted requirements remain tracked in the [progress checklist](docs/progress.md). This first slice does not represent the full planned product.

Remaining work includes real identity verification and session lifecycle, complete navigation, protected administration, the full farm data model, reviewed agricultural content, and subsequent specification phases. Weather, markets, notifications, and other external integrations remain pending.

**External dependencies:** real SMS/email delivery needs provider credentials and qualification; agricultural advice and market/weather features need verified sources. Signed iPhone builds require Apple signing access. The current Expo Go route avoids paid enrollment. See the [provider register](docs/providers.md) and [source register](docs/source-register.md) for the outstanding requirements.

No public deployment is configured. The mobile configuration is linked to the maintainer's Expo project; forks should use their own EAS project before submitting cloud builds.

## Project documentation

| Document | Contents |
| --- | --- |
| [Progress](docs/progress.md) | Accepted requirements and implementation checklist |
| [Validation](docs/validation.md) | Test evidence and remaining acceptance gates |
| [Account sessions](docs/auth-sessions.md) | Password/session behavior and remaining identity gates |
| [Architecture](docs/architecture.md) | Design decisions and boundaries |
| [Sync protocol](docs/sync-protocol.md) | Outbox, retries, conflicts, and isolation |
| [Data dictionary](docs/data-dictionary.md) | Current records and planned model |
| [OpenAPI](docs/openapi.json) | API endpoints and payloads |
| [Device testing](docs/device-test.md) | Native-build validation runbook |
| [Operations](docs/operations.md) | Operational setup and limitations |
| [Screen states](docs/screen-states.md) | UI behavior and recovery states |

