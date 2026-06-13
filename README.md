# rbGyanX Mobile (radiobiocalc_app)

Expo / React Native app for **DVH-based TCP, NTCP, and therapeutic-window** evaluation. Calculations run on-device for the offline mobile build.

## Quick start

```bash
npm install
npm run dev:mobile
```

## Tests

```bash
npm run test:ci                    # unit + engine smoke (no external data)
npm run test:real-data:full        # full radbiocalc_input report
npm run test:pilot-clinical        # pilot PTV+OAR+clinical validation
npm run test:release-validation    # release gate + device smoke
```

## Build APK (local)

See [docs/LOCAL_ANDROID_BUILD.md](docs/LOCAL_ANDROID_BUILD.md).

```bash
npm run build:android:release
npm run install:phone
```

## Docs

See [docs/VALIDATION_AND_RELEASE.md](docs/VALIDATION_AND_RELEASE.md) and [samples/README.md](samples/README.md) for the bundled sample DVH + reference PDF.

| Topic | File |
|-------|------|
| User guide | [docs/MOBILE_USER_GUIDE.md](docs/MOBILE_USER_GUIDE.md) |
| Validation | [docs/VALIDATION_AND_RELEASE.md](docs/VALIDATION_AND_RELEASE.md) |
| Reports archive | [docs/validation/](docs/validation/) |
