# UI and code audit — 2026-10-19

Scope: reviewed the application shell, Farm/Plot managers, observation/resource forms, shared controls, preview harness and accepted specification. This is a usability/maintenance review, not a security certification. Existing local work and R01–R16 are retained; no records, migrations or dependencies were deleted.

## Findings addressed

- Farm context appeared after all plot details. Moved its summary above plots; shared storage follows plots.
- Every plot condition and history expanded into a long default screen. Added one reusable accessible DetailSection with explicit expanded state and 56px minimum target. Area history and five plot-detail groups now expand on demand.
- Farm/plot summary text hard-coded unknown water (and farm soil) even when observations existed. Removed these misleading summaries; dated source records remain available in their sections.
- Roadmap prose occupied the daily Farm screen. Removed the land-history placeholder and shortened the measured-area explanation in English/Kiswahili. Planned land workflows remain in the checklist/specification.
- Storage empty state repeated long help and verification text without any records. Help now appears during entry; verification text remains with records/entry.
- Embedded observation headings repeated section titles. Added an optional embedded presentation while preserving standalone component rendering.
- The preview previously stacked isolated components. It now renders the actual combined FarmManager with clearly labelled fake state to catch ordering and discoverability issues.

## Behaviour retained

Add farm, Edit farm name, area changes, plot actions and Add water storage remain visible. Expanded content stays mounted when collapsed, preserving drafts and validation state. Sections reset when switching plot IDs; persisted drafts still use their existing per-plot keys. No data model, sync, ownership, credentials, financial or history behaviour changed.

## Verification

- Typecheck and all 49 existing tests passed; final typecheck after copy changes passed.
- Browser rendering: actual React Native Web components with mocked repository; narrow default viewport and 390px viewport inspected. This is not native SQLite/device verification.
- Exercised all five detail toggles, both area-history toggles, soil draft collapse/reopen/save, plot switching with correct source history, farm rename open/cancel, plot add open/cancel, storage add/save/edit/cancel.
- Screenshot: `.local/farm-cleanup-ui.png` (ignored local evidence).
- Native iPhone keyboard, VoiceOver, large text, scrolling and collapse while keyboard is open remain to be checked after full Expo Go reload.

## Retained follow-up findings

- Shell repeats brand/preview/sync information and More repeats some status messages. Consolidate in a separately verified full-shell preview; fixture/encryption and sync-failure information must stay discoverable.
- Repeated local form helpers/styles are maintenance debt. Avoid broad mechanical refactoring during this layout pass; shared action/input primitives can be extracted with comprehensive form checks later.
- Long histories still render all records when expanded. Future history pagination must preserve every record and clear access to older entries.
- Tools/Markets unavailable states, fixture guide/task and deferred account work serve accepted requirements/testing; they are not dead features to delete.
- Native P0 gates, real identity providers, verified crop/market/weather data and all remaining P2–P8 requirements remain open. No new credentials are needed for this cleanup.
