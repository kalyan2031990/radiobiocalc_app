# rbGyanX Pilot APK — build & distribute

## For you (coordinator)

### 1. Build the APK (Expo EAS — ~15 min in the cloud)

**You must be logged into Expo once** (free account at [expo.dev](https://expo.dev)).

```powershell
cd C:\Users\Sampa\OneDrive\Desktop\radiobiocalc_app
npm install -g eas-cli
eas login
eas build:configure
.\scripts\build-pilot-apk.ps1
```

Or: `npm run build:pilot-apk`

> This machine has no Android SDK installed; the APK is built on Expo servers, not locally.

When the build finishes, open the link in the terminal or at [expo.dev](https://expo.dev) → your project → **Builds** → download **APK**.

Share that APK file (Google Drive, email, etc.) with pilot testers.

### 2. Run the API server (required)

Calculations run on the Node API, not only inside the APK.

```powershell
cd C:\Users\Sampa\OneDrive\Desktop\radiobiocalc_app
pnpm install
pnpm run build
$env:PORT="3000"
pnpm start
```

- Allow **Windows Firewall** inbound on port **3000** (private network).
- Find your PC LAN IP: `ipconfig` → e.g. `192.168.1.10`.
- Share with testers: **`http://YOUR_LAN_IP:3000`**

Testers on the **same Wi‑Fi** can use that URL in the app: **Home → Pilot: set API server URL**.

### 3. Remote testers (different networks)

Use a tunnel, e.g. [ngrok](https://ngrok.com/):

```powershell
ngrok http 3000
```

Share the `https://….ngrok-free.app` URL (no trailing slash). Each tester enters it in **Pilot API server**.

---

## For pilot testers

1. Install the APK (enable “Install unknown apps” if Android asks).
2. Open app → accept disclaimer.
3. Tap **Pilot: set API server URL** → enter URL from coordinator → **Test connection** → **Save**.
4. If DVH/calculation fails, fully close and reopen the app after saving.
5. Send feedback: bugs, wrong numbers, UI issues.

---

## Version

Pilot APK is built from app version **2.0.0** (`app.config.ts`). Coordinator should note build date from EAS.
