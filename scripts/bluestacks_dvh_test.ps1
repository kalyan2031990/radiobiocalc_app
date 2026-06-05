param(
  [string]$Device = "127.0.0.1:5555",
  [string]$Adb = "C:\Program Files\BlueStacks_nxt\HD-Adb.exe",
  [string]$Pkg = "com.rbgyanx.radiobiocalc"
)

$report = [ordered]@{
  device = $Device
  disclaimerAccepted = $false
  homeOk = $false
  selfTestOk = $false
  dvhScreenOk = $false
  dvhFilesOnDevice = $false
  errors = @()
}

function Invoke-AdbGlobal([string[]]$Cmd) {
  return (& $Adb @Cmd 2>&1 | Out-String).Trim()
}

function Invoke-Adb([string[]]$Cmd) {
  return (& $Adb -s $Device @Cmd 2>&1 | Out-String).Trim()
}

function Get-UiXml {
  Invoke-Adb @("shell", "uiautomator", "dump", "/sdcard/rb_ui.xml") | Out-Null
  return Invoke-Adb @("shell", "cat", "/sdcard/rb_ui.xml")
}

function Tap-Text([string]$Xml, [string]$Text) {
  $esc = [regex]::Escape($Text)
  $m = [regex]::Match($Xml, "text=`"$esc`"[^>]*bounds=`"\[(\d+),(\d+)\]\[(\d+),(\d+)\]`"")
  if (-not $m.Success) { return $false }
  $x = [int](([int]$m.Groups[1].Value + [int]$m.Groups[3].Value) / 2)
  $y = [int](([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2)
  Invoke-Adb @("shell", "input", "tap", "$x", "$y") | Out-Null
  return $true
}

for ($try = 0; $try -lt 8; $try++) {
  Invoke-AdbGlobal @("connect", $Device) | Out-Null
  Start-Sleep -Seconds 2
  $probe = Invoke-Adb @("shell", "getprop", "ro.product.model")
  if ($probe -and $probe -notmatch "error|offline|not found") {
    break
  }
  if ($try -eq 7) {
    $report.errors += "Device offline ($Device)"
    $report | ConvertTo-Json -Depth 4
    exit 1
  }
}

$ls = Invoke-Adb @("shell", "ls", "/sdcard/Download/rbgyanx_test/")
$report.dvhFilesOnDevice = $ls -match "KASTOORI"

Invoke-Adb @("shell", "pm", "clear", $Pkg) | Out-Null
Invoke-Adb @("shell", "monkey", "-p", $Pkg, "-c", "android.intent.category.LAUNCHER", "1") | Out-Null
Start-Sleep -Seconds 12

for ($i = 0; $i -lt 14; $i++) {
  Invoke-Adb @("shell", "input", "swipe", "450", "1200", "450", "200", "280") | Out-Null
  Start-Sleep -Milliseconds 200
}

$xml = Get-UiXml
if (Tap-Text $xml "I Understand and Accept") {
  $report.disclaimerAccepted = $true
  Start-Sleep -Seconds 10
}

$xml = Get-UiXml
if ($xml -match "TCP/NTCP/DVH run on this device") { $report.homeOk = $true }
if ($xml -match "Self-test passed") { $report.selfTestOk = $true }

if (Tap-Text $xml "Import plan DVH") {
  Start-Sleep -Seconds 4
  $xml2 = Get-UiXml
  if ($xml2 -match "Tap to select file") { $report.dvhScreenOk = $true }
}

if (-not $report.disclaimerAccepted) { $report.errors += "Disclaimer accept failed" }
if (-not $report.homeOk) { $report.errors += "Home offline banner not seen" }
if (-not $report.dvhScreenOk) { $report.errors += "DVH import screen not reached" }

$report.ok = $report.disclaimerAccepted -and $report.homeOk -and $report.dvhScreenOk
$report | ConvertTo-Json -Depth 4
if ($report.ok) { exit 0 } else { exit 2 }
