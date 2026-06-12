# Local Android APK (no EAS cloud queue)

Build **rbGyanX Mobile** on your Windows PC — free, no Expo build queue.

## One-time setup

1. Install Android SDK (run from repo root):

   ```powershell
   .\scripts\install-android-sdk.ps1
   ```

   Or install [Android Studio](https://developer.android.com/studio) and enable **SDK Platform 35** + **Build-Tools**.

2. Set environment (PowerShell profile or each session):

   ```powershell
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   $env:Path += ";$env:ANDROID_HOME\platform-tools;$env:JAVA_HOME\bin"
   ```

3. `npm install` in this repo.

## Build APK

```powershell
cd path\to\radiobiocalc_app
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path += ";$env:JAVA_HOME\bin;$env:LOCALAPPDATA\Android\Sdk\platform-tools"
npm run clean:expo-cache
npm run build:android:local
```

For a full wipe of the native `android/` folder, use `npm run build:android:local:clean` instead. **Close Android Studio** and any Explorer window inside `android/` first, or Windows may report `EBUSY` when deleting that folder.

If prebuild already ran once, rebuild only the APK (offline mobile bundle):

```powershell
npm run build:android:release
```

Install on a USB phone:

```powershell
npm run install:phone
```

APK output:

`android\app\build\outputs\apk\release\app-release.apk`

Rename to `rbGyanX-Mobile-v2.1.1.apk` and sideload.

## Verify (automated + device)

```powershell
npm run test:automation
npm run install:phone
```

Desktop browser: `npm run dev:desktop` → http://localhost:8081

## Offline mobile flag

`EXPO_PUBLIC_OFFLINE_BUILD=1` is set automatically by `build:android:local`.

## Reports on device

PDF/DOCX are generated and saved under app storage (`reports/`). No PC server required.
