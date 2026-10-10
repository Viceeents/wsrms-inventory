# Storix ? Warehouse Storage Records Management System

Storix manages parcel receiving, storage, retrieval, verified dispatch, and operational records. It uses React, Vite, Tailwind CSS, Express, Node.js 24, and PostgreSQL 18. Production runs on Vercel with Neon PostgreSQL; GitHub Actions copies data to a separate Neon backup nightly.

**Application:** [wsrms-inventory.vercel.app](https://wsrms-inventory.vercel.app) ? **Source:** [Viceeents/wsrms-inventory](https://github.com/Viceeents/wsrms-inventory)

This guide describes the deployed `wsrms` repository. The sibling `wsrms-local` checkout is a separate repository.

## Documentation

| Guide                                                        | Coverage                                                                          |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [Engineering handbook](docs/engineering/README.md)           | Requirements, architecture, database, security, testing, delivery and maintenance |
| [Complete file reference](docs/engineering/files.md)         | Individual source/configuration files and responsibilities                        |
| [API reference](docs/api/README.md)                          | Registered endpoints, permissions, payloads and errors                            |
| [Postman collection](docs/api/WSRMS.postman_collection.json) | Importable requests; use the API reference for current contracts                  |
| [Architecture diagrams](docs/diagrams/architecture.md)       | Architecture and operation diagrams                                               |
| [Migrations](database/migrations/README.md)                  | Ordered schema evolution                                                          |
| [Vercel setup](docs/operations/vercel.md)                    | Production hosting configuration                                                  |
| [Backup runbook](docs/operations/recovery.md)                | Nightly cloud copies and recovery                                                 |

## Features and roles

Features include measured receiving, recommendations, derived inventory, rack/floor routes, transfers, QR/barcode labels, camera/manual scanning, dispatch verification, audit history, CSV reports, versioned layout/settings, profile review, account presence, team messaging, notifications, browser drafts, and Light/Dark appearance.

| Capability                                                   | Staff | Manager | Administrator |
| ------------------------------------------------------------ | ----- | ------- | ------------- |
| Receiving, inventory, routing, transfer, retrieval, dispatch | Yes   | Yes     | Yes           |
| Own profile, preferences, notifications and team chat        | Yes   | Yes     | Yes           |
| Reports, categories, layout, settings, parcel corrections    | No    | Yes     | Yes           |
| Review profile pictures                                      | No    | Yes     | Yes           |
| Manage accounts; publish/archive announcements               | No    | No      | Yes           |
| Database monitoring and manual recovery API                  | No    | No      | Yes           |

The backend enforces permissions. No manager is seeded; administrators assign the role. Vercel disables local manual backup/restore execution, which requires persistent storage and PostgreSQL tools. Cloud-job monitoring records remain visible.

## Local setup

Install Node.js **24**, npm and PostgreSQL **18**. Use a development database for development and tests.

```powershell
git clone https://github.com/Viceeents/wsrms-inventory.git
cd wsrms-inventory
npm.cmd ci
Copy-Item .env.example .env
```

Create the database and edit `.env`:

```sql
CREATE DATABASE wsrms_inventory_db;
```

```dotenv
DATABASE_URL=postgresql://postgres:URL_ENCODED_PASSWORD@localhost:5432/wsrms_inventory_db
HOST=127.0.0.1
PORT=3001
APP_ORIGIN=http://localhost:5173
NODE_ENV=development
SEED_DEMO=true
BACKUP_INTERVAL_HOURS=0
```

```powershell
npm.cmd run db:setup
npm.cmd run dev
```

Open **http://localhost:5173**. API: **http://127.0.0.1:3001/api**. Vite proxies API calls. Windows PowerShell can use `npm.cmd` to avoid script execution-policy restrictions; other shells can use `npm`. URL-encode password characters. Docker users can use `docker-compose.yml` with private primary/backup passwords and the declared ports.

Startup applies tracked migrations and initializes missing data without resetting existing records. `SEED_DEMO=false` suppresses demo parcels on a fresh database.

| Development role | Email               | Default initial password |
| ---------------- | ------------------- | ------------------------ |
| Administrator    | `admin@wsrms.local` | `Warehouse@2026`         |
| Staff            | `staff@wsrms.local` | `Staff@2026`             |

`ADMIN_PASSWORD`/`STAFF_PASSWORD` override first-time seed passwords, not existing credentials. Change defaults before shared use. Keep credentials, private environment files, dumps and logs out of Git.

## Architecture

```mermaid
flowchart LR
  Browser[React web application] -->|Same-origin JSON and session cookie| API[Express API]
  Vercel[Vercel function adapter] --> API
  API --> Primary[(Primary Neon PostgreSQL)]
  Runner[GitHub Actions nightly job] -->|Direct pg_dump| Primary
  Runner -->|Transactional restore| Backup[(Separate Neon backup)]
  Runner -->|Monitoring metadata| Primary
```

This is a modular layered application, not independently deployed microservices. Routes define HTTP/permissions; controllers adapt requests; services enforce business operations; models query data; algorithms compute routing and compatibility. Recovery/messaging have some direct database handlers in route modules.

```text
api/                     Vercel API entry
client/                  HTML, Vite config and public assets
  src/components/        Common UI, layout/chat, parcel, warehouse, QR and charts
  src/pages/             Operator and admin/manager screens
  src/hooks/             Fetch/polling, drafts, auth, scanner and grid
  src/context/           Authentication and appearance providers
  src/routes/            Browser routes and guards
  src/services/          HTTP adapters
  src/utils/             Formatting, validation, storage and colors
server/src/
  routes/                Endpoints, validation and role gates
  controllers/           HTTP adapters
  services/              Business operations, audit, reporting and recovery
  models/                Queries and projections
  algorithms/            Graph, Dijkstra, dimensions and scoring
  config/                Environment, connections, transactions and migrations
  middleware/            Sessions, roles, validation and errors
  utils/                 Passwords, images, identifiers and availability
database/                Base schema, ordered migrations and seeds
scripts/                 Setup, tests, backup and Postman generation
tests/                   Algorithms, database integration and browser scenarios
docs/                    Engineering, API, design and operations
.github/workflows/       CI and nightly cloud copy
```

See the [file reference](docs/engineering/files.md) for each file.

## Operating rules

- Status progresses **Stored ? Retrieved ? Dispatched**. Retrieved parcels retain occupancy; successful dispatch frees it.
- Dimensions are centimeters and weight is kilograms per item. Quantity multiplies weight/space use. Small/Medium/Large consume 1/2/4 size units each.
- Server-side classification uses measured dimensions and configured limits. Historical unmeasured records retain legacy size until corrected.
- Physical fit permits horizontal rotation with upright height. It is not a 3D packing simulation.
- Compatibility checks dimensions, quantities, units, weight, category, availability, floor policy and two-way access. Sorting prioritizes racks, inbound route cost, utilization and code. The supplemental numeric score is not the active sort comparator.
- Dijkstra minimizes weighted movement cost through accessible cells with allowed directions. Outbound/return routes are independent; steps are grid movements, not meters. Nonwalkable storage uses an adjacent accessible pickup cell.
- Short mutations use a shared advisory transaction lock. Capacity decisions, counters, changes and audit records commit together. Layout/settings revisions reject stale edits.
- Dispatch checks current state and code on the server. Restored drafts never restore QR verification.

## Commands and verification

| Command                            | Purpose                                            |
| ---------------------------------- | -------------------------------------------------- |
| `npm run dev`                      | API and frontend development                       |
| `npm run db:setup`                 | Migrations and initial data                        |
| `npm test`                         | Algorithms, HA helpers and PostgreSQL API tests    |
| `npm run test:ui`                  | Playwright workflows                               |
| `npm run build`                    | Production frontend in client/dist                 |
| `npm run test:production`          | Build/browser tests against Express static hosting |
| `npm start`                        | Persistent API and built frontend                  |
| `npm run db:backup`                | One backup and configured database synchronization |
| `npm run db:backup-worker`         | Legacy interval worker                             |
| `node scripts/generate-postman.js` | Generate Postman collection                        |
| `npm run format`                   | Format repository                                  |

Install Chromium with `npx playwright install chromium`. Normal tests create/remove a random `wsrms_test_*` schema. Recovery tests also create/drop a separate random database; the account needs those privileges. Opt-in deployed tests write real records and require a designated deployment/private accounts.

CI runs Node 24, PostgreSQL 18 and matching tools, backend tests, build and browser flows. Test success proves covered scenarios, not formal security/accessibility/availability certification.

## Production and recovery

Vercel serves client/dist and routes API calls to api/index.js. Configure DATABASE_URL, optional DATABASE_URL_UNPOOLED, APP_ORIGIN, NODE_ENV=production and private seed credentials. Production cookies require HTTPS. Public-schema queries can use pooled Neon; migrations/backups use direct connections.

The [nightly workflow](.github/workflows/nightly-backup.yml) targets **2:00 AM Philippine time** (`0 18 * * *` UTC). Repository secrets WSRMS_PRIMARY_DATABASE_URL and WSRMS_BACKUP_DATABASE_URL must be distinct direct Neon connections. GitHub runs the copy without an online computer. Manual execution is under **Actions ? Nightly Neon backup ? Run workflow**; scheduled jobs may be delayed.

The job validates an archive, replaces the dedicated target schema transactionally, checks tables, clears copied sessions and records results. Runner dumps are ephemeral; independent archive retention is not included. Set Vercel BACKUP_WARNING_HOURS=30 and BACKUP_INTERVAL_HOURS=0, then redeploy for nightly monitoring. Disable competing workers after cloud verification.

## Scope and limitations

The handbook addresses requirements, design, relational integrity, access control, migrations, testing, CI/CD, operations and maintenance. Business views generally poll rather than use WebSockets. Scanning needs localhost/HTTPS and permission; real printer/scanner compatibility needs hardware tests. Process health is not full database readiness. Continuous replication, automatic recovery promotion, measured RTO/availability guarantees and formal security/accessibility certification are not provided by these features.
