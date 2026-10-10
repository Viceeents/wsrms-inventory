# Storix API reference

Base URLs: `http://127.0.0.1:3001/api` locally and `https://wsrms-inventory.vercel.app/api` in production. Paths below are relative to `/api`. JSON writes use `Content-Type: application/json`. Authentication is the HttpOnly `wsrms_session` cookie, not a bearer token. Postman/curl must retain cookies after login. Browser clients use the same origin. See [engineering](../engineering/README.md) and [source map](../engineering/files.md).

## Endpoint inventory

All application endpoints below are registered in the Express routes. S = any signed-in eligible account; M = manager or administrator; A = administrator; Public = no session requirement. Parent mounts in app.js contribute authentication/roles in addition to individual route checks.

### Auth

Source: [server/src/routes/authRoutes.js](../../server/src/routes/authRoutes.js).

| Method | Path           | Access | Behavior                                   |
| ------ | -------------- | ------ | ------------------------------------------ |
| POST   | `/auth/login`  | Public | Email/password sign-in and session cookie. |
| POST   | `/auth/logout` | Public | Delete current session and clear cookie.   |
| GET    | `/auth/me`     | S      | Current authenticated account.             |

### Parcel

Source: [server/src/routes/parcelRoutes.js](../../server/src/routes/parcelRoutes.js).

| Method | Path                            | Access | Behavior                                         |
| ------ | ------------------------------- | ------ | ------------------------------------------------ |
| GET    | `/parcels`                      | S      | List/search parcels or confirm check-in.         |
| POST   | `/parcels/recommendations`      | S      | Compatible reachable storage candidates.         |
| POST   | `/parcels`                      | S      | List/search parcels or confirm check-in.         |
| GET    | `/parcels/:id`                  | S      | Details or audited correction.                   |
| PATCH  | `/parcels/:id`                  | M      | Details or audited correction.                   |
| GET    | `/parcels/:id/route`            | S      | Independent inbound/return routes.               |
| GET    | `/parcels/:id/transfer-options` | S      | Compatible alternative storage.                  |
| POST   | `/parcels/:id/retrieve`         | S      | Mark Stored parcel Retrieved.                    |
| POST   | `/parcels/:id/verify`           | S      | Check scanned code; record verification outcome. |
| POST   | `/parcels/:id/dispatch`         | S      | Recheck code/state and release capacity.         |
| POST   | `/parcels/:id/transfer`         | S      | Move a Stored parcel.                            |

### Warehouse

Source: [server/src/routes/warehouseRoutes.js](../../server/src/routes/warehouseRoutes.js).

| Method | Path                             | Access | Behavior                                            |
| ------ | -------------------------------- | ------ | --------------------------------------------------- |
| GET    | `/warehouse`                     | S      | Read or atomically replace versioned layout.        |
| GET    | `/warehouse/locations/:id/route` | S      | Route to a storage location.                        |
| PUT    | `/warehouse`                     | M      | Read or atomically replace versioned layout.        |
| GET    | `/warehouse/racks/:rack/route`   | S      | Route to rack group using existing routing service. |

### Transaction

Source: [server/src/routes/transactionRoutes.js](../../server/src/routes/transactionRoutes.js).

| Method | Path                | Access | Behavior              |
| ------ | ------------------- | ------ | --------------------- |
| GET    | `/transactions`     | S      | Search audit records. |
| GET    | `/transactions/:id` | S      | Audit detail.         |

### Category

Source: [server/src/routes/categoryRoutes.js](../../server/src/routes/categoryRoutes.js).

| Method | Path              | Access | Behavior                |
| ------ | ----------------- | ------ | ----------------------- |
| GET    | `/categories`     | S      | List/create categories. |
| POST   | `/categories`     | M      | List/create categories. |
| PUT    | `/categories/:id` | M      | Update category.        |

### User

Source: [server/src/routes/userRoutes.js](../../server/src/routes/userRoutes.js).

| Method | Path         | Access | Behavior                                        |
| ------ | ------------ | ------ | ----------------------------------------------- |
| GET    | `/users`     | A      | List/create accounts.                           |
| POST   | `/users`     | A      | List/create accounts.                           |
| PUT    | `/users/:id` | A      | Update or permanently logically delete account. |
| DELETE | `/users/:id` | A      | Update or permanently logically delete account. |

### Report

Source: [server/src/routes/reportRoutes.js](../../server/src/routes/reportRoutes.js).

| Method | Path                    | Access | Behavior                                      |
| ------ | ----------------------- | ------ | --------------------------------------------- |
| GET    | `/reports`              | M      | Operational summary.                          |
| GET    | `/reports/export/:kind` | M      | CSV export: parcels, transactions, locations. |

### Settings

Source: [server/src/routes/settingsRoutes.js](../../server/src/routes/settingsRoutes.js).

| Method | Path                      | Access | Behavior                                         |
| ------ | ------------------------- | ------ | ------------------------------------------------ |
| GET    | `/preferences`            | S      | Own font size and theme.                         |
| PUT    | `/preferences`            | S      | Own font size and theme.                         |
| GET    | `/system-settings`        | M      | Versioned operational and notification policies. |
| PUT    | `/system-settings`        | M      | Versioned operational and notification policies. |
| GET    | `/notifications`          | S      | Visible notifications and unread count.          |
| POST   | `/notifications/read-all` | S      | Mark all visible events read.                    |
| POST   | `/notifications/:id/read` | S      | Mark visible event read for current account.     |

### Recovery

Source: [server/src/routes/recoveryRoutes.js](../../server/src/routes/recoveryRoutes.js).

| Method | Path                                 | Access | Behavior                                                     |
| ------ | ------------------------------------ | ------ | ------------------------------------------------------------ |
| POST   | `/presence/heartbeat`                | S      | Session heartbeat/activity; throttled writes.                |
| GET    | `/profile/requests`                  | S      | Own profile image submissions/history.                       |
| POST   | `/profile/requests`                  | S      | Own profile image submissions/history.                       |
| GET    | `/admin/profile-requests`            | M      | Profile review queue.                                        |
| POST   | `/admin/profile-requests/:id/review` | M      | Approve/reject profile image.                                |
| GET    | `/admin/database`                    | A      | Primary/backup and optional HA monitoring.                   |
| POST   | `/admin/database/backups`            | A      | Manual backup on supported persistent host.                  |
| POST   | `/admin/database/restore`            | A      | Restore dedicated recovery copy after confirmation/password. |

### Message

Source: [server/src/routes/messageRoutes.js](../../server/src/routes/messageRoutes.js).

| Method | Path                          | Access                          | Behavior                                                |
| ------ | ----------------------------- | ------------------------------- | ------------------------------------------------------- |
| GET    | `/messages/team/activity`     | S                               | Recent eligible typing users.                           |
| POST   | `/messages/team/typing`       | S                               | Set/clear short-lived typing status.                    |
| GET    | `/messages/unread`            | S                               | Unread channel counts and chat heads.                   |
| GET    | `/messages/:channel`          | S                               | Read channel history or send team/announcement message. |
| POST   | `/messages/:channel/read`     | S                               | Advance own read cursor.                                |
| POST   | `/messages/:channel`          | S for team; A for announcements | Read channel history or send team/announcement message. |
| DELETE | `/messages/announcements/:id` | A                               | Archive announcement.                                   |

### App-level routes

| Method | Path         | Access | Behavior                                                                                   |
| ------ | ------------ | ------ | ------------------------------------------------------------------------------------------ |
| GET    | `/health`    | Public | `{ "status": "ok" }`; process liveness. Vercel also passes through adapter initialization. |
| GET    | `/dashboard` | S      | Operational summary; same summary controller as reports.                                   |

## Request contracts and examples

Exact validation lives in [schemas.js](../../server/src/utils/schemas.js), route modules and service preconditions. Unknown or derived fields are not a contract to write them back. Numeric database IDs differ from human-readable PRC/USR/TXN codes.

### Sign-in

```json
{ "email": "staff@wsrms.local", "password": "Staff@2026" }
```

POST `/auth/login` establishes an eight-hour cookie session. Login is limited to 30 attempts per 15 minutes by the route limiter. Inactive/suspended/deleted accounts cannot log in. Logout clears the session; `/auth/me` requires a valid session.

```sh
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"staff@wsrms.local","password":"Staff@2026"}' \
  http://127.0.0.1:3001/api/auth/login
curl -b cookies.txt http://127.0.0.1:3001/api/warehouse
```

These are development examples. Do not commit cookie files or reuse starter passwords in production.

### Recommendations and check-in

```json
{
  "tracking_number": "TRACK-123",
  "description": "Wireless headphones",
  "category_id": 2,
  "length_cm": 20,
  "width_cm": 15,
  "height_cm": 10,
  "weight": 0.75,
  "quantity": 1
}
```

Send to POST `/parcels/recommendations`; then add chosen `location_id` and POST `/parcels`. Each dimension and weight must be positive and at most 10000. Quantity is an integer 1?10000; description is 3?250 characters; tracking is optional, at most 100 characters. Server classification determines size. Category/location must exist and be eligible. Recommendations are an array with location information, parcel_size, distance, supplemental score, remaining capacity/units and route; availability is rechecked on creation.

GET `/parcels` filters: `q`, `status` (Stored/Retrieved/Dispatched), `category`, `location`. GET `/transactions` filters: `q`, `type`, `parcel`. Inspect models for exact search matching and returned projections.

### Retrieval, verification, dispatch and transfers

Retrieve a Stored record with POST `/parcels/:id/retrieve`. Send this to `/verify`, then `/dispatch`:

```json
{ "scanned_code": "PRC-2026-000001" }
```

A match returns verified=true; a mismatch returns verified=false and records the failed attempt/configured warning. Dispatch independently checks code and status; client verification alone is not authorization. Direct Stored dispatch, wrong code and repeat dispatch are rejected. Retrieved parcels retain storage until dispatch.

Transfer uses `{ "location_id": 5 }` after querying transfer-options. Corrections use measured parcel fields plus `reason` (5?250 characters). Status/business code/location are not corrected by this endpoint. Non-dispatched assignments are revalidated; original/new values and reason are audited.

### Warehouse and route responses

GET `/warehouse` returns warehouse revision, cells and locations. PUT starts from that response and requires current revision, name, cells and locations. Occupancy, counts and utilization are derived, not editable.

Cells: id, row/col, type (walkway/rack/floor_storage/door/wall/blocked), active, walkable, can_store, availability (Available/Blocked), positive movement_cost, nullable door_usage (receiving/dispatch/both), unique cardinal directions. Locations: optional existing id, cell_id, code, storage_type, capacity, unit_capacity, width_cm/depth_cm/height_cm, max_weight, max_size, nullable category_id, status (Available/Reserved/Blocked). See layoutSchema for length/range/default constraints.

Layout saves reject overloaded/unreachable occupied locations and stale revisions. Unreachable empty storage produces warnings and is excluded from assignments. Historical location configuration remains traceable. Routes include independent inbound/outbound paths, steps/cost, inboundSteps, returnSteps, totalSteps/totalCost, access points and revision. `start` optionally selects an active accessible cell such as `9-2`. Steps are grid movements, not physical distance.

### Accounts, categories and profile review

Account create: name (2?80), email (up to 200), role (staff/manager/admin), active (0/1), suspended boolean, password (10?128). Update permits empty/omitted password to preserve it. Account deletion accepts optional reason up to 500 characters and retains history through logical deletion. Self/last-administrator protections are enforced in services/controllers. Security changes revoke sessions; password hashes are not returned.

Category: name (2?60), six-digit hex color, active (0/1).

POST `/profile/requests`: `{ "image": "data:image/png;base64,..." }`. Server checks supported static JPEG/PNG/WEBP, 500 KB and 4096-pixel bounds and re-encodes a normalized 256-pixel WEBP. Ordinary users submit review requests; administrator self-updates are immediate. Review body: `{ "status": "Approved" }` or Rejected. Managers/admins can review; own history exposes request status/timestamps.

Heartbeat: `{ "activity_at": "2026-10-10T12:00:00.000Z" }`. Writes are throttled to 45 seconds; the browser sends periodic visible-tab heartbeats. Account activation and presence are separate concepts.

### Preferences, settings and notifications

Preferences PUT: `{ "font_size": "medium", "theme": "dark" }`. Font is small/medium/large; theme light/dark. Legacy accent fields in the database are not a current preference-write contract.

System settings PUT requires current revision, floor_storage_enabled boolean, near_full_threshold (50?99), unique notification_events, and optional size_limits with Small/Medium arrays of three positive dimensions. Small thresholds must fit Medium. Get current settings before editing; notification event names come from [notificationService](../../server/src/services/notificationService.js). Read receipts are account-specific; events can be shared or user-scoped.

### Messaging

Channels: team, announcements, updates. GET history supports `before` numeric cursor; newest bounded pages can be followed with earlier pages. POST team/announcements accepts message (1?2000), title (up to 100), priority (Normal/Important/Urgent). Announcements require administrator and title; updates are not a client-send channel. POST read uses `{ "through": 123 }`. Typing uses `{ "typing": true }` or false, expires after eight seconds, and is rate-limited. Send limits are defined in the route. Archiving announcements preserves records.

### Backup monitoring and recovery

GET `/admin/database` returns primary/backup statuses, history and host capability flags, plus optional HA monitor data. Manual backup returns 201 on success on a supported persistent host. Vercel cannot execute these local tools; nightly GitHub results remain in the shared ledger.

Restore body:

```json
{
  "backup_id": "COMPLETED_BACKUP_ID",
  "confirmation": "RESTORE EMERGENCY DATABASE",
  "password": "CURRENT_ADMIN_PASSWORD"
}
```

The configured target must differ from primary. Restoration validates archive integrity and replaces the target application schema transactionally; copied sessions are cleared. It does not switch the primary connection. Follow the [runbook](../operations/recovery.md). GitHub runner archives are ephemeral and cannot later be retrieved through a Vercel local-file restore button.

## Responses, errors and consistency

Read/update operations generally return 200; resource creation uses 201 where implemented. CSV exports return text rather than JSON. Successful output is the controller/service projection; consult handler source for exact fields rather than assuming a universal response envelope.

| Status | Meaning                                                             |
| ------ | ------------------------------------------------------------------- |
| 400    | Invalid payload, identifier, numeric value or unsupported operation |
| 401    | Missing/expired/ineligible session                                  |
| 403    | Role/origin/password authorization failure                          |
| 404    | Missing record or endpoint                                          |
| 409    | State, uniqueness, capacity, revision or operation-lock conflict    |
| 429    | Rate limit                                                          |
| 500    | Unexpected failure                                                  |
| 503    | Database recovering/unavailable or unsupported/failed backup tools  |

Normal errors use `{ "message": "Readable explanation" }`. Database availability errors may also include code=DATABASE_RECOVERING, retryable=false and Retry-After. Do not blindly retry mutations: a lost response does not prove the operation failed. Refresh authoritative records before deciding the next action.

Writes are durable transactions, with advisory locking around short mutations. Versioned updates reject stale revisions. Timestamps are generally UTC ISO values; UI and reporting days use Asia/Manila. API changes should update routes/validators, clients, tests and this reference together. The Postman generator is a convenience subset, not a formal OpenAPI specification.
