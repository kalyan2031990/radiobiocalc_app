# rbGyanX-genius evolved - APK Build & Installation Guide

## Overview

This guide explains how to build and install the **rbGyanX-genius evolved** Android APK for use on smartphones and desktop computers (via Android emulator).

---

## Prerequisites

### For Building APK

1. **Node.js** (v18 or higher)
2. **Expo CLI** (`npm install -g expo-cli`)
3. **EAS CLI** (`npm install -g eas-cli`)
4. **Expo Account** (free at https://expo.dev)

### For Installing on Smartphone

- Android device running Android 6.0 (Marshmallow) or higher
- USB cable (for transferring APK) or internet connection (for download)
- "Install from Unknown Sources" enabled in device settings

### For Desktop (browser — recommended on Windows)

- **rbGyanX web app:** `npm run dev:desktop` → http://localhost:8081 (full DVH file picker, no emulator)
- **Physical Android phone (USB):** `npm run build:android:release` then `npm run install:phone`
- Android emulators are **not supported** for this React Native build (use browser or a real device)

---

## Building the APK

### Option 1: Using EAS Build (Recommended)

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure the project**:
   ```bash
   cd /path/to/radiobiocalc_app
   eas build:configure
   ```

4. **Build the APK**:
   ```bash
   eas build --platform android --profile production
   ```

5. **Download the APK**:
   - After build completes, EAS will provide a download link
   - Download the APK file (e.g., `rbgyanx-genius-evolved-v2.0.0.apk`)

### Option 2: Local Build (Advanced)

1. **Install Android SDK and NDK**:
   ```bash
   # Follow instructions at https://reactnative.dev/docs/environment-setup
   ```

2. **Generate Android project**:
   ```bash
   npx expo prebuild --platform android
   ```

3. **Build APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

4. **Locate APK**:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## Installing on Smartphone

### Method 1: USB Transfer

1. **Connect your Android device** to your computer via USB
2. **Enable USB debugging** on your device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options → Enable USB Debugging
3. **Transfer the APK** to your device:
   ```bash
   adb install rbgyanx-genius-evolved-v2.0.0.apk
   ```
   Or manually copy the APK to your device's Downloads folder

4. **Install the APK**:
   - Open the APK file from your device's file manager
   - Tap "Install" and follow the prompts
   - If prompted, enable "Install from Unknown Sources" for this app

### Method 2: Direct Download

1. **Upload APK** to a cloud storage service (Google Drive, Dropbox, etc.)
2. **Download on your device** using the cloud storage app
3. **Install the APK** as described in Method 1, step 4

### Method 3: QR Code (for web version)

1. **Run the development server**:
   ```bash
   cd /path/to/radiobiocalc_app
   pnpm run dev
   ```

2. **Generate QR code**:
   ```bash
   pnpm run qr
   ```

3. **Scan with Expo Go app** (available on Google Play Store)
   - This runs the development version, not the production APK

---

## Installing on Desktop (via Android Emulator)

### Using Android Studio (Recommended)

1. **Download and install Android Studio**:
   - Visit https://developer.android.com/studio
   - Download the installer for your OS (Windows, Mac, Linux)
   - Run the installer and follow the setup wizard

2. **Set up Android Emulator**:
   - Open Android Studio
   - Go to Tools → Device Manager
   - Click "Create Device"
   - Select a device definition (e.g., Pixel 5)
   - Select a system image (e.g., Android 11 - API 30)
   - Click "Finish" to create the emulator

3. **Start the emulator**:
   - In Device Manager, click the "Play" button next to your emulator
   - Wait for the emulator to boot (may take 1-2 minutes)

4. **Install the APK**:
   - **Method A**: Drag and drop the APK file onto the emulator window
   - **Method B**: Use ADB:
     ```bash
     adb install rbgyanx-genius-evolved-v2.0.0.apk
     ```
   - **Method C**: Use Android Studio:
     - Open Android Studio
     - Go to Run → Install APK
     - Select the APK file

5. **Launch the app**:
   - Find "rbGyanX-genius evolved" in the app drawer
   - Click to launch

### Using desktop browser (Windows)

1. From the repo: `npm run dev:desktop`
2. Open http://localhost:8081 in Chrome or Edge
3. Import Eclipse `.txt` DVH files, run setup, view **rb X** explainability tab

### Using NoxPlayer (not recommended)

1. **Download and install NoxPlayer**:
   - Visit https://www.bignox.com
   - Download the installer for your OS
   - Run the installer and follow the setup wizard

2. **Install the APK**:
   - Open NoxPlayer
   - Drag and drop the APK file onto the NoxPlayer window
   - Or click "Add APK" button in the toolbar
   - Wait for installation to complete

3. **Launch the app**:
   - Find "rbGyanX-genius evolved" in the app drawer
   - Click to launch

---

## System Requirements

### Smartphone

- **OS**: Android 6.0 (Marshmallow) or higher
- **RAM**: 2 GB minimum, 4 GB recommended
- **Storage**: 100 MB free space
- **Screen**: 5-inch or larger recommended

### Desktop (Emulator)

- **OS**: Windows 10/11, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 10 GB free space (for emulator and system images)
- **Processor**: Intel Core i5 or equivalent (with virtualization support)
- **Graphics**: Hardware acceleration supported GPU

---

## Troubleshooting

### APK Installation Failed

**Problem**: "App not installed" error

**Solutions**:
1. Enable "Install from Unknown Sources" in device settings
2. Ensure sufficient storage space on device
3. Uninstall any previous version of the app
4. Try installing via ADB: `adb install -r rbgyanx-genius-evolved-v2.0.0.apk`

### Emulator Not Starting

**Problem**: Emulator fails to boot or crashes

**Solutions**:
1. Ensure virtualization is enabled in BIOS (Intel VT-x or AMD-V)
2. Allocate more RAM to the emulator (4 GB minimum)
3. Use a different system image (try Android 10 or 11)
4. Update graphics drivers
5. Use desktop browser (`npm run dev:desktop`) or a physical Android phone instead of emulators

### App Crashes on Launch

**Problem**: App opens then immediately closes

**Solutions**:
1. Check Android version (must be 6.0 or higher)
2. Clear app cache and data
3. Reinstall the app
4. Check device logs: `adb logcat | grep rbGyanX`

### Calculations Not Working

**Problem**: TCP/NTCP calculations fail or show errors

**Solutions**:
1. Ensure backend server is running (for development builds)
2. Check input parameters (dose, fractions, organ, etc.)
3. Review error messages in the app
4. Check app logs: `adb logcat | grep rbGyanX`

### Emulator Performance Issues

**Problem**: Emulator is slow or laggy

**Solutions**:
1. Enable hardware acceleration (HAXM for Intel, Hyper-V for Windows)
2. Allocate more CPU cores to emulator (2-4 cores)
3. Increase RAM allocation (4-8 GB)
4. Use a lighter system image (Android 9 or 10)
5. Close other resource-intensive applications

---

## Privacy & Security

### Data Storage

- **All patient data is stored locally** on your device
- **No automatic cloud uploads** - data remains on your device unless you explicitly enable cloud sync
- **No tracking or analytics** - the app does not collect usage data or send telemetry

### Permissions

The app requests the following permissions:

- **Storage**: To read/write DVH files and DICOM-RT data
- **Notifications**: To alert you of batch processing completion (optional)

**No other permissions are required.** The app does not access:
- Camera
- Microphone
- Location
- Contacts
- Phone calls
- SMS

### Network Access

- **Offline-first**: All radiobiology calculations work without internet
- **Local API only**: App connects to local backend server (127.0.0.1:3000) for advanced features
- **No external servers**: No data is sent to external servers or third parties

---

## Clinical Disclaimer

**⚠️ IMPORTANT NOTICE**

This application is a **knowledge-guided clinical decision support system (CDSS) framework** designed to assist healthcare professionals in radiation oncology treatment planning and outcome evaluation.

### No Autonomous Decisions

This app **DOES NOT make autonomous clinical decisions**. All calculations, recommendations, and outputs are **advisory only** and must be carefully reviewed by qualified human experts before implementation.

### Clinical Responsibility

**Clinical decisions are the sole responsibility of licensed clinicians** (radiation oncologists, medical physicists, and dosimetrists). This tool provides computational support based on published radiobiological models and clinical protocols, but final treatment decisions must be made by qualified healthcare professionals.

### Expert Review Required

All app outputs, including TCP/NTCP calculations, dose-response curves, therapeutic window analyses, and treatment recommendations, **must be carefully reviewed and validated by human experts** before clinical implementation.

### Intended Use

This app is intended for use by qualified healthcare professionals in radiation oncology for:

- Treatment plan evaluation and comparison
- Radiobiological modeling and outcome prediction
- Quality assurance and protocol compliance
- Clinical research and education
- Single-patient and cohort analysis

### Limitations

Radiobiological models are simplifications of complex biological processes. Model predictions have inherent uncertainties and should be interpreted with clinical judgment and institutional experience.

---

## Support & Documentation

### Documentation

- **Technical Documentation**: See `TECHNICAL_DOCUMENTATION.md`
- **Biological Endpoints**: See `BIOLOGICAL_ENDPOINTS.md`
- **Citation Guide**: See `CITATION.cff`
- **Clinical Validation**: See `CLINICAL_VALIDATION_PROTOCOL.md`

### Contact

**Primary Developer**: K. Mondal (Medical Physicist)  
**Institution**: North Bengal Medical College, Darjeeling, India  
**Copyright**: © rbGyanX Academic Team

### Development Credits

- **Foundation**: Original NTCP Analysis Pipeline (K. Mondal)
- **App Enhancement**: Claude AI (Anthropic)
- **Development Platform**: Manus AI
- **Unit Tests & QA**: Automated testing framework

---

## Version History

### v2.0.0 (Current)

- Knowledge-guided CDSS framework
- 5-tier clinical decision tree
- 10+ treatment modality databases
- Monte Carlo uncertainty quantification
- Interactive Model Selection Wizard
- Real-Time Preview
- Comparative Plan Analysis
- Benchmark Comparison
- Publication-ready export (PDF, Word, SVG at 1200 DPI)
- 2-tier QA system
- 6 statistical analysis methods
- Clinical disclaimer and privacy safeguards
- Offline-first operation
- Local-only data storage

---

## License

This software is provided for **educational and research purposes only**. Commercial use requires explicit permission from the copyright holders.

**Copyright © rbGyanX Academic Team**

---

## Acknowledgments

This app was evolved from the original NTCP Analysis Pipeline developed by K. Mondal at North Bengal Medical College, Darjeeling, India. Enhanced with Claude AI and developed on the Manus AI platform with comprehensive unit testing and quality assurance frameworks.

---

**Last Updated**: January 2, 2026  
**Version**: 2.0.0  
**Build Guide Version**: 1.0
