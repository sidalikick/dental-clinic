# Script to open port 5000 in Windows Firewall
$RuleName = "DentalClinicServer"
$Port = 5000

Write-Host "Checking for Firewall Rule: $RuleName..." -ForegroundColor Cyan

$ExistingRule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

if ($null -eq $ExistingRule) {
    Write-Host "Rule not found. Creating rule to allow port $Port..." -ForegroundColor Yellow
    try {
        New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -LocalPort $Port -Protocol TCP -Action Allow -Description "Allow inbound traffic for Dental Clinic Server" -ErrorAction Stop
        Write-Host "Successfully created firewall rule." -ForegroundColor Green
    } catch {
        Write-Host "ERROR: Access Denied." -ForegroundColor Red
        Write-Host "Please right-click on this script (or PowerShell) and select 'Run as Administrator'." -ForegroundColor White
        Write-Host "Or run this command in an Admin CMD/PowerShell:" -ForegroundColor White
        Write-Host "netsh advfirewall firewall add rule name=`"$RuleName`" dir=in action=allow protocol=TCP localport=$Port" -ForegroundColor Green
        exit 1
    }
} else {
    Write-Host "Firewall rule already exists." -ForegroundColor Green
}
