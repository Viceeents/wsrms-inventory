# Schema changes

The current PostgreSQL schema lives in `../schema.sql`. Startup and `npm run db:setup` apply tracked migrations inside a transaction, then initialize missing tables and seed a fresh warehouse. `schema_migrations` records completed versions.

`002_inventory_cells.sql` upgrades the original rack-only implementation: it renames `racks` to `storage_locations` and parcel `rack_id` to `location_id`, preserving identifiers and foreign keys. It separates item capacity from size-unit capacity, adds cell storage/movement configuration, and converts access points to receiving/dispatch/both usage. The original default layout receives one shared access point and two floor-storage locations. Custom layouts retain their configured door positions. The warehouse revision increases once. A fresh schema skips the legacy conversion and starts from the current seed.

Take a private backup with `npm run db:backup` before upgrading another existing database. Dumps are saved under ignored `.local/backups`. Set `PG_DUMP_PATH` if the PostgreSQL executable is outside PATH or the default Windows installation. `CREATE TABLE IF NOT EXISTS` alone does not migrate existing column definitions; future structural changes require another tracked migration.
