# rbGyanX Mobile — Android & iOS (offline + export server)

**Primary build** for remote testers: calculations run **on the phone** (no PC for DVH/TCP/NTCP). **Only** PDF/DOCX report export uses a short-lived network call to your API server.

Legacy **pilot APK** (all features on server) is deprecated — use this mobile build instead.

## Build Android APK (recommended — local, no EAS queue)

See **[docs/LOCAL_ANDROID_BUILD.md](LOCAL_ANDROID_BUILD.md)**.

```powershell
cd path\to\radiobiocalc_app
.\scripts\install-android-sdk.ps1
npm install
npm run build:android:local
```

APK: `android\app\build\outputs\apk\release\app-release.apk`

## Build (EAS cloud — optional)

```powershell
eas login
npm run build:mobile-apk
```

| Platform | Command |
|----------|---------|
| **Android APK** | `npm run build:mobile-apk` |
| **iOS** | `npm run build:mobile-ios` (needs Apple Developer) |

App name on device: **rbGyanX Mobile** (v2.1.1).

## Reports on device

PDF and DOCX are **generated and saved on the phone** (app `reports/` folder). No PC or ngrok required.

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

## DVH import (pilot workflow)

Import the same DVH export you would use for QUANTEC checks in Excel; future releases may pull plans from your institution’s planning server without manual file transfer.

**Today:** export from your TPS (Eclipse, RayStation, Monaco, etc.) as `.csv` or `.txt`, then open the file on the phone (email, cloud drive, USB — follow your institution’s PHI policy). **Not yet:** direct wireless link to the TPS or automatic plan pull from a hospital planning server.

**Tips for testers**

- Use the **same structure names** your TPS export uses (PTV, parotids, cord, etc.).
- One **approved plan** per session; re-import if the plan is revised.
- Calculations run **offline** after import; only PDF/DOCX export may need the optional server URL.

## Tester flow

1. Install **rbGyanX Mobile** (Android APK or iOS build).
2. Accept disclaimer → self-test should pass **offline engine** (export server check is optional).
3. Import DVH (TPS file export) → run calculations (works in airplane mode).
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
