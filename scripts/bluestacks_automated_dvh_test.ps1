# Full automated DVH test on BlueStacks: install APK, accept disclaimer, parse bundled + Downloads DVH.
param(
  [string]$Device = "",
  [string]$Adb = "C:\Program Files\BlueStacks_nxt\HD-Adb.exe",
  [string]$Apk = "$PSScriptRoot\..\android\app\build\outputs\apk\release\app-release.apk",
  [string]$Pkg = "com.rbgyanx.radiobiocalc",
  [string]$TestDataRoot = "C:\Users\Sampa\OneDrive\Desktop\input_folders\rbgyanx_test_data",
  [int]$BootWaitSec = 60,
  [int]$UiTimeoutSec = 120
)

$ErrorActionPreference = "Continue"
$report = [ordered]@{
  bluestacksInstalled = (Test-Path "C:\Program Files\BlueStacks_nxt\HD-Player.exe")
  device = $null
  apkInstalled = $false
  versionCode = $null
  disclaimerAccepted = $false
  homeOk = $false
  bundledParseOk = $false
  downloadsParseOk = $false
  setupOk = $false
  appAlive = $false
  startupCrash = $false
  errors = @()
  logSnippets = @()
}

function Invoke-Adb([string]$Target, [string[]]$Cmd) {
  if ($Target) {
    return (& $Adb -s $Target @Cmd 2>&1 | Out-String).Trim()
  }
  return (& $Adb @Cmd 2>&1 | Out-String).Trim()
}

function Enable-BlueStacksAdb {
  $conf = "C:\ProgramData\BlueStacks_nxt\bluestacks.conf"
  if (-not (Test-Path $conf)) { return }
  $text = Get-Content $conf -Raw
  if ($text -notmatch 'bst\.enable_adb_access="1"') {
    Add-Content $conf "`nbst.enable_adb_access=`"1`""
    Write-Host "Enabled ADB in bluestacks.conf (restart BlueStacks if connect fails)."
  }
}

function Connect-Device {
  foreach ($port in @("5555", "5556", "5557")) {
    $target = "127.0.0.1:$port"
    Invoke-Adb "" @("connect", $target) | Out-Null
    Start-Sleep -Seconds 2
    $out = Invoke-Adb $target @("shell", "echo", "ok")
    if ($out -match "ok") { return $target }
  }
  return $null
}

function Get-UiXml([string]$Target) {
  Invoke-Adb $Target @("shell", "uiautomator", "dump", "/sdcard/rb_auto_ui.xml") | Out-Null
  Start-Sleep -Milliseconds 400
  return (Invoke-Adb $Target @("shell", "cat", "/sdcard/rb_auto_ui.xml")) -join ""
}

function Get-UiNodes([string]$Xml) {
  $nodes = @()
  foreach ($m in [regex]::Matches($Xml, "<node\b[^>]+>")) {
    $tag = $m.Value
    $boundsM = [regex]::Match($tag, 'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"')
    if (-not $boundsM.Success) { continue }
    $textM = [regex]::Match($tag, 'text="([^"]*)"')
    $descM = [regex]::Match($tag, 'content-desc="([^"]*)"')
    $idM = [regex]::Match($tag, 'resource-id="([^"]*)"')
    $nodes += [pscustomobject]@{
      Text = if ($textM.Success) { $textM.Groups[1].Value } else { "" }
      Desc = if ($descM.Success) { $descM.Groups[1].Value } else { "" }
      Id = if ($idM.Success) { $idM.Groups[1].Value } else { "" }
      Clickable = $tag -match 'clickable="true"'
      X1 = [int]$boundsM.Groups[1].Value
      Y1 = [int]$boundsM.Groups[2].Value
      X2 = [int]$boundsM.Groups[3].Value
      Y2 = [int]$boundsM.Groups[4].Value
    }
  }
  return $nodes
}

function Tap-Node($Node, [string]$Target) {
  $x = [int](($Node.X1 + $Node.X2) / 2)
  $y = [int](($Node.Y1 + $Node.Y2) / 2)
  Invoke-Adb $Target @("shell", "input", "tap", "$x", "$y") | Out-Null
}

function Find-TapTarget([string]$Xml, [string]$Label) {
  $nodes = Get-UiNodes $Xml
  $labelLower = $Label.ToLowerInvariant()

  foreach ($n in $nodes) {
    if ($n.Id -match "disclaimer-accept") { return $n }
  }
  foreach ($n in $nodes) {
    $hay = "$($n.Text) $($n.Desc)".ToLowerInvariant()
    if ($hay.Contains($labelLower) -and $n.Clickable) { return $n }
  }
  foreach ($n in $nodes) {
    $hay = "$($n.Text) $($n.Desc)".ToLowerInvariant()
    if ($hay.Contains($labelLower)) { return $n }
  }
  return $null
}

function Tap-Label([string]$Target, [string]$Label, [string]$Xml = "") {
  if (-not $Xml) { $Xml = Get-UiXml $Target }
  $node = Find-TapTarget $Xml $Label
  if ($node) {
    Tap-Node $node $Target
    return $true
  }
  return $false
}

function Wait-For-Label([string]$Target, [string]$Label, [int]$TimeoutSec) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $xml = Get-UiXml $Target
    if ($xml -match [regex]::Escape($Label) -or $xml -match "disclaimer-accept") {
      if (Tap-Label $Target $Label $xml) {
        return $true
      }
      # Modal may need scroll — swipe up to reveal bottom button on small screens
      Invoke-Adb $Target @("shell", "input", "swipe", "500", "900", "500", "300", "300") | Out-Null
      Start-Sleep -Seconds 1
      $xml2 = Get-UiXml $Target
      if (Tap-Label $Target $Label $xml2) { return $true }
    }
    Start-Sleep -Seconds 3
  }
  return $false
}

function App-Alive([string]$Target) {
  $p = Invoke-Adb $Target @("shell", "pidof", $Pkg)
  if (-not [string]::IsNullOrWhiteSpace($p)) { return $true }
  $ps = Invoke-Adb $Target @("shell", "ps", "-A")
  return $ps -match [regex]::Escape($Pkg)
}

function Save-DebugArtifacts([string]$Target, [string]$Reason) {
  $dir = Join-Path $PSScriptRoot "debug"
  New-Item -ItemType Directory -Path $dir -Force | Out-Null
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $ui = Get-UiXml $Target
  Set-Content (Join-Path $dir "ui-$stamp.txt") $ui
  $log = Invoke-Adb $Target @("logcat", "-d", "-t", "300")
  Set-Content (Join-Path $dir "logcat-$stamp.txt") $log
  Write-Host "Saved debug UI/logcat ($Reason) to scripts/debug/"
}

# --- BlueStacks must exist ---
if (-not $report.bluestacksInstalled) {
  $report.errors += "BlueStacks not installed. Run: winget install BlueStack.BlueStacks"
  $report | ConvertTo-Json -Depth 4
  exit 1
}

if (-not (Test-Path $Apk)) {
  $report.errors += "APK missing. Run: npm run build:android:gradle"
  $report | ConvertTo-Json -Depth 4
  exit 1
}

Enable-BlueStacksAdb

$player = Get-Process HD-Player -ErrorAction SilentlyContinue
if (-not $player) {
  Write-Host "Starting BlueStacks..."
  Start-Process "C:\Program Files\BlueStacks_nxt\HD-Player.exe"
  Start-Sleep -Seconds $BootWaitSec
}

if (-not $Device) {
  $Device = Connect-Device
}
$report.device = $Device
if (-not $Device) {
  $report.errors += "ADB not reachable. Open BlueStacks, wait for Android home, enable ADB in Settings > Advanced."
  $report | ConvertTo-Json -Depth 4
  exit 2
}

Write-Host "Device: $Device"

# Push test DVHs
if (Test-Path $TestDataRoot) {
  Invoke-Adb $Device @("shell", "mkdir", "-p", "/sdcard/Download/rbgyanx_test") | Out-Null
  $ptv = Join-Path $TestDataRoot "PTV_data\KASTOORI_PTV70.txt"
  $oar = Join-Path $TestDataRoot "HN57_OAR_Eclipse\KASTOORI_COM_PRTD.txt"
  if (Test-Path $ptv) { Invoke-Adb $Device @("push", $ptv, "/sdcard/Download/rbgyanx_test/KASTOORI_PTV70.txt") | Out-Null }
  if (Test-Path $oar) { Invoke-Adb $Device @("push", $oar, "/sdcard/Download/rbgyanx_test/KASTOORI_COM_PRTD.txt") | Out-Null }
}

Invoke-Adb $Device @("uninstall", $Pkg) | Out-Null
Write-Host "Installing APK..."
$installOut = Invoke-Adb $Device @("install", "-r", (Resolve-Path $Apk).Path)
if ($installOut -notmatch "Success") {
  $report.errors += "adb install failed: $installOut"
  $report | ConvertTo-Json -Depth 4
  exit 3
}
$report.apkInstalled = $true
$ver = Invoke-Adb $Device @("shell", "dumpsys", "package", $Pkg)
$report.versionCode = if ($ver -match "versionCode=(\d+)") { $Matches[1] } else { $null }

Invoke-Adb $Device @("shell", "pm", "clear", $Pkg) | Out-Null
Invoke-Adb $Device @("logcat", "-c") | Out-Null
Invoke-Adb $Device @("shell", "monkey", "-p", $Pkg, "-c", "android.intent.category.LAUNCHER", "1") | Out-Null
Start-Sleep -Seconds 8
$bootLog = Invoke-Adb $Device @("logcat", "-d", "-t", "80")
if ($bootLog -match "dl_unwind_find_exidx|DefaultNewArchitectureEntryPoint") {
  $report.startupCrash = $true
  $report.errors += "App crashes on launch on this BlueStacks instance (default winget install is Android 7 x86). Create an Android 11+ 64-bit instance in BlueStacks Multi-Instance Manager, enable ADB, then re-run. Physical ARM phones are unaffected."
  Save-DebugArtifacts $Device "startup-crash"
  $report.logSnippets += ($bootLog -split "`n" | Select-String "FATAL|dl_unwind|SoLoader" | Select-Object -Last 8)
  $report | ConvertTo-Json -Depth 5
  exit 5
}

Write-Host "Waiting for disclaimer (up to ${UiTimeoutSec}s)..."
if (Wait-For-Label $Device "I Understand and Accept" $UiTimeoutSec) {
  $report.disclaimerAccepted = $true
  Start-Sleep -Seconds 6
} else {
  $report.errors += "Could not tap disclaimer accept"
  Save-DebugArtifacts $Device "disclaimer"
}

# Wait for home after disclaimer / boot
$homeDeadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $homeDeadline) {
  $xml = Get-UiXml $Device
  if ($xml -match "Import plan DVH") {
    $report.homeOk = $true
    break
  }
  if ($xml -match "ALLOW") {
    Tap-Label $Device "ALLOW" $xml | Out-Null
    Start-Sleep -Seconds 2
  }
  $report.appAlive = App-Alive $Device
  if (-not $report.appAlive) { break }
  Start-Sleep -Seconds 3
}

$report.appAlive = App-Alive $Device
if (-not $report.homeOk -and $report.appAlive) {
  Tap-Label $Device "Import plan DVH" | Out-Null
  Start-Sleep -Seconds 2
  $xml = Get-UiXml $Device
  if ($xml -match "Import plan DVH|bundled KASTOORI|Download") { $report.homeOk = $true }
}

Tap-Label $Device "Import plan DVH" | Out-Null
Start-Sleep -Seconds 4
Invoke-Adb $Device @("logcat", "-c") | Out-Null

# 1) Bundled parse (no filesystem)
Write-Host "Running bundled DVH parse..."
if (Wait-For-Label $Device "Test: parse bundled KASTOORI sample" 30) {
  Start-Sleep -Seconds 12
  $xml2 = Get-UiXml $Device
  if ($xml2 -match "structure\(s\)|Continue to setup") { $report.bundledParseOk = $true }
  $report.appAlive = App-Alive $Device
  if (-not $report.appAlive) {
    $report.logSnippets += (Invoke-Adb $Device @("logcat", "-d", "-t", "200") -split "`n" | Select-String "FATAL|ReactNativeJS|signal|died" | Select-Object -Last 15)
    Save-DebugArtifacts $Device "bundled-crash"
  }
} else {
  $report.errors += "Bundled test button not found"
  Save-DebugArtifacts $Device "bundled-missing"
}

# 2) Downloads pair (if app still alive)
if ($report.appAlive) {
  Invoke-Adb $Device @("shell", "monkey", "-p", $Pkg, "-c", "android.intent.category.LAUNCHER", "1") | Out-Null
  Start-Sleep -Seconds 4
  Tap-Label $Device "Import plan DVH" | Out-Null
  Start-Sleep -Seconds 3
  if (Tap-Label $Device "Load Kastoori PTV + OAR from Downloads") {
    Start-Sleep -Seconds 15
    $xml3 = Get-UiXml $Device
    if ($xml3 -match "2 structure\(s\)|structure\(s\)|Continue to setup") { $report.downloadsParseOk = $true }
    $report.appAlive = App-Alive $Device
  }
}

if ($report.appAlive -and ($report.bundledParseOk -or $report.downloadsParseOk)) {
  Tap-Label $Device "Continue to setup" | Out-Null
  Start-Sleep -Seconds 8
  $xml4 = Get-UiXml $Device
  if ($xml4 -match "Calculation|Fraction|Structure|Setup|TCP|NTCP") { $report.setupOk = $true }
  $report.appAlive = App-Alive $Device
}

if (-not $report.disclaimerAccepted) { $report.errors += "Disclaimer not accepted" }
if (-not $report.homeOk) { $report.errors += "Home screen not reached" }
if (-not $report.bundledParseOk) { $report.errors += "Bundled DVH parse failed or app crashed" }
if (-not $report.appAlive) { $report.errors += "App process died during test" }

if (-not $report.ok -and $report.logSnippets.Count -eq 0) {
  $report.logSnippets += (Invoke-Adb $Device @("logcat", "-d", "-t", "150") -split "`n" | Select-String "FATAL|ReactNativeJS|AndroidRuntime|rbgyanx" | Select-Object -Last 12)
}

$report.ok = $report.bundledParseOk -and $report.appAlive
$report | ConvertTo-Json -Depth 5
if ($report.ok) { exit 0 } else { exit 4 }
