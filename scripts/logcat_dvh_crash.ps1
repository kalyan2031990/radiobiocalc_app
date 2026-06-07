# Capture Android log when DVH import crashes (BlueStacks only).
param(
  [string]$Device = "127.0.0.1:5555",
  [string]$Adb = "C:\Program Files\BlueStacks_nxt\HD-Adb.exe"
)

if (-not (Test-Path $Adb)) {
  $Adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
}

& $Adb disconnect emulator-5554 2>$null | Out-Null
& $Adb connect $Device | Out-Null
Start-Sleep -Seconds 1

$check = (& $Adb -s $Device shell echo ok 2>&1) -join ""
if ($check -notmatch "ok") {
  Write-Host "ERROR: BlueStacks not reachable at $Device"
  exit 1
}

& $Adb -s $Device logcat -c
Write-Host "Log cleared on $Device"
Write-Host "Reproduce the crash in BlueStacks, then press Enter..."
Read-Host

$lines = & $Adb -s $Device logcat -d -t 800
$patterns = @(
  "FATAL EXCEPTION",
  "AndroidRuntime",
  "ReactNativeJS",
  "rbgyanx",
  "radiobiocalc",
  "FileSystem",
  "DocumentPicker",
  "Hermes",
  "signal 11",
  "SIGSEGV",
  "has died",
  "DVH import"
)

$hits = $lines | Select-String -Pattern ($patterns -join "|")
if ($hits) {
  $hits | Select-Object -Last 80
} else {
  Write-Host "No crash lines matched. Last 40 log lines:"
  $lines | Select-Object -Last 40
}
