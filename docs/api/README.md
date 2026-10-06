# WSRMS API

Base URL: `http://127.0.0.1:3001/api`. JSON bodies require `Content-Type: application/json`. Authenticated requests use the HttpOnly `wsrms_session` cookie. Postman stores this cookie after login.

| Method           | Endpoint                         | Access        | Purpose                                                               |
| ---------------- | -------------------------------- | ------------- | --------------------------------------------------------------------- |
| GET              | `/health`                        | Public        | Server readiness                                                      |
| POST             | `/auth/login`                    | Public        | Email/password sign-in                                                |
| GET              | `/auth/me`                       | Signed in     | Current account                                                       |
| POST             | `/auth/logout`                   | Public        | Delete current session                                                |
| GET              | `/dashboard`                     | Signed in     | Inventory totals, activity, locations                                 |
| GET              | `/parcels`                       | Signed in     | Search/filter parcel records                                          |
| POST             | `/parcels/recommendations`       | Signed in     | Ranked compatible reachable locations                                 |
| POST             | `/parcels`                       | Signed in     | Confirm check-in and storage assignment                               |
| GET              | `/parcels/:id`                   | Signed in     | Parcel details                                                        |
| PATCH            | `/parcels/:id`                   | Administrator | Correct parcel details with an audit reason                           |
| GET              | `/parcels/:id/route?start=9-2`   | Signed in     | Shortest route to an parcel and independently back to an access point |
| POST             | `/parcels/:id/retrieve`          | Signed in     | Stored → Retrieved                                                    |
| POST             | `/parcels/:id/dispatch`          | Signed in     | Verify scanned code and dispatch                                      |
| GET              | `/parcels/:id/transfer-options`  | Signed in     | Compatible alternative locations                                      |
| POST             | `/parcels/:id/transfer`          | Signed in     | Transfer a Stored parcel                                              |
| GET              | `/warehouse`                     | Signed in     | Cells, storage capacities, occupancy, revision                        |
| PUT              | `/warehouse`                     | Administrator | Save complete layout atomically                                       |
| GET              | `/transactions`                  | Signed in     | Search/filter audit records                                           |
| GET              | `/transactions/:id`              | Signed in     | Audit record and change details                                       |
| GET              | `/categories`                    | Signed in     | Categories, status, record counts                                     |
| POST / PUT       | `/categories`, `/categories/:id` | Administrator | Create/update category                                                |
| GET / POST / PUT | `/users`, `/users/:id`           | Administrator | List/create/update accounts                                           |
| GET              | `/reports`                       | Administrator | Operational report                                                    |
| GET              | `/reports/export/:kind`          | Administrator | CSV: parcels, transactions, locations                                 |

Parcel filters: `q`, `status` (`Stored`, `Retrieved`, `Dispatched`), `category` (numeric ID), `location` (numeric ID). Transaction filters: `q`, `type`, `parcel` (numeric ID). Numeric IDs differ from the human-readable `PRC-*`, `USR-*`, and `TXN-*` codes.

## Check-in example

Send the following to `/parcels/recommendations`, then add the chosen `location_id` and send to `/parcels`:

```json
{
  "tracking_number": "TRACK-123",
  "description": "Wireless headphones",
  "category_id": 2,
  "size": "Small",
  "weight": 0.75,
  "quantity": 1
}
```

## Dispatch example

First call `/parcels/:id/retrieve`, then POST the scanned code to `/parcels/:id/verify`. A match returns `{ "verified": true }`; a mismatch returns `{ "verified": false }`, logs the failed attempt, and creates a configured notification. After successful verification, send the same code to `/parcels/:id/dispatch`:

```json
{ "scanned_code": "PRC-2026-000001" }
```

The scanned value must exactly match that parcel's internal code. The server rejects direct dispatch of Stored parcels, mismatches, and repeat dispatch. Storage occupancy excludes Dispatched records.

Manual corrections use the parcel information fields plus `reason` (5–250 characters). Status, code, check-in time, and location remain unchanged. Nondispatched parcels are revalidated against the assigned location's size, category, capacity, and weight limits. The audit record stores the reason and original/new values.

## Errors and updates

Errors use `{ "message": "Readable explanation" }`. Status codes: 400 invalid input, 401 session required, 403 access denied, 404 missing record, 409 state/capacity/revision/uniqueness conflict, 429 excessive login attempts.

Warehouse PUT starts from the GET response and requires the current `revision`. Cells include `id`, zero-based `row`, `col`, `type` (`walkway`, `rack`, `floor_storage`, `door`, `wall`, `blocked`), boolean `active`, `walkable`, `can_store`, `availability` (`Available`/`Blocked`), positive `movement_cost`, `door_usage` (`receiving`/`dispatch`/`both`, otherwise null), and `directions` (an array of allowed `north`/`south`/`east`/`west` movements). Location objects include optional existing `id`, `cell_id`, unique `code`, `storage_type`, `capacity` (item quantity), `unit_capacity` (size units), `max_weight`, `max_size`, nullable `category_id`, and `status`. Unknown fields from the GET response are ignored. A stale revision must be reloaded before retrying.

Categories include `name`, `color` (hex), `active` (0/1). Users include `name`, `email`, `role` (`staff`/`admin`), `active` (0/1), and `password` (minimum 10 characters for creation, optional on updates). Passwords are never returned. Deactivation, role changes, and password changes invalidate that user's sessions. Administrators cannot deactivate/demote themselves or remove the last active admin.

Audit records contain the staff code/name, parcel code, previous/new status and location, verified flag, and UTC timestamp. The UI renders dates in `Asia/Manila`; reporting day boundaries use that timezone too.

## Inventory cells and round-trip routing

`GET /warehouse` returns `locations` and enriched `cells`. Each storage cell includes a `storage` object, `location_id`, `location_code`, `capacity`, `occupancy` (sum of active item quantities), `parcel_count` (number of active parcel records), `contains_parcels`, and `stored_parcels` (IDs, codes, quantities, statuses). Storage includes size/weight utilization and `inventory_status`: Empty, Occupied, Full, Reserved, Blocked, or Unavailable. Retrieved records retain capacity until dispatch. Occupancy is derived and cannot be edited.

Routes return independently computed `inbound` and `outbound` objects, each with `path`, `steps`, and weighted `cost`, plus `inboundSteps`, `returnSteps`, `totalSteps`, `totalCost`, access-point IDs and layout `revision`. Nonwalkable storage is served from a reachable adjacent cell; walkable storage can be visited directly. `start` optionally selects an active accessible cell. A route requires a reachable receiving point and a return to a dispatch point, preferring the same shared access point. Empty unreachable storage produces layout `warnings` and is excluded from recommendations. Occupied unreachable or disabled storage rejects layout saves. Historical location configurations are retained when a cell is repurposed after relocation.

## Notifications and settings

| Method    | Endpoint                  | Access        | Purpose                                                                                |
| --------- | ------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| POST      | `/parcels/:id/verify`     | Signed in     | Record successful or failed scanned-code verification for a Retrieved parcel           |
| GET       | `/notifications`          | Signed in     | Latest 200 visible events and total unread count                                       |
| POST      | `/notifications/:id/read` | Signed in     | Mark a visible event read for this account                                             |
| POST      | `/notifications/read-all` | Signed in     | Mark all visible events read for this account                                          |
| GET / PUT | `/preferences`            | Signed in     | Per-account `font_size` and `accent_color`                                             |
| GET / PUT | `/system-settings`        | Administrator | Versioned floor-assignment policy, capacity threshold, and enabled notification events |

Preferences accept `font_size`: small, medium, large; `accent_color`: blue, teal, green, purple, orange. System settings PUT requires the current `revision`, boolean `floor_storage_enabled`, integer `near_full_threshold` (50?99), and `notification_events`, a unique array from capacity_near_full, capacity_full, check_in, dispatch, verification_failed, blocked_route, storage_unavailable, layout_change. Disabled floor assignment does not prevent retrieving existing floor parcels. Capacity/layout alerts are shared; check-in/dispatch/verification warnings belong to the acting user. Read receipts are account-specific. Settings updates are audited.
