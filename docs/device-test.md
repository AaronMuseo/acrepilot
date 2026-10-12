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

## P1 navigation/settings smoke test

1. Open the updated Expo Go preview; confirm the existing farm/task remain.
2. Visit Home, Farm, Crops, Tools, Markets and More. Tools/Markets should say unavailable; Crops should retain its fixture label.
3. In More select Kiswahili, then navigate and reload while online. Confirm the language persists. Return to English if desired.
4. Change area units among acres, hectares and square metres. The farm should represent the same area after each switch and after reload; unknown area stays unknown.
5. With a fresh fixture account, start a farm draft, navigate to More, change units, and return. Name/area and the original entry unit should remain. Reload online and verify again before saving.
6. Change the task offline on Home, navigate to More, reconnect and Retry sync. Confirm the edit remains and pending clears. Sign-out with pending changes must retain the account and show an explanation.
7. Check both languages with large text and VoiceOver. Report any clipped controls or missing labels.

Phone confirmation for this slice is pending; automated SQLite persistence tests do not replace the UI/device test. The local preview address was updated to 192.168.1.6 for this session; use the current computer address when it changes.

## Password/session smoke test

1. In More, find Account security. Use a new made-up password of at least 15 characters.
2. If prompted to verify again, enter the SAME test identity, request its development code, and verify. Then set the password within 10 minutes.
3. Wait for Password saved. Confirm pending edits are synced before signing out.
4. Sign out, enter the same identity and new password, and choose Sign in with password. Confirm the original farm/task return.
5. Keep the session for over 15 minutes, then Retry sync online: renewal should occur without asking for a code. If offline, edits should still save and reconnect normally later.
6. Check equivalent Kiswahili messages. This remains synthetic-data testing, not real identity verification.

## Multiple-farm smoke test

1. In Farm choose Add farm, enter a second made-up name and area, then save.
2. Switch between farms; Home should show each farm's own task. Complete one and confirm the other remains unchanged.
3. In Farm choose Edit farm name. Disconnect, save a name change, then reconnect and Retry sync in More. The new name should remain.
4. Reload online and confirm both farms and the selected farm survive. Area values should retain the same physical size across unit changes.
5. Start an Add farm draft, navigate away/back, choose Add farm again and confirm the draft is retained.

## Farm-area revision phone check (pending)

1. Fully reload the project in Expo Go. Open Farm and confirm Add farm, Edit farm name and Change farm area are visible.
2. Select a fake farm and choose Change farm area. Enter a different positive total area, today's date (YYYY-MM-DD) and Correction. Save with Wi-Fi off.
3. Confirm the new total and history show the original baseline and the dated change. Reload offline and confirm both remain.
4. Reconnect and retry sync; confirm the app reports synced and does not duplicate history.
5. Try a future date and an Expansion with a smaller total; confirm clear errors. Change language/units and confirm labels/converted history values.

This does not replace native encryption/performance tests or the deferred authentication phone checks.

## Plot naming/selection (pending)

1. Fully reopen Expo Go. In Farm, find Plots and choose Add plot. Enter a fake name and save offline.
2. Choose Edit plot name, change it and save. Reopen offline: the plot and selection should remain.
3. Add a second plot, select between them, then switch farms. Each farm must show only its own plots and remember its selection.
4. Reconnect and retry sync; confirm Synced with no duplicate plots. Farm area/history must be unchanged.
5. Check English/Kiswahili labels and blank-name validation. Plot areas should explicitly remain unknown.

## Plot areas (pending)

1. Fully reopen Expo Go; Farm → Plots → select a plot → Record / change plot area.
2. With Wi-Fi off, enter a positive area within the farm total, today’s date and Correction. Save, then reopen and inspect history.
3. Reconnect and sync; verify the value and history remain.
4. Try giving another plot an area that makes the measured total exceed the farm: expect a clear error and no saved change.
5. Try reducing farm area below the measured plot total: expect rejection. Correct plot measurements first.
6. Unknown plots stay unknown and do not increase the measured total; unit/language changes must preserve actual areas.
