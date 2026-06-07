# Install BlueStacks 5 via winget and enable ADB for automated testing.
param([switch]$SkipWinget)

$ErrorActionPreference = "Stop"

if (-not $SkipWinget) {
  Write-Host "Installing BlueStacks (~3.5 GB download). This can take 15-30+ minutes..."
  winget install --id BlueStack.BlueStacks -e --accept-package-agreements --accept-source-agreements
}

if (-not (Test-Path "C:\Program Files\BlueStacks_nxt\HD-Player.exe")) {
  throw "BlueStacks install incomplete. Run BlueStacks from Start menu once to finish setup."
}

$confDir = "C:\ProgramData\BlueStacks_nxt"
$conf = Join-Path $confDir "bluestacks.conf"
if (-not (Test-Path $confDir)) {
  New-Item -ItemType Directory -Path $confDir -Force | Out-Null
}
if (-not (Test-Path $conf)) {
  Set-Content $conf 'bst.enable_adb_access="1"'
} elseif ((Get-Content $conf -Raw) -notmatch 'bst\.enable_adb_access="1"') {
  Add-Content $conf 'bst.enable_adb_access="1"'
}

Write-Host "Starting BlueStacks (first boot may take 2-3 minutes)..."
Start-Process "C:\Program Files\BlueStacks_nxt\HD-Player.exe"
Write-Host ""
Write-Host "IMPORTANT: Default BlueStacks (Android 7, 32-bit) cannot run this app."
Write-Host "Open BlueStacks Multi-Instance Manager -> New instance -> Android 11 (64-bit) -> start that instance."
Write-Host "Enable ADB: Settings -> Advanced -> Android Debug Bridge -> ON (restart instance)."
Write-Host ""
Write-Host "Wait for Android home screen, then run: npm run test:bluestacks:dvh"
