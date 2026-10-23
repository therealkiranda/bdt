# Black Diamond Tours — Expo mobile starter

A clean starting point for an Android-first React Native + Expo + TypeScript app.
The website remains separate; this repository is for the mobile experience.

## Included

- Expo Router navigation: Home, Explore, Saved, My Trips, Profile
- Live data from the website API (`https://blackdiamondtours.com.np/api/v1`): packages, categories, search, reviews, departures, live price quotes
- Sign-in / register / forgot password with the **same customer accounts as the website** (tokens kept in the Android Keystore / iOS Keychain, automatic single-flight refresh)
- Saved packages synced with the account
- Booking **requests** (idempotent, server-side pricing, offline payment); cancel; My Trips with itinerary, tickets/documents, emergency contacts
- Offline copy of confirmed trips (always labelled "not proof; verify online")
- Enquiries (general, custom tour, booking support), notifications inbox, profile edit, account deletion
- Destination map using coordinates from the API (`react-native-maps`)

## Run locally

1. Install Node.js and a compatible npm version.
2. In this folder, run `npm install`.
3. Run `npx expo start`.
4. Scan the QR code with Expo Go where compatible, or use an Android emulator.

If dependency versions have moved since this starter was generated, follow Expo's version guidance:
`npx expo install --fix`

## Google Maps

Map screen uses sample coordinates for Kathmandu and Pokhara. It does not request device location.
Configure the Google Maps Android SDK key in `app.json`/EAS secrets and restrict it to the Android app package and signing certificate. See `docs/google-maps.md`.

## Backend integration

All network code is in `src/api/`:

- `config.ts` base URL (`EXPO_PUBLIC_API_BASE_URL`, see `.env.example`)
- `client.ts` fetch wrapper: envelope parsing, `ApiError`, timeout, Bearer token, refresh on 401 (one shared refresh so a single-use refresh token is never reused), `Idempotency-Key`
- `token-store.ts` secure token storage
- `index.ts` one typed function per endpoint; `types.ts` response types

Rules the app follows (from the API guide): money is a decimal string and is never computed on the device (prices come from `/availability`); the server is the source of truth for status and totals; one idempotency key per booking/enquiry attempt, reused on retry; offline trip data is never treated as proof.

Not implemented on the server yet, so not in the app: push notifications (notifications are fetched when the screen opens), online payments.

## Appearance and Android safe area

The app supports System, Light, and Dark appearance choices in Profile. The selection is saved locally with AsyncStorage; System follows the operating system color scheme. The Home and Profile screens account for safe-area insets, and the status bar is non-translucent to prevent content from sitting underneath Android system UI.
