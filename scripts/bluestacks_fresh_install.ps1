# Fresh install rbGyanX APK on BlueStacks only (avoids "more than one device" errors).
param(
  [string]$Device = "",
  [string]$Adb = "C:\Program Files\BlueStacks_nxt\HD-Adb.exe",
  [string]$Apk = "$PSScriptRoot\..\android\app\build\outputs\apk\release\app-release.apk",
  [string]$Pkg = "com.rbgyanx.radiobiocalc",
  [int]$WaitSec = 45
)

$ErrorActionPreference = "Stop"
function Invoke-AdbQuiet([string[]]$Cmd) {
  & $Adb @Cmd 2>$null | Out-Null
}

$Apk = (Resolve-Path $Apk).Path
$BlueStacksPlayer = "C:\Program Files\BlueStacks_nxt\HD-Player.exe"

if (-not (Test-Path $Adb)) {
  throw "BlueStacks ADB not found: $Adb`nInstall BlueStacks or fix the path."
}
if (-not (Test-Path $Apk)) {
  throw "APK not found. Run: npm run build:android:gradle`nExpected: $Apk"
}

Write-Host "APK: $Apk ($([math]::Round((Get-Item $Apk).Length / 1MB, 1)) MB)"

try { Invoke-AdbQuiet @("disconnect", "emulator-5554") } catch { }
Get-Process adb -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$running = Get-Process HD-Player -ErrorAction SilentlyContinue
if (-not $running) {
  Write-Host "BlueStacks is not running. Starting HD-Player..."
  if (-not (Test-Path $BlueStacksPlayer)) {
    throw "BlueStacks not running and HD-Player.exe not found.`nStart BlueStacks manually from the Start menu, then run this script again."
  }
  Start-Process $BlueStacksPlayer
  Write-Host "Waiting ${WaitSec}s for BlueStacks to boot..."
  Start-Sleep -Seconds $WaitSec
}

function Test-AdbDevice([string]$Target) {
  $out = (& $Adb -s $Target shell echo ok 2>&1) -join ""
  return $out -match "ok"
}

function Connect-BlueStacks {
  param([string[]]$Ports)
  foreach ($port in $Ports) {
    $target = "127.0.0.1:$port"
    Write-Host "Trying $target ..."
    & $Adb connect $target 2>&1 | Write-Host
    Start-Sleep -Seconds 2
    if (Test-AdbDevice $target) {
      return $target
    }
  }
  return $null
}

if ($Device) {
  & $Adb connect $Device 2>&1 | Write-Host
  Start-Sleep -Seconds 2
  if (-not (Test-AdbDevice $Device)) {
    $Device = $null
  }
}

if (-not $Device) {
  $Device = Connect-BlueStacks @("5555", "5556", "5557")
}

if (-not $Device) {
  throw @"
Could not connect to BlueStacks ADB.

Do this:
  1. Open BlueStacks and wait until the Android home screen appears.
  2. Settings -> Advanced -> enable Android Debug Bridge (ADB).
  3. Confirm C:\ProgramData\BlueStacks_nxt\bluestacks.conf has:
       bst.enable_adb_access="1"
  4. Run again: npm run install:bluestacks

Manual check:
  & `"$Adb`" connect 127.0.0.1:5555
  & `"$Adb`" devices
"@
}

Write-Host "Using device: $Device"
Write-Host "Uninstalling old app..."
& $Adb -s $Device uninstall $Pkg 2>$null | Out-Null

Write-Host "Installing APK..."
& $Adb -s $Device install -r $Apk
if ($LASTEXITCODE -ne 0) { throw "adb install failed (exit $LASTEXITCODE)" }

$info = & $Adb -s $Device shell dumpsys package $Pkg | Select-String "versionCode|versionName"
Write-Host "`nInstalled package:"
$info | ForEach-Object { Write-Host "  $_" }

Write-Host "`nDone. Launch rbGyanX - home should show v2.2.1 (build 14)."
