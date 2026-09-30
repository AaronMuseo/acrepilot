# P0 physical-device runbook — setup in progress

**Current route:** Aaron deferred Apple Developer enrollment because of cost and chose free Expo Go on his iPhone. Use [expo-go.md](expo-go.md) now. The signed-build instructions below remain for later and are not required to preview the app.

## Current setup

EAS CLI 24.8.0 is installed in the workspace. Expo project [@aaronmuseo/acre-pilot](https://expo.dev/accounts/aaronmuseo/projects/acre-pilot) is linked with ID `98af033d-7281-486d-a5f1-02febcb420bb`. Aaron has an iPhone 13 Pro only, no Mac and no active Apple Developer membership. Enrollment is deferred for cost. No signed iPhone build or physical acceptance tests have run yet.

Android native prebuild succeeds and generated Gradle properties enable SQLCipher. Installed Android Studio Java 21 is used for local Android compilation; system Java 26 is not selected. No Android phone is attached. A local iOS EAS archive check includes shared packages and excludes environment files, signing files, local databases and dependency caches.

## Apple enrollment — owner action required

1. Open [Apple Developer enrollment](https://developer.apple.com/programs/enroll/) or use the Apple Developer app on the iPhone (Account → Enroll Now).
2. Sign in privately with the Apple Account, enable two-factor authentication, and choose individual or organization based on actual legal status. Individual enrollment displays the person's legal name as the App Store seller; organization enrollment has separate legal-entity verification requirements.
3. Complete identity verification, review Apple's agreement and pay directly with Apple. Apple lists USD 99 per membership year, with the actual local price shown during enrollment. No enrollment, agreement acceptance or payment has been performed by this project setup.
4. Wait until membership is active, then resume this chat. Do not paste passwords, 2FA codes, payment details or signing keys into chat.

References checked 2026-10-01: [Apple enrollment](https://developer.apple.com/programs/enroll/), [enrollment in the app](https://developer.apple.com/help/account/membership/enrolling-in-the-app/), [Expo physical iOS signing](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/).

## After membership activation

From `apps/mobile`, run `pnpm exec eas device:create` and open its registration link on the iPhone. Complete Apple login/2FA privately in the CLI when required. Registration in Expo must be followed by Apple provisioning; it alone does not establish an installable device.

Run `pnpm exec eas build --profile development --platform ios` for the interactive development client. Install using the resulting EAS URL and enable iOS Developer Mode when prompted. Start Metro using `pnpm dev:mobile` at repository root.

For the **force-close/airplane-mode acceptance test**, use `pnpm exec eas build --profile device-test --platform ios`. This internal profile embeds its JS bundle and does not depend on Metro after restart. Set a reachable HTTPS `EXPO_PUBLIC_API_URL` in the EAS **development** environment before this build; `.env.local` is deliberately excluded from cloud archives. The API must remain a restricted synthetic-data test service while fixture auth exists. A localhost URL on an iPhone points to the phone, not this Windows computer. No test API endpoint is configured yet.

Device registration, cloud builds, installation and API connectivity remain pending. No build has been submitted to an app store.

Prerequisites: Expo account/project, installed EAS CLI, signed development Android APK and iOS IPA, Apple Developer membership/provisioned iPhone 13 Pro, affordable Android test phone, reachable HTTPS test API. No credentials or signing identities are included. Expo Go is insufficient for SQLCipher.

From `apps/mobile`, the Android equivalent is `pnpm exec eas build --profile development --platform android`; use `--profile device-test` for the embedded-bundle offline test. These cloud upload/build actions have not been performed. An affordable Android device is still needed to complete P0's Android physical gate.

1. Choose English, obtain the visible development code, verify the fixture account. Repeat in Kiswahili.
2. Save one farm with blank area and no pin. Confirm unknown soil/water and location limitation. Confirm one default plot and test guide/task.
3. Allow initial sync. Put the phone in airplane mode. Complete the task; confirm pending status. Force-close and reopen. Confirm completion and guide remain readable without network.
4. Reconnect/foreground. Confirm synced and one accepted task edit in server change log (create version 1, edit version 2). Repeat with response interruption after commit.
5. Edit while an older request is in flight. Confirm latest local value stays visible.
6. Use a second device and edit same record; show both values and resolve explicitly. Confirm history remains.
7. Try sign-out while pending: explanation, no loss. Sync then sign out and verify another fixture account; no prior records visible. Reauthenticate original owner to recover its cache.
8. Verify SQLCipher capability at boot. Inspect a copied test DB with plain SQLite: it must not expose records. Confirm key survives restart; missing/wrong keys cause visible failure without deletion. Check Android backup/key exclusions and iOS reinstall behavior.
9. Test large text, VoiceOver/TalkBack, small screen, low battery, full storage, slow/unreachable API, expiry/revocation and repeated foreground triggers. Record cold cached Home time and local-save latency; initial targets ~3 s / 500 ms await calibration.

Record device model/OS/build SHA, timings, screenshots and failures in `validation.md`. Android/iOS bundle exports alone do not check native linking, encryption, signing or physical behavior. Full later-phase scenarios remain in build-plan §18.
