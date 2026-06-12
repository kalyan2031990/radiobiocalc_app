# rbGyanX on Windows desktop (browser) — full DVH file picker + rb X XAI.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Starting rbGyanX Desktop (browser at http://localhost:8081)"
Write-Host "Import plan DVH -> multi-select PTV + OAR -> setup -> results -> rb X tab."
Write-Host "Automated tests: npm run test:automation"
Write-Host "Press Ctrl+C to stop."
Write-Host ""

$env:EXPO_PUBLIC_OFFLINE_BUILD = "1"
npm run dev:desktop
