# rbGyanX Radiobiocalc — Android & iOS

**Scope:** one patient, one plan — physical DVH + BED/EUD/gEUD/TCP/NTCP + simple plan statistics. See [MOBILE_SCOPE.md](./MOBILE_SCOPE.md).

Expo SDK 54 app with calculations via the bundled Node/tRPC API.

## Prerequisites

- Node 20+, pnpm 9+
- [EAS CLI](https://docs.expo.dev/build/setup/): `npm i -g eas-cli`
- Expo account: `eas login`

## Local development (phone + API)

1. Copy env and set your PC IP (same Wi‑Fi as phone):

   ```bash
   cp .env.example .env
   # EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000
   ```

2. Start API + Metro:

   ```bash
   pnpm install
   pnpm dev
   ```

3. Run on device/emulator:

   ```bash
   pnpm android    # Android emulator (API default http://10.0.2.2:3000)
   pnpm ios        # iOS simulator (API default http://127.0.0.1:3000)
   ```

   Or scan QR from `npx expo start` for Expo Go (set `EXPO_PUBLIC_API_BASE_URL` to LAN IP).

## Pilot APK (share with testers)

See **[docs/PILOT_APK.md](./docs/PILOT_APK.md)** — `eas login` then `npm run build:pilot-apk`.

Testers set the API URL in-app: **Home → Pilot: set API server URL**.

## Production builds (EAS)

```bash
eas build -p android --profile preview   # APK for testing
eas build -p android --profile pilot     # Pilot APK + in-app API URL
eas build -p android --profile production
eas build -p ios --profile preview
eas build -p ios --profile production
```

Configure `EXPO_PUBLIC_API_BASE_URL` in [EAS secrets](https://docs.expo.dev/build-reference/variables/) if the app should call a hosted API.

## Store submission

- **Android**: upload AAB/APK from EAS; package `space.manus.radiobiocalc_app.t20260101235427`
- **iOS**: upload IPA via EAS Submit; bundle id same as Android config in `app.config.ts`

Update `app.config.ts` `iosBundleId` / `android.package` before store release if you leave the Manus template IDs.
