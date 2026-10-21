# Next implementation slice — shared water sources (P2)

Reviewed 2026-10-21 against build-plan.md and the current checklist.

The preceding navigation/settings, farm/plot, observation, tenure, shared storage and UI refinement work is implemented within its documented limits. P0/P1/P2 acceptance remains open; sign-in work remains deferred by Aaron. R01–R16 are retained.

## Entry check

AGENTS.md requires confirming/reproducing missing iPhone controls before more features. Ask Aaron to fully reopen Expo Go and confirm Add farm and Edit farm name are visible and usable after the UI refinement. A browser preview cannot establish this phone result. No new feature implementation has started in this continuation while that response is pending.

## Implementation scope

- Named farm-wide water-source records: source type, explicit unknown/reliable/seasonal/unreliable reliability, optional source and seasonal-shortage notes.
- Optional links to multiple plots in the same farm. Links indicate use, not irrigation coverage, capacity or water safety.
- Offline add/edit and retained drafts using the existing account-isolated outbox; retry deduplication and explicit two-device conflict resolution retain both versions.
- Validate owned live farm/plot links locally and on the server; immutable farm parent on edits.
- Preserve existing dated plot water observations and storage resources independently. No automatic migration or inferred links from matching names/types.
- English/Kiswahili UI using the current light/dark tokens and shared Button; grouped Farm resource entry with visible add/edit controls.

## Acceptance

- Integration checks: create/edit, restart/retry/lost acknowledgement, cross-account and wrong-farm links, invalid data and conflicting edits.
- Render the affected Farm UI; exercise required-field errors, unknown reliability, multiple plot links, save/edit/cancel, retained draft, both languages and palettes.
- Typecheck, generated OpenAPI and Android/iOS exports; clean Expo Go reload after shared changes.
- Keep separate pending iPhone keyboard/native/offline and accessibility checks.

No provider credentials or external verified data are required for manual source entry. Irrigation method/coverage, pumping costs, machinery/labour/infrastructure, maps and land lineage remain later P2 slices. Crop catalogue work (P3) follows the remaining farm model; no verified agronomy/weather/market integration is enabled by this slice.

Implementation completed within this scope: 52 tests/typecheck/OpenAPI and native exports pass; rendered form controls checked. Aaron confirmed the entry phone controls work. New source device checks remain pending. Next implementation: irrigation method/coverage with explicit unknowns; pumping cost scope to retain accepted optional finance behaviour.

Irrigation methods/coverage slice completed on 2026-10-21 with 55 tests and native exports; device checks remain open. Next independent P2 work: optional pumping-cost records, followed by remaining resources and land workflows.
