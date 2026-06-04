# rbGyanX Mobile (radiobiocalc_app)

Expo / React Native app for **DVH-based TCP, NTCP, and therapeutic-window** evaluation. Calculations run on-device for the offline mobile build; PDF/DOCX export can use an optional API server.

## Quick start

```bash
git clone https://github.com/kalyan2031990/radiobiocalc_app.git
cd radiobiocalc_app
npm install
npm run dev:mobile          # Expo dev client
npm run start:server        # optional export API (port 3000)
```

## Tests (CI — no external DVH folders required)

```bash
npm run test:ci
```

Optional integration scripts need `RBGYANX_TEST_DATA` pointing at anonymised Eclipse/CSV DVH files. For legacy filenames, set `RBGYANX_HN_DEMO_PREFIX` (default `DEMO`).

## Mobile APK (EAS)

See [docs/MOBILE_APP.md](docs/MOBILE_APP.md). Android: `npm run build:mobile-apk`.

## Docs

| Topic | File |
|-------|------|
| Mobile offline build | [docs/MOBILE_APP.md](docs/MOBILE_APP.md) |
| Gap audit vs desktop | [docs/GAP_AUDIT.md](docs/GAP_AUDIT.md) |
| Pilot / legacy APK | [docs/PILOT_APK.md](docs/PILOT_APK.md) |

## License

See repository license file if present; otherwise contact the maintainer.
