# Schema changes

`004_backup_neutral.sql` records verified backup-database synchronization timestamps and database names separately from archive creation. It converts legacy System preferences to Light and restricts themes to Light/Dark. Existing parcel and account records remain intact.

The current PostgreSQL schema lives in `../schema.sql`. Startup and `npm run db:setup` apply tracked migrations inside a transaction, then initialize missing tables and seed a fresh warehouse. `schema_migrations` records completed versions.

`002_inventory_cells.sql` upgrades the original rack-only implementation: it renames `racks` to `storage_locations` and parcel `rack_id` to `location_id`, preserving identifiers and foreign keys. It separates item capacity from size-unit capacity, adds cell storage/movement configuration, and converts access points to receiving/dispatch/both usage. The original default layout receives one shared access point and two floor-storage locations. Custom layouts retain their configured door positions. The warehouse revision increases once. A fresh schema skips the legacy conversion and starts from the current seed.

Take a private backup with `npm run db:backup` before upgrading another existing database. Dumps are saved under ignored `.local/backups`. Set `PG_DUMP_PATH` if the PostgreSQL executable is outside PATH or the default Windows installation. `CREATE TABLE IF NOT EXISTS` alone does not migrate existing column definitions; future structural changes require another tracked migration.

`003_recovery_physical.sql` adds measured parcel/storage dimensions, configurable classification limits, account presence timestamps, suspended accounts, light/dark/system preferences, profile-image approval records, and shared backup-monitoring metadata. It preserves historical parcel measurements as null and leaves existing assignments intact. New storage physical defaults are 120 x 80 x 180 cm and must be checked against the actual site. The migration runs once under `schema_migrations` within the existing initialization transaction.

`005_deleted_users.sql` adds permanent user soft deletion. Deleted accounts retain their identity for historical references, are excluded from current-user lists, and cannot be reactivated through user updates. The migration runs through the existing initialization lock.

`006_team_messaging.sql` adds authenticated team messages, announcements and system updates with user foreign keys, indexed channel history, and per-user read cursors. Announcements archive without erasing their records. The existing migration transaction applies it once; all messaging data is included in database backups.

`007_chat_activity.sql` adds short-lived typing activity shared across server instances. Only user identity and expiration are stored; message drafts stay in the browser. Expired, inactive and deleted users are excluded from typing indicators.
