# AcrePilot

## Product and engineering build plan

**Prepared for Aaron Museo | 30 September 2026 | Version 1.0**

**Purpose:** Give a developer a complete, readable plan for building AcrePilot from the decisions made during product discovery.

AcrePilot helps new and experienced commercial farmers understand crops and varieties, plan around their land and resources, manage farm activities, and assess costs, harvests and selling opportunities.

**Launch direction:** Kenya; small and medium farms; one owner per account; Android release priority with iOS supported; English and Kiswahili; open registration with a small, low-promotion launch; free initial access.

**Confirmed technology:** React Native, Expo and TypeScript for mobile; NestJS and TypeScript for the backend. No AI dependency in the initial product.

This document distinguishes **confirmed requirements**, **engineering defaults**, and **dependencies requiring verification**. Defaults make implementation concrete without another long questionnaire. They may change following technical evidence; confirmed product decisions should not be silently removed.

**Release rule:** Phases are the order of construction, not permission to drop accepted features. Internal builds can be incomplete. The public release gate covers the full agreed core, including honest unavailable-data states for external information.

## 1. Product boundaries and success

### Who it serves

- New commercial farmers who need help choosing crops, preparing resources and planning their first season.
- Experienced commercial farmers who want useful references, records, reminders, cost comparisons and market information.
- Small and medium farms, including owned and leased land; an owner can manage multiple farms and plots.

Household gardening is outside the initial positioning. Large farms with multiple managers and workers, livestock and expansion beyond Kenya belong to later releases.

### What success looks like

A farmer can set up a farm with limited information, explore crops and varieties, create an adjustable plan, work offline, record outcomes and understand the limits of any advice. Financial tracking remains optional.

Measure onboarding completion, first farm created, first planting activated, task completion, successful offline sync, repeat use, guide downloads, alert usefulness and record completeness. A completed season takes longer to observe than early engagement; do not claim improved farm income from short-term app usage alone.

### Product principles

1. Unknown information is acceptable. Ask for more only where it improves a specific result.
2. Explain suggestions using recorded facts, missing inputs and dated sources.
3. Separate observed data, farmer estimates, calculations and future projections.
4. Preserve farm history through land sales, plot changes, catalogue updates and disabled features.
5. Keep core daily work usable without connectivity.
6. Support both languages throughout real workflows, not just navigation labels.
7. Start with a reliable catalogue of 20 crops rather than unsupported breadth.

## 2. Scope register

The identifiers below connect requirements to the delivery phases and acceptance checks.

| ID | Accepted capability | Delivery phase |
|---|---|---|
| R01 | Phone/email accounts, passwords and codes, linking, persistent sessions | P1 |
| R02 | English/Kiswahili, units, settings and basic mobile navigation | P1 onward |
| R03 | Multiple farms/plots, partial profiles, map pins and farm resources | P2 |
| R04 | Owned/leased land, sold land, expansion, split/merge and history | P2 |
| R05 | 20 crop cards, varieties, comparison, guides and custom varieties | P3 |
| R06 | Content administration, sources, translations and publication workflow | P3 |
| R07 | Crop suitability and suggested planting windows | P4, P6 |
| R08 | Existing crops, intercropping, perennial plantings and multiple harvests | P4, P5 |
| R09 | Editable tasks, readiness checklist, in-app/local reminders | P4 |
| R10 | Seed, rotation and machinery planning tools | P4 |
| R11 | Optional budgets, expenses, shared costs, sales, break-even and dashboard | P5 |
| R12 | Weather, seasonal context and configurable weather alerts | P6 |
| R13 | Market/grade prices, broker guidance, seasonal estimates and offers | P7 |
| R14 | Price history, following markets, change/target alerts | P7 |
| R15 | Offline records, guide downloads, conflict handling and automatic sync | P1 onward |
| R16 | Privacy, accessibility, backups, testing and release operations | All phases |

### Explicitly deferred

Farmer blog/community with experiences, photos, questions, comments, crop/variety/region tags, reporting and moderation; a personal photo journal; inventory and low-stock alerts; staggered planting; detailed storage and stock movement; worker collaboration; PDF/spreadsheet business reports; buyer connections and a marketplace; farmer web portal; large-farm workflows; livestock; AI assistant, photo diagnosis and learned prediction models; East African expansion; paid subscriptions and SMS activity reminders.

Basic harvest and sales records, season comparisons inside the app, and minimal harvest losses remain in scope. Detailed warehouse balances and downloadable business reports are later. Privacy-related account data access/deletion is separate from deferred business reporting.

## 3. Accounts, settings and privacy

### Registration and sign-in

- Register with either a Kenyan phone number or email; verify the chosen channel.
- Support password sign-in and one-time sign-in codes for both channels. SMS sends phone codes; email sends email codes.
- Let a signed-in user set/change a password and link the other verified channel to the existing account.
- Do not auto-merge accounts merely because someone supplies a matching number/email. Linking requires current account reauthentication and ownership verification; handle an already-linked identifier explicitly.
- Keep users signed in across restarts. Use rotating revocable sessions; password reset and suspected compromise can revoke sessions.
- Initial registration, new-device sign-in, password reset and linking require internet. Previously unlocked local records remain usable offline under the local-session policy.
- Default recovery uses a verified linked channel. If all channels are lost, provide a support route without promising recovery without adequate proof.

### Settings

Language; acres/hectares/square metres; financial tracking switch; notification categories; quiet hours; price thresholds; followed markets/crops; download controls; sync status; account security; privacy and account deletion.

Switching off financial tracking hides financial entry points and dashboards while preserving existing data. Price browsing remains available. A manual expected price or simple stand-alone scenario can be used without requiring a complete financial history.

### Security defaults

Use modern password hashing, short-lived access tokens, rotating hashed refresh tokens, OTP expiry, single-use codes, resend cooldowns and abuse limits. Store credentials/tokens in appropriate secure storage, never ordinary app preferences or logs. Use TLS, server-side ownership checks, input validation and a separate protected admin session.

Farmer records are private by default. Admin catalogue permissions do not automatically expose farm finances or coordinates. Exceptional support access must be time-limited, justified and audited. No public location sharing or background location tracking is needed.

For the phone cache, evaluate encrypted SQLite in the development-build spike and keep encryption keys in secure storage. Isolate records by account and prevent another login from seeing prior data. Explain unsynced changes before sign-out or local-data removal; never silently discard them.

## 4. Farms, plots, resources and land changes

### Setup and progressive detail

Initial setup asks for farm name, map pin and total area. Create a default plot if useful, then let the farmer subdivide it. Offline users may save an incomplete farm without a new map pin and add the pin online later; location-dependent advice stays limited meanwhile.

| Category | Fields and behaviour |
|---|---|
| Land | Name, area, preferred display unit, location, slope, drainage, road access, active status |
| Soil | Sandy/clay/silty/loam/other/unknown, optional texture notes, fertility observations, soil-test date and values including pH |
| Water | Multiple sources: rainfall, harvested rainwater, borehole, river, piped water, other; reliability and seasonal shortages |
| Storage/irrigation | Optional litres or cubic metres, irrigation method, pumping costs, irrigated plots and coverage |
| Machinery | Owned/hired/shared access, equipment, attachments, availability, transport, hire and operating costs |
| Labour/budget | Available labour, optional rates and capacity, optional planting budget |
| Infrastructure | Electricity, greenhouses, fencing, storage and access constraints |
| History | Previous crops and varieties, where known; date precision recorded |
| Tenure | Owned/leased, lease dates and optional cost/frequency |

Farm-wide resources can apply to several plots, while soil, water coverage and physical conditions can differ by plot. Copying conditions from a nearby plot is an explicit farmer action; copied values remain editable and marked as copied/self-reported. Proximity alone does not establish the same conditions.

### Changing land

- Sold/inactive land leaves active totals, recommendations and future task generation. Preserve its historical records and effective date. Partial sales reduce the remaining active holding.
- Expansion creates a dated area revision. Splits and merges retain parent/child lineage and original historical planting areas.
- A split must account for the parent's area; a merge must not duplicate its sources. Do not add both retired parents and active children to current totals.
- Let users link or close ongoing plantings when land changes. Pending tasks are cancelled or reassigned visibly, not erased from history.
- Leasing supports end-date reminders and a warning when the expected harvest extends beyond the lease; the farmer may proceed with an acknowledgement.
- Moving land to another farmer's AcrePilot account is not an ownership-transfer feature in this release.

Land and planting areas use square metres internally, with acres default for display and hectares also available. A map pin is a location reference, not a surveyed boundary or proof of ownership.

## 5. Crop catalogue, varieties and content

### Initial catalogue

Confirmed mix: **5 grains, 10 vegetables and 5 fruits**. The following is a proposed editorial shortlist, not a final agronomic recommendation. Verify useful Kenyan coverage and sources before locking each crop.

| Group | Proposed initial crops |
|---|---|
| Grains: 5 | Maize, rice, wheat, sorghum, finger millet |
| Vegetables: 10 | Tomato, bulb onion, cabbage, kale/sukuma wiki, spinach, carrot, capsicum, cucumber, Irish potato, French bean |
| Fruits: 5 | Banana, avocado, mango, orange, passion fruit |

These are product catalogue groupings. Variety counts are driven by reliable information; do not invent an equal number per crop.

### Browse and compare

Crop cards show photo, name, short description, conditions, indicative water needs and harvest timing. Provide search and filters for category, conditions, time to harvest and experience suitability where editorially justified. Region suitability is contextual guidance, not a guarantee.

Crop profiles cover preparation, planting, spacing, nutrition, irrigation, weeds, pests/disease symptoms and prevention, harvest readiness, storage basics and costs/yield assumptions. Variety pages add images where licensed, maturity basis, growth habit/support, documented resistance, seed type, suitable uses and conditional yield ranges.

Compare two or three varieties on a mobile screen. Show missing values as unknown. Resistance is not immunity. Maturity must state whether timing starts from sowing, transplanting or establishment.

An unlisted variety can be entered as an owner-scoped name. Apply reviewed crop-level guidance, clearly labelled. Admins may review suggestions for later publication without automatically turning farmer text into trusted catalogue data. Reconciliation retains the original name and history.

### Content operations

Use draft, in-review, published, withdrawn and archived states, with English/Kiswahili versions, citations, applicable locations, author/reviewer, review date and version. You manage content initially; leave reviewer assignment open until someone is available. Never label material as expert-reviewed when it was only checked by the founder.

Prioritise documented agricultural institutions, extension material, variety registries and breeder documentation. Maintain image rights and source permissions. Crop numbers, dosages and disease claims require traceable evidence; omit unsupported precise treatment instructions.

Downloads are versioned packages. Active crops receive automatic guide downloads with visible size/status, resumable transfers and a mobile-data control. Other guides are manual downloads. Retain existing usable guides until replacement completes; urgent corrections display when the device next reconnects.

## 6. Planting records and daily work

### Two ways to choose

Farmers can browse directly or use Help me choose. The latter ranks several candidates by growing suitability first, then exposes costs and price context for comparison. Missing soil or water details reduce completeness and trigger useful prompts rather than blocking all results.

Starting a planting begins with a suggested planting window when evidence supports one. Display reasons, forecast date, assumptions and uncertainty; allow a custom date. When evidence is insufficient, offer a clearly labelled seasonal reference or manual date instead of a fabricated window.

### Planting structure

A planting belongs to a plot and records crop, variety/custom variety, occupied area, method, exact/approximate/unknown planting date, timing basis, status and estimate snapshots. Support planned, active, completed, abandoned and archived states.

Existing crops can be added with approximate dates or an observed growth stage. Unknown dates must not create falsely exact harvest forecasts or overdue tasks. Ask the farmer to confirm stage-dependent suggestions.

Intercropping uses a shared planting group and common area rather than counting the full plot once per crop. Record row ratios or per-crop allocation only when known. Seed and cost estimates use the actual arrangement; do not automatically apply full monocrop requirements to every component.

Perennial plantings persist across years. Attach dated production/harvest periods for reporting, while preserving establishment date, tree/plant count when relevant and long-term costs. First harvest timing differs from a recurring bearing period.

### Tasks and readiness

Generate versioned task suggestions from crop, variety, planting method, dates and known resources. Allow edit, skip, complete, reschedule and custom tasks/notes. Replanning previews changes and preserves completed tasks and user edits. Generation must be idempotent.

The readiness checklist covers land preparation, planting material, water, labour, equipment and budget when enabled. Use ready/not ready/unknown/not applicable and let the farmer proceed despite warnings.

Use an in-app inbox and local phone reminders for downloaded tasks. Schedule server push messages for fresh weather/price events. Respect language, permissions and quiet hours; denied push permission must not block app use. Edits/completion remove obsolete scheduled reminders and avoid duplicate local/server messages.

## 7. Rules and planning calculators

### Rules engine design

Implement deterministic, versioned TypeScript functions shared between mobile and backend where practical. Each result includes inputs, units, missing fields, rule version, applicable source/content version and an explanation. Persist the estimate used for a plan rather than silently replacing it when rules change.

Suitability should distinguish supported fit, known concern and insufficient information. A high score with incomplete inputs must not appear more reliable than a fully assessed result. Hard exclusions require reviewed evidence; price cannot override a serious growing-condition mismatch.

### Seed and planting-material calculator

For simple row planting: usable area / (row spacing x in-row spacing) gives approximate planting positions. Use metres consistently and exclude paths/non-planted space. A reviewed germination/establishment adjustment may estimate required seed, but do not apply it automatically where nursery practices differ.

Use seeds per position or an evidenced seed-rate method as appropriate. Never convert seed counts to kilograms without seed-weight data. Tubers, seedlings, cuttings and fruit trees require planting-material counts or crop-specific rates. Intercropping requires arrangement inputs or a clearly limited manual estimate.

### Rotation planner

Use plot history, crop family, dates, current perennial occupation and documented restrictions to suggest alternatives with reasons. Unknown history stays unknown. Intercropped families all contribute to history. Rotation suggestions do not guarantee disease elimination or improved yield.

### Machinery comparison

Compare equivalent work and area across owned, hired/shared machinery and manual labour. Inputs include terrain/access suitability, implement, availability, preparation deadline, productive rate and costs. Separate owned-equipment cash operating cost from optional allocated ownership cost.

Hired cost includes quoted area/hour/day rate, minimum charge, transport and any excluded fuel/operator cost. Manual cost includes workers, days/hours and rates. Show estimated total, completion time, assumptions and constraints. Recommend only among feasible options; allow missing rates and manual overrides.

### Water guidance

Use reviewed crop/stage needs, rainfall, irrigation method and known soil/water details. A borehole does not imply unlimited supply. Without inputs for a defensible volume calculation, provide qualitative guidance and request measurements. Every numerical irrigation estimate needs units, assumptions and an evidenced method.

## 8. Weather and planting windows

The app consumes forecasts from an external service; it does not build its own meteorological model. Weather is tied to the farm pin and represented with issue time, validity period, provider and local timezone.

Show rainfall probability and amount where supported, temperatures, wind and relevant warnings. Distinguish a forecast, a seasonal outlook and historical climate. Do not extend a short forecast across an entire season or equate forecast rainfall with measured soil moisture.

### Planting-window workflow

1. Retrieve valid local weather and the reviewed crop/variety planting requirements.
2. Combine known rain-fed/irrigated status, current preparation and plot constraints.
3. Offer a date range with reasons and missing information.
4. Keep the farmer's chosen date. New data can prompt a suggested change; it does not move a plan automatically.

Rain-fed guidance emphasises rain timing and dry-spell risk; irrigated guidance considers water reliability, method and costs. Long-term perennial establishment advice must use suitable seasonal context rather than invent multi-year weather predictions.

### Alerts and failure states

Weather alerts apply to active farms with configurable controls/quiet hours. Distinguish official warnings from app-generated threshold advisories. Deduplicate by event/location/time and stop future alerts for sold land.

Cached weather remains readable offline with last-updated and valid-until labels. Expired data cannot silently power a current planting recommendation. On outage, display the last usable information, its age and an unavailable-current-guidance state.

### Provider decision

Evaluate Open-Meteo or another suitable provider for Kenyan coverage, useful variables, commercial terms, quotas, forecast horizon, attribution and outage behaviour. Open-Meteo publishes forecast documentation and usage terms [S6-S7]; this is a candidate, not a purchased or approved integration. Evaluate Kenya Meteorological Department material separately for official seasonal context and permitted reuse.

Backend adapters, caching, request coalescing and scheduled refreshes avoid a weather call per screen opening. Cache by an appropriate location grid without exposing one farmer's precise location to another.

## 9. Prices, grades and broker offers

### What farmers see

Choose an intended market/town, with nearby options suggested. Follow crops and markets. Show current price ranges, history and date-filtered context in KES/kg, with other supported unit displays. Show grade-specific prices and the criteria for each grade without requiring the farmer to fill in a grade first.

Grade definitions depend on commodity and market standard; never invent universal Grade A/B criteria. If grade-specific prices are unavailable, still display evidenced grade definitions and an explicit price gap.

Store sales location and buyer/channel separately: a broker may buy at the farm gate. Farm-gate, wholesale and broker series must not be presented as mutually exclusive or directly comparable without matching scope.

### Evidence rules

Each observation carries crop/variety when known, market, grade, channel/buyer type, unit and unit weight, observation date, source, freshness and quality status. Store a retail quote as retail even though retail selling guidance is not a core channel.

KAMIS is a candidate because its public market listings show wholesale/retail, market, date and other classification fields [S8]. This does not establish an available API, reuse rights, comprehensive grade coverage or broker/farm-gate data. Verify access and licensing before automated ingestion. Support reviewed admin CSV import as an ingestion path when permitted.

Broker ranges require relevant broker evidence. Never infer them by subtracting a universal percentage from wholesale prices. A farmer's private offer is not automatically published or pooled.

### Harvest-date and seasonal estimates

Use non-AI statistical summaries from sufficiently comparable historical data. A proposed baseline is a median with an empirical range for comparable periods, plus recent context. Choose sample-size and recency requirements during the data audit; validate on held-out historical periods before enabling projections.

Show the target period, method, sample coverage and uncertainty. Historical seasonal ranges are not guaranteed future selling prices. Sparse, stale or mismatched data produces Price estimate unavailable. A farmer may supply an expected price; label it as their assumption.

### Actual broker offers

Provide an optional Compare an offer action for farmers who have been approached. Record offer amount/unit, quantity, date, market context and optional grade. Compare only with compatible evidence and recorded break-even values. Do not turn this into buyer matching or negotiation automation.

A selling-cost switch includes transport, packaging, commission and other deductions. Saved inputs remain when switched off. Display gross proceeds or estimated net proceeds according to the switch, and prevent costs already recorded against the sale from being deducted twice.

## 10. Price tracking and alerts

Farmers follow selected crop/market combinations and receive significant-change alerts, rather than a mandatory weekly digest. Optional filters include channel and grade. A target-price alert notifies when a comparable price reaches the farmer's configured threshold.

### Alert rules

- Significant change uses a configurable percentage and a documented baseline. Suggested initial engineering default: compare the latest valid representative price with the previous comparable observation; calibrate the default percentage from actual update frequency and volatility before launch.
- Match crop, market, unit, channel and grade. Do not compare a retail series against wholesale, mix differently weighted bags, or treat missing values as zero.
- Reject or flag outliers and validate suspicious jumps before triggering alerts.
- Include both observation dates. A month-old baseline cannot be described as a daily price change.
- Target-price alerts use threshold crossing/rearming to avoid repeated notifications while prices remain above a target. Offer one-time or repeat behaviour with a sensible one-time default.
- Deduplicate by alert subscription and observation/event ID; apply cooldowns and quiet hours. Show the triggering evidence in the app.

The background worker evaluates newly accepted observations, not every screen refresh. It records attempted/delivered/failed pushes without claiming a device displayed a notification. A missed push still appears in the in-app inbox after sync.

### Honest price history

Show dates and gaps on the chart. Keep source series distinguishable; do not join sparse values into an apparent continuous measured history. Exclude unavailable/invalid observations from aggregates, and store corrections with an audit trail. Cached price data remains available offline with its age.

Publish a coverage page inside the price feature: markets, crops, channels and grades currently covered. Broad access to the app does not mean every crop has a usable market series.

## 11. Financial records, harvests and calculations

### Records

Financial tracking is optional. A planting can have an optional budget, estimated costs and actual expenses. Categories include planting material, fertiliser, labour, water, machinery, lease, transport and other costs. Record dates, amount, notes, currency and allocation basis.

Split shared expenses by area as a default with editable allocations. For an intercrop sharing the same land, request crop shares or another allocation basis; counting the common area twice would distort the split. Allocations must sum exactly to the source expense, with controlled rounding. Historical allocations retain the areas used at the time.

Support multiple harvests per planting, dates, quantity, unit, basic losses/rejections and partial sales. A sale may allocate quantities from several harvests of the same product. Warn about quantities exceeding recorded harvest; allow an explicit unrecorded-harvest adjustment instead of silently manufacturing stock.

No paid/partial/pending status, receivables ledger or debt collection workflow in this version. Sale value is revenue recorded, not proof of cash received. Full storage, warehouse stock and home-consumption records are deferred.

### Units and arithmetic

Use kilograms/tonnes and litres/cubic metres where relevant. Bags/crates require a specified net kg per container for each relevant entry or saved preset. Never assume all bags/crates weigh the same. Keep original quantity, unit, conversion factor and normalised amount for auditability.

Use decimal arithmetic for money and quantities, with KES as the initial currency. Store original precision and round display values predictably. Avoid binary floating-point money totals.

### Clearly labelled calculations

| Result | Calculation and limitation |
|---|---|
| Recorded result | Recorded sales value minus allocated actual expenses; flag missing records and unsold produce |
| Expected gross revenue | Expected saleable kg x assumed KES/kg; show yield/price assumptions |
| Simple break-even price | Included total cost / expected saleable kg; undefined for zero/unknown quantity |
| Fixed-volume break-even quantity | Fixed scenario total cost / assumed positive unit price; costs assumed unchanged over the scenario |
| Contribution break-even quantity | Fixed costs / (price per kg minus variable cost per kg), when a valid cost breakdown exists |
| Net offer proceeds | Gross offer value minus included selling costs; deductions switch and inclusion list visible |

If price does not exceed variable cost, report no positive break-even quantity under those assumptions. Do not use whole-farm costs as crop-specific costs without allocation. For perennial reporting, show lifetime totals and period totals separately; define establishment-cost allocation explicitly before showing per-season profit.

Dashboards show active crops, tasks, harvest windows, recorded finances and season/variety comparisons. Normalise yield comparisons by known area and equivalent period; do not rank unlike crops or mixed plantings as if directly comparable.

## 12. Offline behaviour and synchronisation

Offline functionality is a foundation, not a final add-on. Expo SQLite persists local data across restarts [S1]. Persisting data alone does not provide server synchronisation.

| Operation | Offline behaviour |
|---|---|
| Guides and crop comparison | Available for downloaded content |
| Farms/plots/land changes | Create/edit local records; defer map completion when unavailable |
| Plantings/tasks/checklists | Create/edit/complete using downloaded rules/templates |
| Expenses/harvests/sales/offers | Save locally with pending-sync state |
| Calculators | Work with known local inputs and downloaded rule versions |
| Weather/prices | Read cache with dates; no claim of fresh data |
| Sign-up/recovery/linking | Requires internet |
| New map tiles/uncached guides | Requires internet; existing records remain accessible |

### Sync protocol

1. Every write commits the local record and an outbox operation atomically. Use client-generated UUIDs, account/device IDs, operation ID and base record version.
2. On foreground connectivity, push bounded batches ordered by dependencies. Connectivity status alone is not proof the API is reachable.
3. Server validates ownership, schema, relationships and version, applies each mutation transactionally and stores an idempotent acknowledgement. Retrying a harvest/sale must not create another record.
4. Pull server changes with a monotonic cursor, including archived/deleted tombstones. Advance the cursor only after the local transaction succeeds.
5. Merge acknowledgements with local pending changes without overwriting newer edits. Keep operation-specific failures visible and retry transient failures with backoff.
6. Resume on app opening/foreground and reconnection; provide manual Retry. Background work is best-effort because the operating system schedules it [S2]. Do not promise immediate syncing while an app is force-closed.

### Conflicts and data preservation

Automatically merge independent fields where safe. Conflicting edits to money, quantities, area, lease terms or planting dates require an explicit resolution with both values retained. Append distinct records rather than overwriting unrelated entries. Land split/merge commands are atomic and conflict-checked as a unit.

Sold/archived records are tombstoned, not lost. A stale offline client cannot silently reactivate sold land. If server authorisation has been revoked, reject uploading while preserving a visible local recovery state; a disconnected device cannot receive immediate revocation instructions.

Provide Saved on phone, Waiting to sync, Synced, Needs attention and Last synced statuses in plain language. Securely isolate account data; test sign-out with pending records. Reinstalling or losing the phone can lose unsynced data, so the app must never label locally saved data as backed up.

## 13. Mobile experience and screen map

### Navigation default

Use five primary tabs: **Home, My Farm, Explore, Markets, More**. Keep a persistent farm selector where context matters. Tasks are prominent on Home and planting pages; finance tools live under the farm and More when enabled.

| Area | Screens |
|---|---|
| Welcome/account | Language choice, registration, verification, password/code sign-in, recovery, link channel |
| Setup | Farm name/size, pin map, default plot, optional progressive profile |
| Home | Today's work, alerts, active plantings, weather preview, sync badge and quick actions |
| My Farm | Farm list, farm detail, resources, plot list/detail, conditions, tenure, land-change workflow |
| Explore | Crop cards, filters, crop guide, varieties, comparison, Help me choose, downloaded guides |
| Planting | Suggested window, crop/variety choice, intercrop setup, dates/area, budget, checklist, plan review |
| Daily work | Task detail/editor, activity notes, harvest entry, sale entry and optional expense entry |
| Tools | Seed/material, rotation, machinery, break-even and optional offer comparison |
| Markets | Market selection, crop prices, grades/criteria, history, harvest-period estimate, follows and alerts |
| More | Settings, download manager, sync issues, account/security, privacy, feedback/support |

### UX rules

Use plain labels, clear units, large touch targets and readable contrast outdoors. Support screen readers, increased text size and smaller/affordable Android phones. Never rely on colour alone for readiness, warning or sync status. Keep charts paired with a text summary and figures.

Every feature needs loading, empty, offline, stale-data, error and permission-denied states. Forms preserve drafts. Important edits display their effect; archive/sale actions explain what moves out of current totals. Keep optional fields visibly optional.

English and Kiswahili cover validation, notifications, help, crop content and empty states. Keep canonical IDs independent of translation. Validate agricultural terminology with competent language/content review. If a translation is missing, disclose the fallback rather than silently mixing languages.

## 14. Technical architecture

### Engineering defaults

| Layer | Default and purpose |
|---|---|
| Mobile | React Native + Expo + TypeScript; Expo Router for navigation |
| Local persistence | Expo SQLite, local repository layer, migrations and durable outbox |
| Backend | NestJS modular monolith, REST /v1 API and OpenAPI contract |
| Server database | PostgreSQL; Prisma as the default ORM, subject to migration/transaction spike |
| Admin web | React + TypeScript + Vite; protected browser application |
| Background work | NestJS worker with BullMQ/Redis for ingestion, alerts and retries |
| Media | S3-compatible object storage and CDN for licensed crop images/content packages |
| Authentication | NestJS account/session service with SMS/email adapters |
| Monitoring | Structured logs, error reporting, metrics and health checks |
| Build/deploy | pnpm workspace, CI, Docker backend and Expo EAS development/release builds |

NestJS supports a modular TypeScript backend [S4], and documents BullMQ queue integration [S5]. The exact services/vendors, package versions and hosting region are engineering choices to verify in P0. Pin compatible stable versions in the lockfile; do not hard-code a version from a planning document months later.

Start with one backend codebase and a worker process, not microservices. PostgreSQL stores accepted server state; SQLite drives local mobile reads and writes. The admin talks to the same backend but cannot directly modify a farmer's SQLite cache.

Separate public catalogue access from private farmer data. Server adapters protect weather/SMS/market credentials. A future farmer web interface can reuse APIs and domain contracts, but mobile layouts and SQLite behaviour should not be assumed to transfer unchanged to the browser.

### Workspace layout

- apps/mobile: screens, local repositories, sync engine and notifications.
- apps/api: NestJS modules, REST contracts, authentication and persistence.
- apps/worker: ingestion and notification job entry point, sharing backend modules.
- apps/admin: content, rules and operations dashboard.
- packages/domain: pure calculations, units, rules and shared types without server dependencies.
- packages/contracts: generated API types and validation contracts.
- packages/translations: interface language resources; catalogue translations remain versioned content.
- docs: build plan, architecture decisions, data dictionary, source register and release runbooks.

Keep business rules out of individual screens. Use a local repository as the mobile source of truth rather than mixing direct API writes with queued offline writes.

## 15. Data model and API boundaries

### Core records

| Domain | Entities and relationships |
|---|---|
| Identity | User, VerifiedIdentity, PasswordCredential, Session, Device, Preferences |
| Land | Farm owned by User; Plot belongs to Farm; PlotRevision and PlotLineage preserve changes |
| Conditions | FarmResource, PlotConditionSnapshot, WaterSource, IrrigationCoverage, EquipmentAccess, Tenure |
| Catalogue | Crop, Variety, UserVariety, GuideVersion, Translation, Source, MediaAsset, RuleVersion |
| Production | PlantingGroup, Planting, ProductionPeriod, AreaAllocation, Task, ChecklistItem |
| Finance | Budget, Expense, ExpenseAllocation, Harvest, Sale, SaleHarvestAllocation, OfferScenario |
| External data | WeatherSnapshot, WeatherAlert, Market, GradeDefinition, PriceObservation, PriceEstimate |
| Messaging | Follow, AlertSubscription, Notification, DeliveryAttempt |
| Reliability | SyncOperation, ChangeLog, Conflict, AuditEvent, SupportAccessGrant |

Most private entities carry owner/account ID, UUID, timestamps, version and archive/delete state. Composite ownership constraints and service checks prevent cross-owner links. UTC timestamps serve sync; farming dates are local calendar dates with Africa/Nairobi defaults.

Plantings refer to the relevant plot revision/area snapshot. Perennials contain multiple production periods. Intercrop groups separate common occupied area from per-crop allocation. Expense allocations preserve their original basis. Grades and price observations belong to explicit standards/source contexts.

### API groups

- /v1/auth, /identities, /sessions: registration, codes, passwords, linking and revocation.
- /v1/farms, /plots, /land-events, /resources: owned land and condition management.
- /v1/catalog, /guides, /varieties, /content-manifests: published content and downloads.
- /v1/plantings, /tasks, /checklists, /calculations: plans, activity and reproducible results.
- /v1/expenses, /harvests, /sales, /offers: private records and allocations.
- /v1/weather, /markets, /prices, /alerts: external evidence and subscriptions.
- /v1/sync/push, /sync/pull: idempotent mutations and incremental changes.
- /v1/admin: content/rule publication, imports, coverage, quality and operations.

All list endpoints use pagination and explicit ownership/visibility. Mutations use version checks and idempotency where repeatable delivery is possible. Return stable error codes with translated mobile messages. File uploads validate type/size and store source/licence metadata for published images.

The schema above is a logical model. P0/P1 turn it into migrations, indexes and API schemas; the planning document is not a finished database implementation.

## 16. Admin operations and external dependencies

### Admin dashboard

Manage crop/variety records, English/Kiswahili guides, images, citations, grade definitions, task templates, calculation rules, custom-variety suggestions and publications. Provide preview, validation, version history and rollback/withdrawal.

Operations views cover market imports, rejected observations, weather-provider health, price coverage, stale datasets, SMS/email spend, failed jobs and sync errors. Hide private financial values and precise coordinates from general operational logs.

### Dependency register

| Dependency | Required validation | Fallback |
|---|---|---|
| Agronomy/varieties | Evidence, regional applicability, reuse rights, translation and review | Publish narrower sourced guidance; omit unsupported details |
| Market data | Access, permission, history, update frequency, units, grades, channels | Reviewed permitted imports; show explicit gaps |
| Broker/farm-gate data | Relevant observations separate from wholesale | Unavailable range; farmer's own private offer scenario |
| Weather | Kenya coverage, variables, horizon, terms, quotas, availability | Cached dated data and no current recommendation |
| Maps | Pin support on both platforms, keys, terms, tile costs | Save local draft; add location later |
| SMS/email | Kenyan delivery, sender setup, recovery, cost and abuse controls | Alternate linked channel; transparent retry state |
| Push | Device registration, credentials, receipts, quiet-hour handling | In-app inbox/local downloaded reminders |
| Content review | Named editorial ownership and competence | Honest source-reviewed status; specialist checks for consequential guidance |

No supplier is assumed to be free merely because AcrePilot initially charges farmers nothing. Budget for infrastructure, data licences, verification traffic, developer accounts, domain, backups, monitoring and content/translation work.

Estimate monthly costs from actual quotes: fixed hosting plus storage/egress, active devices, OTP attempts, weather/map usage and licensed feeds. Add alerts and spending limits. Research prices when vendors are selected instead of freezing unverified cost figures here.

## 17. Delivery sequence and exit gates

Use milestone gates rather than promising a calendar date before the data/provider work is known. Each phase ends with a demonstrable mobile build, relevant admin/API capability, tested migrations and updated documentation.

| Phase | Work and deliverable | Exit gate |
|---|---|---|
| P0: Decisions and feasibility | Validate providers/content sources; wireframes; data contracts; iOS/Android build; SQLite/encryption and sync spike | One offline-created record syncs once; physical-device build works; source/coverage risks documented |
| P1: Foundation | Workspace/CI, bilingual shell, account flows, sessions, local DB/outbox, API/DB and secure admin shell | Verified phone/email flows, persistent local access, account isolation and retry-safe sync |
| P2: Farm model | Farms/plots, optional conditions/resources, map, owned/leased land, revisions, split/merge/sale | Offline edits sync correctly; historical areas and active totals remain correct |
| P3: Catalogue/admin | 20-crop catalogue, sourced varieties, comparison, translations, custom entries and downloads | Content checklist passes; active-crop packages work offline; publishing is audited |
| P4: Planning | Direct/assisted selection, seasonal/perennial/intercrop records, suggested tasks/checklist, seed/rotation/machinery rules | Plans preserve edits; unknown inputs stay explicit; calculator fixtures pass |
| P5: Outcomes | Optional finance, budgets, shared costs, harvests, sales, break-even, history/dashboard | Repeated/partial harvest-sale flows reconcile; offline retry cannot duplicate money/quantity |
| P6: Weather | Provider adapter, cache, planting-window integration, advisories, controls | Stale/outage cases work; app and official alerts distinguished; no silent rescheduling |
| P7: Markets | Ingestion/quality, grade display, price history, broker offers, seasonal evidence, follows and alerts | Comparable-series checks pass; gaps visible; threshold alerts deduplicate |
| P8: Release hardening | Device/translation/accessibility/performance tests, privacy flows, restore drill, store submissions | Release checklist passes; Android opens registration; iOS build remains maintained/tested |

### Working order inside a phase

Write the acceptance scenario; define schema/API changes; implement the domain logic; wire local persistence and sync; implement mobile/admin UI; exercise failure states; run focused checks; document what is complete. Build vertical workflows rather than all database tables followed months later by screens.

### First implementation slice

Start with language choice, a verified account, one farm/plot, a test crop guide and one task. Put the phone offline, change the task, restart it, reconnect and verify one accepted server update. Use explicitly labelled development fixtures; expand to the reviewed catalogue in P3. This proves the architecture before adding financial records and complex land changes.

## 18. Testing, device builds and launch

### Essential acceptance scenarios

| Scenario | Required result |
|---|---|
| Minimal profile | Unknown soil/water remains usable; relevant limits and prompts appear |
| Existing/perennial/intercrop | Approximate timing is respected; shared area is not duplicated; recurring harvests work |
| Network failure after server commit | Retry returns the same acknowledgement; no duplicate sale/expense/harvest |
| Two devices edit a cost | Conflict is visible; neither value is silently lost |
| Land sold or split offline | Active totals reconcile; historical records retain old areas; stale clients cannot reactivate silently |
| Finance disabled | Existing data survives; optional finance UI hides; core plans still work |
| Bag/crate conversion | Missing weight blocks kg comparison; saved weight is reproducible |
| Forecast/price outage | Cached timestamp is shown; invalid fresh advice/alerts are suppressed |
| Price grade/channel mismatch | Comparison is refused or explicitly limited; no false threshold alert |
| Bilingual large-text use | Complete core journeys in both languages without clipped controls |
| Owner A requests owner B data | API rejects read/write regardless of guessed IDs |
| Backup restore | Restored DB/media and migrations produce usable records; procedure documented |

Unit tests cover formulas, rules, units and rounding; integration tests cover database ownership, auth, outbox and worker idempotency; device end-to-end tests cover core workflows offline and online. Test realistic data volumes, not just empty screens.

### Device strategy

Keep Android and iOS builds healthy from P0. Test on the user's iPhone 13 Pro and at least one affordable physical Android device, plus emulator/simulator coverage where available. Test app restart, airplane mode, slow connectivity, battery restrictions, full storage, denied permissions and interrupted downloads.

Expo EAS supports cloud iOS builds from other operating systems; a Mac is not required to begin physical-iPhone testing through that route. Signed EAS development builds for an iPhone require an Apple Developer account and appropriate device setup [S3]. A Mac is useful later for local Xcode/simulator work. Expo Go can support early exploration but does not replace a production-like development build.

Background execution is not guaranteed [S2]. Test resumption on foreground as part of the promise to sync after connectivity returns. Verify push and background behaviour on real signed builds.

### Proposed quality targets

On the selected affordable test phone: cached Home usable within roughly 3 seconds of cold start, local saves visibly acknowledged within 500 ms under typical load, and common screens remaining responsive with several seasons of data. Calibrate these targets in P0. The hard gate is no known silent data loss, duplicate financial records or cross-account disclosure.

### Launch checklist

Confirm all R01-R16 acceptance gates; reviewed 20-crop bilingual content; functioning recovery and code delivery; provider licences/coverage; working price unavailable states; backup/restore and rollback; support contact; privacy notice and deletion workflow; app-store forms and actual permission descriptions; notification controls; production monitoring; cost alerts; Android release readiness and a functioning iOS test build.

Open registration with modest promotion once ready. Internal testing comes first without changing the user's open-launch choice. Initial usage is free. Android release may precede public iOS release, but iOS compatibility is maintained throughout. Track early errors and sync outcomes daily during rollout.

## 19. Ownership, risks and next deliverables

### Working ownership

Aaron owns product scope, crop priorities and release decisions. Engineering owns architecture, implementation, tests and operations. Content ownership starts with Aaron, with an agricultural reviewer role prepared but unfilled. Translation and agronomic review need explicit responsible people before claiming reviewed content quality.

### Main risks and responses

- Price coverage: validate early; separate unsupported broker/grade/seasonal estimates from observed market quotes.
- Content quality: trace every consequential claim to a source and review record; reduce specificity where evidence is weak.
- Offline complexity: prove idempotency, conflicts and land changes before broad UI expansion.
- Scope size: build through the phase gates; do not add future features while core reliability is unfinished.
- Messaging/data cost: use quotas, provider caching, rate limits and spending alerts from the start.
- Long-lived records: test database migrations, content/rule versions and perennial history before public use.

### Implementation handoff

Create these working documents in the project repository: architecture decision log; database dictionary and migrations; OpenAPI schema; sync protocol; rule catalogue with test fixtures; crop/source/translation register; screen-state inventory; provider configuration guide; deployment/backup runbook; requirement-to-test checklist.

The first coding task is P0's feasibility slice, followed by P1 foundations. Do not buy services, publish apps or claim forecasts work just because their interfaces have been scaffolded. Production readiness requires real credentials, permitted data, reviewed content and passing end-to-end tests.

### Remaining decisions do not need another discovery interview

Engineering can propose provider choices, package versions, alert defaults, concrete schema and UI styling through the P0 evidence. The crop shortlist is provisional. Hosting expenditure, store accounts and source agreements are operational commitments to confirm when there are concrete options. Every accepted feature remains traceable in the scope register.

## 20. Technical references and verification notes

Sources checked on 30 September 2026. These support specific platform/data observations; the product behaviour and architecture in this document are AcrePilot design decisions. Recheck changing services before integration.

- **S1. Expo SQLite:** persistence and SQLite API. https://docs.expo.dev/versions/latest/sdk/sqlite/
- **S2. Expo BackgroundTask:** operating-system-controlled background scheduling. https://docs.expo.dev/versions/latest/sdk/background-task/
- **S3. Expo development builds and physical iOS setup:** cloud-build route, signing and account prerequisites. https://docs.expo.dev/develop/development-builds/introduction/ and https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/
- **S4. NestJS documentation:** TypeScript backend framework and application organisation. https://docs.nestjs.com/
- **S5. NestJS queues:** BullMQ worker/queue integration. https://docs.nestjs.com/techniques/queues
- **S6. Open-Meteo forecast API documentation:** candidate weather integration. https://open-meteo.com/en/docs
- **S7. Open-Meteo terms:** provider conditions to validate against the intended use. https://open-meteo.com/en/terms
- **S8. Kenya Agricultural Market Information System:** public market-listing fields observed in indexed official results; direct page retrieval was unavailable during this review. API access, reuse permission and exact coverage remain unverified. https://kamis.kilimo.go.ke/site/market

No crop yield, seed rate, pesticide rate, current selling price, vendor quotation or guaranteed future forecast has been invented for this plan. Numerical agronomic content is a P3/P4 data deliverable with evidence and tests.
