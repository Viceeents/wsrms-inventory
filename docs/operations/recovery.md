# Backup and recovery

Scheduled copies described here are recovery backups. Automatic failover is not deployed; these copies must never be treated as automatically promotable HA nodes.

For hosted application setup, see [Vercel deployment](vercel.md).

The operational PostgreSQL database is `wsrms_inventory_db`, configured through `DATABASE_URL`. The separate backup PostgreSQL server contains `wsrms_inventory_backup`, configured through `BACKUP_DATABASE_URL`. WSRMS uses scheduled custom-format dumps and restores successful dumps into the backup database. It does not shard data or automatically switch connections.

## Separate PostgreSQL services

`docker-compose.yml` defines independent primary and backup PostgreSQL services, credentials, and volumes. Set `POSTGRES_PASSWORD` and `BACKUP_POSTGRES_PASSWORD` in your private `.env`, then run `docker compose up -d postgres postgres-backup`.

For an application running on the host, use primary port **5433** and backup port **5434**:

```dotenv
DATABASE_URL=postgresql://wsrms:PRIMARY_PASSWORD@localhost:5433/wsrms_inventory_db
BACKUP_DATABASE_URL=postgresql://wsrms_backup:BACKUP_PASSWORD@localhost:5434/wsrms_inventory_backup
```

URL-encode special characters in passwords. The local services share one physical host. For protection against loss of that host, run the backup service on your VPS and replace `localhost` with its private reachable hostname. Never expose PostgreSQL publicly without restricting access. A Vercel function cannot connect to a warehouse PC through `localhost`.

## Configure a persistent backup host

Install PostgreSQL client tools matching the database version or a supported newer version. Keep the application's existing direct connection configuration (`DATABASE_URL_UNPOOLED` for Neon). Add these settings to the persistent host's private environment:

```dotenv
BACKUP_DIRECTORY=D:/WSRMS-Recovery
BACKUP_INTERVAL_HOURS=1
BACKUP_WARNING_HOURS=6
# Separate backup PostgreSQL server
BACKUP_DATABASE_URL=postgresql://USER:PASSWORD@BACKUP_HOST:5432/wsrms_inventory_backup
# Optional when PostgreSQL tools are not on PATH
PG_DUMP_PATH=C:/Program Files/PostgreSQL/18/bin/pg_dump.exe
PG_RESTORE_PATH=C:/Program Files/PostgreSQL/18/bin/pg_restore.exe
```

Use a durable directory outside the application checkout, preferably a separately backed-up volume. Restrict filesystem access to the backup operator/service account: dumps contain parcel records, account hashes, and profile pictures. Copy completed `.dump` and matching `.json` manifests to separately managed disaster recovery storage. Retention and off-host copying are operator responsibilities; the application does not claim that a local disk copy survives loss of that disk.

The persistent Node server runs due backups on startup and checks the schedule every minute. For a dedicated worker, run `npm.cmd run db:backup-worker` with `BACKUP_INTERVAL_HOURS=1` and `BACKUP_DATABASE_URL` set, supervised by your host's service manager. Use only one backup worker against its backup directory. Alternatively, keep `BACKUP_INTERVAL_HOURS=0` and schedule `npm.cmd run db:backup` with Windows Task Scheduler or an equivalent external scheduler. The CLI requires an initialized database. `EMERGENCY_DATABASE_URL` remains a legacy alias; `BACKUP_DATABASE_URL` takes precedence.

Vercel cannot keep durable backup files or reliably schedule an in-process timer. The Vercel admin page reads the backup metadata recorded by a persistent worker in PostgreSQL, but disables local backup/restore buttons. With no worker records it reports **Unavailable**. Run the persistent backup host separately with `VERCEL` unset and the same primary connection. Keep its administrative interface access restricted. No cloud resources, replication subscriptions, or production schedules are provisioned by this code update.

[PostgreSQL pg_dump documentation](https://www.postgresql.org/docs/current/app-pgdump.html) describes custom-format dumps. [pg_restore documentation](https://www.postgresql.org/docs/current/app-pgrestore.html) documents transactional restoration.

## Backup monitoring

### Cloud primary with a local backup host

This workstation's private `.local/cloud-backup.env` connects the worker to the Neon primary used by Vercel and the local `wsrms_inventory_backup` database. The development `.env` continues to use the local primary. Run these commands from the WSRMS checkout:

```powershell
# One cloud backup, with its result recorded in the cloud monitoring ledger
node --env-file=.local/cloud-backup.env scripts/backup-database.js
# Install the nightly copy at 02:00 Philippine time
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install-cloud-backup-task.ps1
```

Do not run the local-primary and cloud-primary workers against the same backup database at the same time: each replaces that recovery copy. Their archived dump files are kept in separate directories. The private cloud configuration is ignored by Git and Vercel uploads. A different backup host needs its own private configuration.

Restores require `pg_dump`, `pg_restore`, and `psql`. The worker generates temporary SQL in its restricted backup directory, replaces only the validated backup target's application schema, checks warehouse tables, and clears copied sessions inside one transaction. Temporary SQL files are deleted afterward. This handles older recovery schemas with constraints absent from the incoming archive. `PSQL_PATH` can override the client executable location.

For a Linux VPS, [wsrms-backup.service](wsrms-backup.service) is a service template for the persistent administrative application and its scheduled backups. Install Node.js 24, matching PostgreSQL client tools, and the application in `/opt/wsrms`; run `npm ci --include=dev` and `npm run build`. Create a dedicated `wsrms` service account, restrict `/etc/wsrms/backup.env` to that account, and provide `DATABASE_URL`, `BACKUP_DATABASE_URL`, `BACKUP_DIRECTORY`, `BACKUP_INTERVAL_HOURS=1`, `NODE_ENV=production`, `SEED_DEMO=false`, `HOST=127.0.0.1`, and your private HTTPS `APP_ORIGIN`. Keep `VERCEL` unset. Serve the administrative application behind an HTTPS reverse proxy with restricted operator access. Enable the service with the host's service manager. Do not run the standalone worker at the same time. Administrators sign in normally to this host to create and restore backups; the Vercel page reads the same monitoring ledger.

A backup writes a Running manifest, creates a PostgreSQL dump, validates its table of contents, calculates SHA-256, restores into the configured backup database, checks its warehouse tables, clears copied sessions, and records Completed with timestamp and byte size. A synchronization failure records Failed and notifies administrators. Without a configured backup connection the existing CLI can still create an archive, but a live backup database has not been maintained. Metadata is mirrored in `database_backups` so hosted monitoring can report worker results; the independent filesystem manifest remains available if the primary is down. Notification delivery failure does not invalidate a completed copy.

Healthy means a verified copy reached the separate backup database within `BACKUP_WARNING_HOURS` (default six hours). Archive-only records remain in history but do not establish a healthy backup database. Warning means no verified database copy or an older copy. Failed means the newest operation failed, or a Running operation has exceeded 20 minutes. The lock file protects backup and restore operations from overlapping.

After a worker crash, confirm that no `pg_dump`, `pg_restore`, or WSRMS recovery operation is still running before an operator removes the exact configured directory's `operation.lock`. Retain the failed/interrupted manifest for diagnosis. The application never silently clears an uncertain operation lock.

The app uses PostgreSQL-backed authentication. During a total primary outage the authenticated admin page may be unavailable; use the backup host's independent manifests and infrastructure monitoring. The public health endpoint is process liveness, not database health.

## Restore an emergency copy

1. Create `wsrms_inventory_backup` on the backup server and set `BACKUP_DATABASE_URL` on the persistent host. Normal warehouse transactions never use it.
2. Sign in as an administrator on the persistent administrative host, open **Database health**, then **Restore latest backup**, or choose a completed copy from **View backup history**.
3. Choose a completed backup and **Restore emergency copy**.
4. Enter `RESTORE EMERGENCY DATABASE` and the administrator's password. This replaces the configured emergency database's backed-up schema.
5. The server checks that the target differs from the primary, checks the file checksum, restores in one transaction, queries parcel/storage tables, and clears restored login sessions. It records recovery audits and a completion/failure notification. The primary connection stays unchanged.
6. Before promoting a recovery copy, an operator validates records, warehouse access/routes, capacities, and authentication in a restricted recovery environment. Stop normal writes and deliberately update the operational connection only after approval and validation. This promotion is an infrastructure maintenance procedure, not automatic failover.

Replication is displayed as **Not configured**. A provider-managed recovery/replication system can complement these backups, but this project does not install or pretend to operate one. Recovery from a dump is available independently of a replication service.

## Other configuration

`PRESENCE_IDLE_MINUTES` defaults to 5 and `PRESENCE_OFFLINE_MINUTES` to 30. Offline must exceed Idle; the server enforces bounds. Heartbeat connection loss is detected after three minutes. User timestamps are retained for administration; users are never stored as permanently Online.

Drafts are local to an account and browser, expire after seven days, and need browser storage to be available. They do not synchronize between devices. Confirmed actions and discarded drafts are removed. Layout drafts retain the original revision so a newer warehouse layout cannot be overwritten silently.

### Windows automatic cloud backups

On this workstation, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/install-cloud-backup-task.ps1` to install the **WSRMS Cloud Database Backup** scheduled task. It runs once daily at **2:00 AM Philippine time (UTC+08:00)**, uses the private `.local/cloud-backup.env`, and starts without a visible window. Installing it replaces the previous hourly/sign-in triggers. To choose another time, pass `-NightlyTime "23:00"` (24-hour Philippine time). The task requests wake from sleep when supported. Missed sessions are skipped rather than copied during daytime or at sign-in. Check its result with `Get-ScheduledTaskInfo -TaskName 'WSRMS Cloud Database Backup'`. Standard output and errors are saved in `.local/cloud-backup.log` and `.local/cloud-backup.error.log`; completed synchronization is also recorded in the primary database monitoring ledger.

This task runs while its Windows user is signed in and the workstation is powered on and connected. The backup is a nightly recovery copy, so changes after the last session remain pending until the next night. Keep `BACKUP_INTERVAL_HOURS=0` in both the application and private cloud environment, and stop any interval backup worker. Set `BACKUP_WARNING_HOURS=30` on the backup host and hosted application so a healthy daily copy is not flagged after six hours. The task runner enforces these settings for its own process. Use the persistent VPS service described above for backups that continue while the workstation is off. Do not run another worker against the same backup target at the same time.
