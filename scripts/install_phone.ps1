# Install rbGyanX release APK on a USB-connected Android phone via SDK adb.
param(
  [string]$Apk = "$PSScriptRoot\..\android\app\build\outputs\apk\release\app-release.apk",
  [string]$Pkg = "com.rbgyanx.radiobiocalc"
)

$ErrorActionPreference = "Stop"
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
  throw "adb not found at $adb`nRun scripts/install-android-sdk.ps1 or install Android Studio platform-tools."
}
if (-not (Test-Path $Apk)) {
  throw "APK missing. Run: npm run build:android:release`nExpected: $Apk"
}

$devices = & $adb devices | Select-String "device$"
if (-not $devices) {
  throw "No phone detected. Enable USB debugging, connect cable, accept the RSA prompt on the phone."
}

Write-Host "APK: $Apk ($([math]::Round((Get-Item $Apk).Length / 1MB, 1)) MB)"
& $adb uninstall $Pkg 2>$null | Out-Null
& $adb install -r (Resolve-Path $Apk).Path
if ($LASTEXITCODE -ne 0) { throw "adb install failed (exit $LASTEXITCODE)" }

$ver = & $adb shell dumpsys package $Pkg | Select-String "versionCode|versionName"
Write-Host $ver
Write-Host "Done. Open rbGyanX Mobile on the phone."
