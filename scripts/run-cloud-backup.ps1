$ErrorActionPreference = 'Stop'
$backupRepo = Split-Path -Parent $PSScriptRoot
$backupEnv = Join-Path $backupRepo '.local/cloud-backup.env'
if (-not (Test-Path -LiteralPath $backupEnv)) { throw 'Missing private .local/cloud-backup.env configuration.' }
$backupNode = (Get-Command node.exe -ErrorAction Stop).Source
$backupScript = Join-Path $backupRepo 'scripts/backup-database.js'
$backupLog = Join-Path $backupRepo '.local/cloud-backup.log'
$backupErrorLog = Join-Path $backupRepo '.local/cloud-backup.error.log'
# Use only the nightly task for automatic copies; a daily copy stays fresh for 30 hours.
$env:BACKUP_INTERVAL_HOURS = '0'
$env:BACKUP_WARNING_HOURS = '30'
$backupProcess = Start-Process -FilePath $backupNode -ArgumentList @("--env-file=`"$backupEnv`"", "`"$backupScript`"") -WorkingDirectory $backupRepo -WindowStyle Hidden -RedirectStandardOutput $backupLog -RedirectStandardError $backupErrorLog -Wait -PassThru
exit $backupProcess.ExitCode
