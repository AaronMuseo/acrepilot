# Resume reminder

Updated 2026-10-12.

## Phone checks first

Aaron identified missing **Add farm / Edit farm name** controls. These actions were moved above farm lists/details, forms moved beside them, preview notices compacted, and reauthentication scoped to More. Aaron replied “ok perfect” after the area-change handoff and then requested the plot slice. Detailed phone test steps are still tracked separately; do not infer unreported checks.

Reload Expo Go fully, then check Farm actions and the new Change farm area workflow. A historical undefined-function error had no stack/root cause; do not claim it resolved without phone verification.

## Current state

- Bottom navigation, bilingual settings, password/session foundation, multiple farms, switching and name edits are implemented locally.
- Farm-area revisions now save offline with dated correction/expansion/reduction history. The server preserves accepted history; conflict resolution appends a correction when keeping a different local area.
- Typecheck, 34 tests and Android/iOS exports pass. Physical-device checks remain open.
- Sign-in follow-up remains explicitly deferred; all accepted account requirements remain in scope.
- Named plot records, offline creation/renaming and per-farm selection are now implemented. Dated plot areas and measured-total validation are implemented. Subdivision/split/merge/sales/leases, resources/conditions/maps and other P2 work remain pending. Farm-area history remains independent of plot naming.
- P0 native encryption, native device performance and provider gates remain open. Expo Go remains the free development route.
- Changes are local; Aaron handles committing/pushing.
