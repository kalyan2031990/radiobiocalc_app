# Allow inbound TCP 3000 for rbGyanX API (private networks). Run as Administrator.
$ruleName = "rbGyanX API port 3000"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Firewall rule already exists: $ruleName"
} else {
  New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 3000 `
    -Action Allow `
    -Profile Private
  Write-Host "Created firewall rule: $ruleName (Private profile)"
}
Write-Host ""
Write-Host "Your LAN URLs (use on phone Pilot API screen):"
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
  $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown"
} | ForEach-Object {
  Write-Host "  http://$($_.IPAddress):3000"
}
