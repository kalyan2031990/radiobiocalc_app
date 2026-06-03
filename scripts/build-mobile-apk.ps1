# Build rbGyanX Mobile APK (offline calc + export server for PDF/DOCX).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "rbGyanX Mobile APK (EAS profile: offline)" -ForegroundColor Cyan
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

Write-Host "Starting cloud build (APK, ~10-20 min)..." -ForegroundColor Green
eas build -p android --profile offline --non-interactive

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Done. Download APK from the URL above or expo.dev -> Builds." -ForegroundColor Green
  Write-Host "See docs/MOBILE_APP.md for ngrok + remote testers." -ForegroundColor Green
}
