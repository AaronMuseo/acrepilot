# Free iPhone preview with Expo Go (SDK 57)

Current route chosen by Aaron: Expo Go on iPhone 13 Pro. Apple enrollment and signed builds are deferred for cost; they are not prerequisites for this preview.

## Start on this Windows computer

```powershell
# Terminal 1 — test API, on your trusted Wi-Fi address
$env:API_HOST='192.168.1.9'
pnpm dev:fixture

# Terminal 2 — Expo Go (not a development client)
pnpm dev:go
```

The current ignored `apps/mobile/.env.local` points to `http://192.168.1.9:3000`. Update it if this computer's Wi-Fi address changes, then restart Metro. Keep the phone and computer on the same trusted Wi-Fi. No public tunnel is used. Local HTTP is for synthetic fixture testing only; production/off-device private traffic still requires TLS.

1. Install/open **Expo Go** from the iPhone App Store. Tap the account icon in the top-right corner and sign in as **aaronmuseo**, the same account used by Expo CLI. The phone and computer sign-ins are separate. Allow local-network permission if prompted.
2. Scan the Metro QR code with the iPhone Camera and open it in Expo Go. If an account error is still on screen, tap **Try Again**; Expo CLI reads the sign-in on the next request. See [Expo's sign-in troubleshooting](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).
3. Choose English or Kiswahili. Enter a made-up email such as `demo@example.test`. Get the on-screen development code, enter it and verify the **test account**. No SMS/email is sent.
4. Create a fake farm, toggle its task, read the labelled guide, and observe sync status.
5. While the app is loaded, enable airplane mode and toggle the task. Local SQLite saves should work. Reconnect and retry sync. Expo Go's cached bundle/restart behavior is not a substitute for the signed-build cold-start gate.

If the phone cannot reach the API, open `http://192.168.1.9:3000/v1/health` in Safari on the same Wi-Fi. If this fails, check Wi-Fi isolation and Windows' private-network access prompt; don't disable the firewall. If API health succeeds but the app fails to load, check Metro/port 8081 and the SDK version message.

## Explicit limitations

- Mobile targets Expo SDK 57.0.0, with `expo` package 57.0.26 for compatible patches. The iPhone's installed Expo Go reported SDK 57 when it rejected the earlier SDK 54 bundle.
- Expo Go uses separate `expo-go-fixture-<owner>.db` files with **unencrypted test records**, a separate secure session key, and a visible bilingual warning. It rejects non-fixture accounts for this mode. Enter no real private farm information.
- Custom native builds retain SQLCipher configuration and still fail closed when SQLCipher is missing; this is not a silent production fallback.
- No real channel ownership, reviewed agronomy, encrypted-storage proof, push delivery, signed build, or complete P0 acceptance is claimed.
- The EAS project and signed/device-test profiles are retained for later. The generated Android folder is ignored by Git/EAS and must be regenerated from the current SDK 57 before native builds.
