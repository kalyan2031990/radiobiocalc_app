# Install Android SDK via Android Studio (winget).
# Run in elevated PowerShell if winget prompts for admin.

$ErrorActionPreference = "Stop"
Write-Host "=== rbGyanX - Android SDK setup ===" -ForegroundColor Cyan

$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$adb = Join-Path $sdkRoot "platform-tools\adb.exe"

if (Test-Path $adb) {
  Write-Host "Android SDK already present at $sdkRoot"
} else {
  Write-Host "Installing Android Studio (includes SDK manager)..."
  winget install -e --id Google.AndroidStudio --accept-package-agreements --accept-source-agreements
}

if (-not (Test-Path $sdkRoot)) {
  Write-Host "Open Android Studio once, then SDK Manager: install SDK Platform 35 and Build-Tools 35."
  Write-Host "Default SDK path: $sdkRoot"
  exit 0
}

$env:ANDROID_HOME = $sdkRoot
Write-Host "ANDROID_HOME=$sdkRoot"
Write-Host "Add to PowerShell profile:"
Write-Host '$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"'
Write-Host '$env:Path += ";$env:ANDROID_HOME\platform-tools"'

if (Test-Path $adb) {
  & $adb version
  Write-Host "SDK OK - run: npm run build:android:local" -ForegroundColor Green
} else {
  Write-Host "SDK folder exists but platform-tools missing - open Android Studio SDK Manager." -ForegroundColor Yellow
}
