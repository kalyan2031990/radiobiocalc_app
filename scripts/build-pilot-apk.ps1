# Build rbGyanX pilot APK via EAS (download link when finished).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "rbGyanX pilot APK build (EAS profile: pilot)" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command eas -ErrorAction SilentlyContinue)) {
  Write-Host "Installing eas-cli..." -ForegroundColor Yellow
  npm install -g eas-cli
}

$whoami = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run: eas login" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path "eas.json")) {
  Write-Host "Missing eas.json" -ForegroundColor Red
  exit 1
}

$configured = Select-String -Path "app.config.ts" -Pattern 'projectId:\s*process\.env' -Quiet
if ($configured) {
  if (-not (Test-Path ".eas-project") -and -not ($env:EAS_PROJECT_ID)) {
    Write-Host "First time: linking Expo project (eas build:configure)..." -ForegroundColor Yellow
    eas build:configure
  }
}

Write-Host "Starting cloud build (APK, ~10-20 min)..." -ForegroundColor Green
eas build -p android --profile pilot --non-interactive

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Done. Download APK from the URL above or expo.dev -> Builds." -ForegroundColor Green
  Write-Host "Share with testers + API URL. See docs/PILOT_APK.md" -ForegroundColor Green
}
