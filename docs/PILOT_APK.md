# rbGyanX Pilot APK (legacy)

**Prefer [MOBILE_APP.md](./MOBILE_APP.md)** — offline calculations on phone, export server only for PDF/DOCX, Android + iOS.

The pilot build still exists for backwards compatibility:

```powershell
npm run build:pilot-apk
# or .\scripts\build-pilot-apk.ps1
```

Pilot APK requires **Home → Pilot: set API server URL** for **all** API features (DVH session, calculations, reports). Use only if you intentionally keep the full server on a PC.

For remote testers on Android/iOS, use **rbGyanX Mobile** + ngrok as described in MOBILE_APP.md.
