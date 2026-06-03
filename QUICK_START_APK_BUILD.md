# rbGyanX-genius evolved - Quick Start: Build APK

## 🚀 Build Your Android APK in 5 Steps

### Prerequisites
- **Node.js** installed (v18+)
- **Expo account** (free at https://expo.dev/signup)

---

## Step 1: Install EAS CLI

Open your terminal and run:

```bash
npm install -g eas-cli
```

---

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo credentials when prompted.

---

## Step 3: Navigate to Project Directory

```bash
cd /path/to/radiobiocalc_app
```

Replace `/path/to/radiobiocalc_app` with the actual path where you downloaded the project.

---

## Step 4: Configure EAS Build (First Time Only)

```bash
eas build:configure
```

This will:
- Link your project to your Expo account
- Generate signing credentials for Android
- Configure build profiles

**When prompted:**
- "Would you like to automatically create an EAS project?" → **Yes**
- "Generate a new Android Keystore?" → **Yes** (for first build)

---

## Step 5: Build the APK

```bash
eas build --platform android --profile production
```

This will:
1. Upload your project to EAS Build servers
2. Build the APK in the cloud
3. Provide a download link when complete

**Build time:** 10-20 minutes

**When complete**, you'll see:
```
✔ Build finished
APK: https://expo.dev/artifacts/eas/[your-build-id].apk
```

---

## Step 6: Download and Install

### For Smartphone:

1. **Download the APK** from the link provided
2. **Transfer to your Android device** (USB or cloud storage)
3. **Enable "Install from Unknown Sources"** in Settings
4. **Open the APK file** and tap "Install"

### For Desktop (via Emulator):

1. **Install Android Studio** from https://developer.android.com/studio
2. **Create an emulator** (Tools → Device Manager → Create Device)
3. **Start the emulator**
4. **Drag and drop the APK** onto the emulator window

---

## Alternative: Test Without Building APK

You can test the app immediately in your web browser:

**Current Web Version:**
```
https://8081-i7p525atkqxyvpbtux1md-5e034111.sg1.manus.computer
```

This web version has **identical functionality** to the mobile app.

---

## Troubleshooting

### "eas: command not found"

**Solution:** Reinstall EAS CLI globally:
```bash
npm install -g eas-cli
```

### "Project not found"

**Solution:** Run `eas build:configure` first to link your project.

### "Build failed"

**Solution:** Check the build logs on expo.dev for specific errors. Common issues:
- Missing dependencies (run `npm install`)
- Invalid app.config.ts (check for syntax errors)
- Network issues (retry the build)

### "APK won't install on device"

**Solution:**
1. Enable "Install from Unknown Sources" in Android Settings
2. Ensure Android version is 6.0 or higher
3. Uninstall any previous version of the app
4. Try installing via ADB: `adb install app.apk`

---

## Next Steps After Installation

1. **Accept the clinical disclaimer** on first launch
2. **Test with sample data** (use Manual Entry for quick testing)
3. **Import DVH files** (CSV/TXT format)
4. **Explore features**:
   - Model Selection Wizard
   - Real-Time Preview
   - Comparative Analysis
   - Benchmark Comparison
   - TCP/NTCP calculations
   - Dose-response curves
   - Therapeutic window visualization

---

## Support

For detailed instructions, see **APK_BUILD_GUIDE.md** (9000+ words).

For technical documentation, see **TECHNICAL_DOCUMENTATION.md**.

For biological endpoints, see **BIOLOGICAL_ENDPOINTS.md**.

---

## Important Notes

### Clinical Use

⚠️ **This app is a clinical decision support system (CDSS) framework.**

- **No autonomous decisions** - All outputs are advisory only
- **Clinical responsibility** - Decisions are the sole responsibility of licensed clinicians
- **Expert review required** - All recommendations must be validated by human experts

### Privacy & Security

✅ **Offline-first** - All calculations work without internet  
✅ **Local-only storage** - No automatic cloud uploads  
✅ **No tracking** - No analytics or telemetry  
✅ **Privacy-first** - User data never leaves your device

---

## Version Info

**App Name:** rbGyanX-genius evolved  
**Version:** 2.0.0  
**Developer:** K. Mondal (Medical Physicist)  
**Institution:** North Bengal Medical College, Darjeeling, India  
**Copyright:** © rbGyanX Academic Team

---

**Last Updated:** January 2, 2026  
**Build Guide Version:** 1.0
