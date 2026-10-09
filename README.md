# Warehouse Storage Records Management System

A working staff-first warehouse application built with **JavaScript, React, Node.js, Express, PostgreSQL, Tailwind CSS, Chart.js, and npm**. The interface is based on the supplied written requirements; the Figma Make link was inaccessible and has not been reproduced pixel-for-pixel.

## Run locally

Requirements: Node.js **24+**, npm, PostgreSQL **18** (the version tested; the schema uses standard PostgreSQL features). Open this `wsrms` folder in Visual Studio Code.

Your local `.env` already points to **`wsrms_inventory_db`**. Database credentials are private and excluded from Git.

For Neon on Vercel, `DATABASE_URL` may use the pooled (`-pooler`) endpoint. Normal public-schema requests omit the unsupported `search_path` startup option. Initialization and backups use `DATABASE_URL_UNPOOLED` when provided; otherwise the app derives the direct endpoint from a Neon pooled hostname. Custom schemas use a direct connection. Set connection variables for Vercel's Production environment, then redeploy. Keep local PostgreSQL configuration in `.env` separate from the cloud values in the parent `.env.local`.

```powershell
cd C:\warehousemanagement\wsrms
npm.cmd install
npm.cmd run db:setup
npm.cmd run dev
```

Open **http://localhost:5173**. The Express API runs at **http://127.0.0.1:3001**. `npm.cmd` avoids Windows PowerShell's script execution-policy restriction; `npm` works normally in Command Prompt, Linux, and macOS.

For another machine, copy `.env.example` to `.env`, create the database in pgAdmin or psql, and set the connection URL:

```sql
CREATE DATABASE wsrms_inventory_db;
```

```dotenv
DATABASE_URL=postgresql://postgres:YOUR_URL_ENCODED_PASSWORD@localhost:5432/wsrms_inventory_db
```

URL-encode password characters such as `@`, `#`, and `%`. The app creates its tables and initial data automatically when starting, or explicitly with `npm run db:setup`. It does not reset an existing warehouse. An inaccessible database stops startup with a configuration message.

Optional Docker alternative: set `POSTGRES_PASSWORD` in `.env`, run `docker compose up -d`, and use `postgresql://wsrms:<encoded-password>@localhost:5433/wsrms_inventory_db`. Port 5433 avoids conflicting with an existing local PostgreSQL service.

## Starter accounts

| Role            | Email               | Initial password |
| --------------- | ------------------- | ---------------- |
| Administrator   | `admin@wsrms.local` | `Warehouse@2026` |
| Warehouse staff | `staff@wsrms.local` | `Staff@2026`     |

The passwords can be overridden by `ADMIN_PASSWORD` and `STAFF_PASSWORD` **before the first initialization**. Once users exist, change passwords through Team members. Starter accounts are intended for local development; change their passwords before shared use.

`SEED_DEMO=true` adds 36 sample parcel records on the first initialization. Set it to `false` before initializing a fresh database to create only accounts, categories, and the warehouse layout. Existing records are preserved regardless of this setting.

## What works

- Staff/admin authentication with hashed passwords, eight-hour HttpOnly sessions, login rate limiting, active-account checks, and server-enforced roles.
- Parcel check-in, unique internal/user/transaction codes, optional unique external tracking numbers, filtering, details, and inventory monitoring for racks and floor storage.
- Each cell carries layout, storage, and movement information. Occupancy, parcel counts, and stored IDs come from inventory records. Empty, occupied, full, and unavailable locations have distinct indicators.
- Storage recommendations enforce **category, size, parcel capacity, size-unit capacity, total weight, availability, and retrieval/return access**. Racks and floor locations use the same scoring rules.
- The default **Warehouse Access Point** is one door with **Receiving + Dispatch** usage. Administrators can configure receiving, dispatch, or both on each access point.
- Dijkstra independently calculates the route to the parcel and the return to an access point. The dispatch view displays both step counts, their total, and selectable route overlays. Routes use current active/walkable flags, movement costs, and allowed directions. Racks, walls, and blocked cells cannot be crossed; floor storage may be walkable or served from an adjacent aisle. Steps are grid movements, not meters.
- Storage transfers between compatible reachable locations, with changes recorded in transaction history.
- Administrator parcel corrections require a reason, retain original/new values in the audit log, and revalidate storage limits.
- Retrieval followed by **server-verified dispatch**. A wrong code or a parcel not marked Retrieved cannot be dispatched. Correct dispatch frees capacity, changes status, and records verification in a single database transaction.
- QR codes and CODE128 barcodes encode the internal parcel code. Print preview supports multiple labels; browser print/PDF hides navigation.
- Camera scanning via `html5-qrcode`, USB scanner keyboard input, and manual code entry. Camera requires **localhost or HTTPS** and browser permission; physical camera/scanner/thermal-printer compatibility needs testing on your hardware.
- Editable 10 × 14 layout/inventory grid with rack and floor capacities, weight limits, category restrictions, active status, reservations, and blocked cells. Occupied locations must remain reachable in both directions. Relocate active parcels before disabling or blocking their cell. Unreachable empty locations produce warnings and are excluded from recommendations. Historical location configurations remain attached for traceability. Layout revision checks prevent overwriting someone else's edit.
- Persistent in-app notifications for capacity, check-in, dispatch, failed verification, unavailable storage, blocked routes, and layout changes. Administrators choose enabled events and the near-full threshold. Read state is per account.
- Account appearance settings persist neutral Light or Dark mode and font size. Administrators also control new floor-storage assignments and parcel classification thresholds.
- Admin team management, category management, operational charts, CSV exports, and detailed audit records.
- Responsive layout for desktop and mobile. Dashboard, inventory, warehouse map, parcels, transactions, and reports refresh every **30 seconds**; writes are immediately persisted. This uses polling, not WebSockets.

## Storage rules

`capacity` limits the quantity of items stored; `unit_capacity` separately limits space consumed. Small parcels use 1 size unit per item, Medium 2, and Large 4. `occupancy` sums item quantities; `parcel_count` counts parcel records. Weight is kilograms **per item**. Size limits and optional category restrictions apply to every storage type. Reserved, Blocked, inactive, and unreachable locations cannot receive new parcels. Retrieved parcels continue occupying their assigned location until verified dispatch.

Storage is filtered by actual dimensions, category, size, quantity, total weight, capacity, and two-way accessibility. Utilization is the maximum of parcel-count, size-unit, and weight ratios. Compatible reachable racks are preferred over floor storage. Candidates are ordered by inbound route cost, then current utilization. Compatibility is checked before any distance ranking. Dijkstra's algorithm is implemented in `server/src/algorithms/dijkstra.js`; routes are rechecked on check-in, transfer, retrieval, and dispatch.

Short PostgreSQL mutations share an advisory transaction lock. Capacity checks, parcel updates, identifier counters, and audit entries therefore commit together and concurrent check-ins cannot overfill a rack.

## Commands and verification

```powershell
npm.cmd test          # backend and algorithm tests
npm.cmd run test:ui   # browser workflows; requires Chromium
npm.cmd run build     # production frontend
npm.cmd run test:production # browser workflows against the Express-served build
npm.cmd start         # Express serves API + built React frontend on port 3001
npm.cmd run db:backup # private PostgreSQL dump under .local/backups
```

If Chromium is missing, run `npx.cmd playwright install chromium`. Tests create an isolated, randomly named `wsrms_test_*` schema in the configured database and drop only that schema afterwards. The database user needs `CREATE SCHEMA` permission. Tests do not change normal warehouse data. GitHub Actions runs the same checks against an isolated PostgreSQL service.

Production `NODE_ENV=production` enables Secure session cookies, so serve through HTTPS and set `APP_ORIGIN` to the actual origin. Use a dedicated database account, managed environment secrets, and database backups for deployment. The production application is deployed at https://wsrms-inventory.vercel.app.

For the current local setup, open **http://127.0.0.1:3001** after building and starting. Another application may occupy port 5173; the Express-served build avoids that conflict.

Initialization applies `database/migrations/002_inventory_cells.sql` once. The migration preserves existing parcel IDs, storage assignments, and audit history while extending legacy racks into storage locations. A private backup was taken before migrating the local database. Repeat initialization does not reset records or reapply the layout conversion. The API now uses `location_id`, `location_code`, and `locations` instead of the former rack-only names.

## Project structure

```text
client/src/       React pages, components, hooks, services, Tailwind/styles
server/src/       Express routes, controllers, services, algorithms, models
database/        PostgreSQL schema and idempotent JavaScript seed
docs/api/        API reference and importable Postman collection
docs/diagrams/   Architecture, entity relationships, and operation flows
tests/           Algorithm, PostgreSQL API, and Playwright browser tests
scripts/         Database setup and isolated test runner
.github/         GitHub Actions checks
```

API documentation: [docs/api/README.md](docs/api/README.md). Import [docs/api/WSRMS.postman_collection.json](docs/api/WSRMS.postman_collection.json) into Postman; sign in first so the cookie jar authenticates later requests.

## Recovery and operations update

- Check-in and parcel correction now require measured length, width, height (cm), and weight (kg). Size is classified on the server from administrator-controlled thresholds. Historical parcels retain their existing size and show **Not measured** until corrected; no dimensions are invented for old records.
- Rack/floor configurations include width, depth, height, maximum total weight, capacity, and live occupancy. Parcels can rotate in the horizontal plane; height remains upright. These are compatibility limits, not a three-dimensional packing simulator. Configure physical limits for the actual warehouse before using recommendations.
- User-scoped browser drafts quietly save check-in, parcel correction, dispatch selection, and layout/rack configuration. Restore/discard banners appear on return. Drafts expire after seven days. A recovered dispatch selection always fetches the parcel and current route again; QR verification is never restored. Saving a draft creates no inventory transaction.
- Profile changes accept static JPEG/PNG/WEBP up to 500 KB and 4096 x 4096 pixels. The server decodes and re-encodes a 256-pixel WEBP avatar, stripping metadata. Staff submit requests for administrator approval. Existing staff pictures remain active until approval; administrator picture changes save immediately.
- Presence is derived from session timestamps. Visible tabs send a heartbeat once per minute; the server limits writes to once per 45 seconds per session. Online requires activity within five minutes and a heartbeat within three minutes. Idle applies until 30 minutes without activity; lost connection, expired sessions, or logout yield Offline. Account Active/Inactive/Suspended remains separate.
- Admin **Database health** shows primary activity, verified backup age/size/history, failures, and recovery controls. See [backup and recovery setup](docs/operations/recovery.md). Schema migration 003 applies automatically once at startup, with existing records preserved.
