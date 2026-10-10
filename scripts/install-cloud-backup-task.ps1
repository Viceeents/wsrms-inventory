$ErrorActionPreference = 'Stop'
$backupRepo = Split-Path -Parent $PSScriptRoot
$backupRunner = Join-Path $PSScriptRoot 'run-cloud-backup.ps1'
$backupUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$backupAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$backupRunner`"" -WorkingDirectory $backupRepo
$backupTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddHours(1) -RepetitionInterval (New-TimeSpan -Hours 1)
$backupLogonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $backupUser
$backupPrincipal = New-ScheduledTaskPrincipal -UserId $backupUser -LogonType Interactive -RunLevel Limited
$backupSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'WSRMS Cloud Database Backup' -Action $backupAction -Trigger @($backupTrigger, $backupLogonTrigger) -Principal $backupPrincipal -Settings $backupSettings -Description 'Synchronize the live WSRMS database to its configured separate backup database hourly and at sign-in.' -Force | Select-Object TaskName,State
