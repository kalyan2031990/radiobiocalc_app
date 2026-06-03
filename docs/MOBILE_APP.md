# rbGyanX Mobile — Android & iOS (offline + export server)

**Primary build** for remote testers: calculations run **on the phone** (no PC for DVH/TCP/NTCP). **Only** PDF/DOCX report export uses a short-lived network call to your API server.

Legacy **pilot APK** (all features on server) is deprecated — use this mobile build instead.

## Build (EAS cloud)

Log in once: `eas login` ([expo.dev](https://expo.dev)).

```powershell
cd C:\Users\Sampa\OneDrive\Desktop\radiobiocalc_app
npm install -g eas-cli
```

| Platform | Command | Install |
|----------|---------|---------|
| **Android APK** | `npm run build:mobile-apk` | Download APK from Expo → Builds; sideload |
| **iOS** | `npm run build:mobile-ios` | Expo internal distribution / TestFlight per your Apple setup |

App name on device: **rbGyanX Mobile** (v2.1.0).

Alias: `npm run build:offline-apk` = same Android profile.

## Coordinator: export server for remote phones

1. On a PC with the repo:

   ```powershell
   npm install
   npm run start:server
   ```

2. **Remote testers** (any network): tunnel HTTPS:

   ```powershell
   ngrok http 3000
   ```

   Share the `https://….ngrok-free.app` URL (no trailing slash).

3. **Same Wi‑Fi only** (optional): `http://YOUR_LAN_IP:3000` from `ipconfig` + `.\scripts\open-firewall-port-3000.ps1` (Admin).

4. Share the **APK / iOS install link** with testers. They enter the URL once: **Home → Report export server (PDF/DOCX)** → Test → Save.

Calculations, DVH import, and composite therapeutic window **do not** use this URL.

## Tester flow

1. Install **rbGyanX Mobile** (Android APK or iOS build).
2. Accept disclaimer → self-test should pass **offline engine** (export server check is optional).
3. Import DVH → run calculations (works in airplane mode).
4. For reports: set export server URL if not done → open **Export report** → PDF / DOCX.

## Verify engine on PC

```powershell
npm run test:offline-engine
```

## Build comparison

| Build | Command | Calculations | Reports |
|-------|---------|--------------|---------|
| **Mobile (use this)** | `build:mobile-apk` / `build:mobile-ios` | On device | Server URL (ngrok/LAN) |
| Pilot (legacy) | `build:pilot-apk` | On PC API | On PC API |
| Dev web | `npm run dev` | On PC API | On PC API |

## Version

Configured in `app.config.ts` (`version`, `android.versionCode`). Note EAS build date from [expo.dev](https://expo.dev) → Builds.
