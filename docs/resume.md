# Resume reminder

Updated 2026-10-18.

## Phone checks first

Aaron identified missing **Add farm / Edit farm name** controls. These actions were moved above farm lists/details, forms moved beside them, preview notices compacted, and reauthentication scoped to More. Aaron replied “ok perfect” after the area-change handoff and then requested the plot slice. Detailed phone test steps are still tracked separately; do not infer unreported checks.

Aaron confirmed the previous save/label issue worked before requesting the Git push. Keep rendered UI checks mandatory; historical error root cause was not established. New soil-observation phone checks are pending.

## Current state

- Bottom navigation, bilingual settings, password/session foundation, multiple farms, switching and name edits are implemented locally.
- Farm-area revisions now save offline with dated correction/expansion/reduction history. The server preserves accepted history; conflict resolution appends a correction when keeping a different local area.
- Typecheck, 49 tests and Android/iOS exports pass. Physical-device checks remain open.
- Sign-in follow-up remains explicitly deferred; all accepted account requirements remain in scope.
- Named plot records, offline creation/renaming and per-farm selection are now implemented. Dated plot areas and measured-total validation are implemented. Subdivision/split/merge/sales/leases, resources/conditions/maps and other P2 work remain pending. Farm-area history remains independent of plot naming.
- P0 native encryption, native device performance and provider gates remain open. Expo Go remains the free development route.
- Changes are local; Aaron handles committing/pushing.

- Soil observations now save as independent self-reported snapshots with date, soil type and optional notes. Lab/water/resource fields remain pending. Current local preview address: 192.168.1.11.

- Plot water observations now retain dated self-reported multi-source/reliability/shortage history. Farm-wide resources and irrigation coverage remain pending.

- Manual dated soil-test pH records are implemented with retained history and unverified-report labelling; other lab fields/integrations remain pending.

- Plot tenure history now records owned/leased/unknown and optional lease dates. Full current overview is docs/checklist.md.

- Tenure now has native date selectors and optional exact KES lease rates/basis/period with retained area estimates. Native date-picker phone checks are pending; browser form interaction checks passed.

- Soil observations can now be explicitly copied from another plot in the same farm, reviewed/edited, and saved with source provenance. Phone copy-flow confirmation pending.

- Dated slope/drainage/road-access observations are implemented with unknown defaults and shared native date selection. Phone flow confirmation pending.

- Shared water-storage resources now support farm-specific add/edit, optional litre/m³ capacity and plot links. Phone workflow confirmation pending.

## 2026-10-19 cleanup
Aaron confirmed the previous storage feature worked, then requested an audit/cleanup. See ui-audit.md for findings. Farm now has visible actions and summary followed by expandable plot history/conditions, then storage. Detail sections preserve mounted drafts; phone keyboard/accessibility checks remain pending. Full Expo Go reload required after shared translation changes. No accepted feature or saved data removed.

## 2026-10-21 design refinement
Shared light/dark design tokens and Button/Skeleton components now drive the existing UI. System appearance enabled; native status-bar colors follow palette. Browser full-shell checks passed in English/Kiswahili at 320px/390px/desktop, including form validation, saving, cancellation, disclosure, task feedback and simulated loading/pending/error/empty states. Typecheck and 49 tests passed with loopback access; native exports pass. Full web export remains blocked by the existing SQLite WASM resolution issue.

Next phone check: fully reload Expo Go, confirm Add farm/Edit farm name, scroll/forms/keyboard, native date picker, light/dark and large text/VoiceOver. These remain unverified on iPhone. No new features before resolving any missing controls reported there. Sign-in remains deferred. Aaron handles commits/pushes.

## Shared sources continuation — 2026-10-21
Aaron confirmed Add farm/Edit farm name work after the phone reload. Shared water sources now support farm-wide add/edit, source type, reliability, multi-plot use links, notes and shortages. Existing observations/storage remain independent. 52 tests and typecheck pass; browser form checks passed with fake storage. Full API restart and clean Expo reload needed for the new shared record schema. Native source/offline/accessibility checks remain pending; sign-in remains deferred. Next P2 slice: irrigation methods/coverage, preserving unknowns and historical area context.

Current blocker: black screen/native render error involving pick after source slice. Clean Expo server restarted, capture session 63203; full phone restart/error stack requested. Cause unproven. Resolve before more features; do not reset saved data.

Connection follow-up: verified WiFi changed to 192.168.1.8. Corrected ignored .env.local API URL, restarted Expo advertising .8 and fixture API bound to .8 (previous API was loopback-only). QR regenerated. Render/pick issue still needs phone confirmation after connection restored.

## Phone recovery confirmed — 2026-10-21
Aaron reports “it works perfect” after scanning the new QR and reopening Expo Go. The app-loading/render blocker is cleared by this phone confirmation. Corrected LAN address: 192.168.1.8 (Expo 8081, fixture API 3000). A clean Metro restart preceded recovery; the exact cause of the earlier pick exception remains unproven. This confirms loading, not all source add/edit/offline/accessibility flows. Next slice remains irrigation methods/coverage; sign-in stays deferred.

## Irrigation slice — 2026-10-21
Irrigation methods/coverage now live under Farm > selected plot > Irrigation. Dated immutable records distinguish unknown/no irrigation/known methods, optional measured coverage and notes. Plot area when saved is retained; future revisions never rewrite the percentage. 55 tests/typecheck/OpenAPI and native exports pass; real-component browser checks with fake state passed, native phone check pending. API session 44963 and clean Metro session 69063 at verified 192.168.1.8. Fully close/reopen Expo Go; no live schema hot-refresh assumed safe. Next work: pumping costs and remaining P2 resources; sign-in deferred and all accepted requirements retained.
