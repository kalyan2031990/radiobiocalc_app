# Smoke-test rbGyanX Mobile APK on BlueStacks via HD-Adb.
param(
  [string]$Device = "127.0.0.1:5555",
  [string]$Adb = "C:\Program Files\BlueStacks_nxt\HD-Adb.exe",
  [string]$Apk = "$PSScriptRoot\..\android\app\build\outputs\apk\release\app-release.apk",
  [string]$Package = "com.rbgyanx.radiobiocalc",
  [int]$TimeoutSec = 120
)

$ErrorActionPreference = "Continue"
$report = [ordered]@{
  device = $Device
  apk = $Apk
  installed = $false
  launched = $false
  disclaimerAccepted = $false
  bootMessage = $null
  homeOfflineBanner = $false
  selfTestPassed = $false
  errors = @()
  logSnippets = @()
}

function Invoke-Adb([string[]]$Args) {
  $out = & $Adb -s $Device @Args 2>&1
  return ($out | Out-String).Trim()
}

function Get-UiXml {
  Invoke-Adb @("shell", "uiautomator", "dump", "/sdcard/rbgyanx_ui.xml") | Out-Null
  return Invoke-Adb @("shell", "cat", "/sdcard/rbgyanx_ui.xml")
}

function Tap-Text([string]$Xml, [string]$Text) {
  $pattern = [regex]::Escape($Text)
  $m = [regex]::Match($Xml, "text=`"$pattern`"[^>]*bounds=`"\[(\d+),(\d+)\]\[(\d+),(\d+)\]`"")
  if (-not $m.Success) {
    $m = [regex]::Match($Xml, "content-desc=`"$pattern`"[^>]*bounds=`"\[(\d+),(\d+)\]\[(\d+),(\d+)\]`"")
  }
  if ($m.Success) {
    $x = [int](($m.Groups[1].Value + $m.Groups[3].Value) / 2)
    $y = [int](($m.Groups[2].Value + $m.Groups[4].Value) / 2)
    Invoke-Adb @("shell", "input", "tap", "$x", "$y") | Out-Null
    return $true
  }
  return $false
}

if (-not (Test-Path $Adb)) {
  $report.errors += "HD-Adb not found at $Adb"
  $report | ConvertTo-Json -Depth 5
  exit 1
}

if (-not (Test-Path $Apk)) {
  $report.errors += "APK not found at $Apk"
  $report | ConvertTo-Json -Depth 5
  exit 1
}

$online = $false
for ($i = 0; $i -lt 10; $i++) {
  Invoke-Adb @("connect", $Device) | Out-Null
  Start-Sleep -Seconds 2
  $devices = Invoke-Adb @("devices")
  if ($devices -match [regex]::Escape($Device) + "\s+device") {
    $online = $true
    break
  }
}
if (-not $online) {
  $report.errors += "Device $Device not online. Enable BlueStacks Settings > Advanced > Android Debug Bridge, then restart BlueStacks."
  $report | ConvertTo-Json -Depth 5
  exit 1
}

$installOut = Invoke-Adb @("install", "-r", $Apk)
$report.installed = $installOut -match "Success"
if (-not $report.installed) {
  $report.errors += "Install failed: $installOut"
}

Invoke-Adb @("logcat", "-c") | Out-Null
$launchOut = Invoke-Adb @(
  "shell", "monkey", "-p", $Package, "-c", "android.intent.category.LAUNCHER", "1"
)
$report.launched = $LASTEXITCODE -eq 0
if (-not $report.launched) {
  $report.errors += "Launch failed: $launchOut"
}

$deadline = (Get-Date).AddSeconds($TimeoutSec)
while ((Get-Date) -lt $deadline) {
  $xml = Get-UiXml
  if ($xml -match "Loading API settings") {
    $report.bootMessage = "Loading API settings"
  }
  if ($xml -match "Starting offline engine") {
    $report.bootMessage = "Starting offline engine"
  }
  if ($xml -match "I Understand and Accept") {
    if (Tap-Text $xml "I Understand and Accept") {
      $report.disclaimerAccepted = $true
      Start-Sleep -Seconds 2
    }
  }
  if ($xml -match "Self-test passed") {
    $report.selfTestPassed = $true
  }
  if ($xml -match "Offline .{0,4} TCP/NTCP/DVH run on this device" -or $xml -match "TCP/NTCP/DVH run on this device") {
    $report.homeOfflineBanner = $true
  }
  if ($report.homeOfflineBanner -and $report.disclaimerAccepted) {
    break
  }
  Start-Sleep -Seconds 3
}

$log = Invoke-Adb @("logcat", "-d", "-t", "400")
$interesting = $log -split "`n" | Where-Object {
  $_ -match "ApiClientProvider|offline engine|Self-test|ReactNativeJS|rbgyanx|FATAL|AndroidRuntime"
}
$report.logSnippets = @($interesting | Select-Object -Last 30)

if (-not $report.disclaimerAccepted) { $report.errors += "Disclaimer not accepted (UI tap failed or modal missing)." }
if ($report.bootMessage -eq "Loading API settings") { $report.errors += "Stuck in online/pilot boot path." }
if (-not $report.homeOfflineBanner) { $report.errors += "Home offline banner not detected." }
if (-not $report.selfTestPassed) { $report.errors += "Self-test passed UI not detected (may still have run)." }

$report.ok = $report.installed -and $report.launched -and $report.disclaimerAccepted -and $report.homeOfflineBanner -and ($report.bootMessage -ne "Loading API settings")

$report | ConvertTo-Json -Depth 5
if ($report.ok) { exit 0 } else { exit 2 }
