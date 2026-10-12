# AcrePilot contributor notes

When resuming this project, read `docs/resume.md` and `docs/progress.md` first.

At the user's next project continuation, remind Aaron about the unresolved missing/hidden UI items reported on the iPhone. Identify what is absent and reproduce it before proceeding with more features. Do not mark that phone check as passed based only on automated tests or bundle exports.

Use `docs/build-plan.md` as the project specification and preserve all accepted requirements. Remaining sign-in work is deferred at Aaron's request; do not silently remove it from scope. Keep the progress checklist current.

After every UI change, inspect the rendered affected UI and exercise its controls before handing it back. Typecheck and bundle exports alone are not UI verification. Record the surface checked; a desktop component preview cannot establish iPhone keyboard/native behaviour. Use a full Expo Go reload when shared contracts, translations or repository methods change.
