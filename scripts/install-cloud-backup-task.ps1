param(
    [ValidatePattern('^([01][0-9]|2[0-3]):[0-5][0-9]$')]
    [string]$NightlyTime = '02:00'
)
$ErrorActionPreference = 'Stop'
$backupRepo = Split-Path -Parent $PSScriptRoot
$backupRunner = Join-Path $PSScriptRoot 'run-cloud-backup.ps1'
$backupUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$backupAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$backupRunner`"" -WorkingDirectory $backupRepo
$backupZone = [TimeZoneInfo]::FindSystemTimeZoneById('Singapore Standard Time')
$backupToday = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $backupZone).ToString('yyyy-MM-dd')
$backupTrigger = New-ScheduledTaskTrigger -Daily -At $NightlyTime
# An explicit UTC+08 boundary keeps the Philippine schedule on other host time zones.
$backupTrigger.StartBoundary = "${backupToday}T${NightlyTime}:00+08:00"
$backupPrincipal = New-ScheduledTaskPrincipal -UserId $backupUser -LogonType Interactive -RunLevel Limited
$backupSettings = New-ScheduledTaskSettingsSet -WakeToRun -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'WSRMS Cloud Database Backup' -Action $backupAction -Trigger $backupTrigger -Principal $backupPrincipal -Settings $backupSettings -Description "Synchronize the live WSRMS database to its separate backup database nightly at $NightlyTime Philippine time (UTC+08:00)." -Force | Select-Object TaskName,State
