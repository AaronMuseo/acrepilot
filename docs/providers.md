# Provider configuration and open gates

Checked 2026-10-01. The Expo project is linked; no service has been purchased and no builds/deployments have been submitted. No secret belongs in `EXPO_PUBLIC_*`; those values ship in the app.

| Integration | Current state | Needed before enabling |
|---|---|---|
| SMS/email | Development code adapter only; no messages sent | Choose vendors, Kenyan delivery tests, sender/domain verification, credentials, spend/rate caps, recovery and delivery-error handling |
| Expo/EAS and stores | CLI installed; @aaronmuseo/acre-pilot linked; SDK 57 Expo Go preview selected based on the installed iPhone client | Paid Apple enrollment deferred for cost; signed-device encryption checks and Android physical device still pending |
| Maps | Explicit missing-location state | Provider/platform decision, keys, Kenya tiles/pin tests, licence/cost review; manual pin and denied permission states |
| Weather | Open-Meteo candidate, no API adapter enabled | Commercial-use approval/plan, token if applicable, variables/horizon/coverage/staleness tests and attribution. Free app access does not establish non-commercial provider eligibility |
| Official seasonal context | No imported data | Kenya Meteorological Department access/reuse permission, issue dates, locations and review |
| Market prices | KAMIS candidate; direct retrieval failed during this check | Explicit API/import permission, history, coverage, grades, channel/unit mapping, freshness and quality audit; CSV path only after rights verified |
| Broker/farm-gate observations | No qualified source | Relevant independent observations; never estimate via wholesale percentage |
| Agronomy/images/translations | Labelled test maize text only | Sources, reuse/licensing, qualified review, English/Kiswahili terminology review; 20-crop editorial shortlist remains provisional |
| Push/notifications | Not implemented | Platform credentials, device registration, quiet hours, receipts/deduplication, local permission/reminder tests |
| Hosting/object storage/Redis/monitoring | Local scaffolding only | Region/quotes and spending approval, TLS, restricted secrets, backup/media restore, metrics and retention rules |

References: [Open-Meteo terms](https://open-meteo.com/en/terms) separate free non-commercial access from commercial plans; [forecast docs](https://open-meteo.com/en/docs) are a candidate specification, not Kenya validation. [KAMIS](https://kamis.kilimo.go.ke/site/market) access and permissions are unverified. [Expo iOS device setup](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/) documents signing prerequisites.

## Environment

`DATABASE_URL`: server-only PostgreSQL connection. `NODE_ENV=development` + `DEV_FIXTURE_AUTH=true`: explicit fixture auth opt-in for normal API. `API_HOST`: loopback default. `PORT`: 3000 default. `EXPO_PUBLIC_API_URL`: non-secret reachable HTTPS API base URL (not configured for the iPhone yet). EAS project is linked; Apple signing is still unset. Production auth defaults unavailable until an actual delivery adapter exists.
