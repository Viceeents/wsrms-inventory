# Architecture and operation flow

```mermaid
flowchart LR
  Staff[Warehouse staff] --> React[React + Tailwind UI]
  Admin[Administrator] --> React
  Manager[Warehouse manager] --> React
  React -->|JSON + session cookie| Express[Node.js + Express API]
  Express --> Auth[Authentication and roles]
  Express --> Storage[Storage scoring]
  Express --> Routing[Dijkstra routing]
  Express --> Audit[Transaction audit]
  Auth --> PG[(PostgreSQL)]
  Storage --> PG
  Routing --> PG
  Audit --> PG
  React --> Charts[Chart.js]
  React --> Labels[QR + CODE128 + browser print]
  React --> Scanner[Camera / USB / keyboard]
```

```mermaid
flowchart TD
  Arrival[Parcel arrives] --> Details[Enter or scan tracking details]
  Details --> Recommend[Check rack/floor eligibility and shortest routes]
  Recommend --> Confirm[Staff confirms storage location]
  Confirm --> Store[Atomic check-in + storage + audit]
  Store --> Label[Generate QR and barcode label]
  Label --> Find[Search or scan parcel]
  Find --> Route[Calculate inbound and return routes]
  Route --> Retrieved[Mark retrieved]
  Retrieved --> Scan[Scan parcel code]
  Scan --> Match{Expected code matches?}
  Match -->|No| Reject[Reject dispatch]
  Reject --> Scan
  Match -->|Yes| Dispatch[Atomic dispatch + free capacity + audit]
```

```mermaid
erDiagram
  USERS ||--o{ SESSIONS : authenticates
  USERS ||--o{ PARCELS : checks_in
  USERS ||--o{ TRANSACTIONS : performs
  CATEGORIES ||--o{ PARCELS : classifies
  CATEGORIES o|--o{ STORAGE_LOCATIONS : restricts
  GRID_CELLS ||--o| STORAGE_LOCATIONS : contains
  STORAGE_LOCATIONS ||--o{ PARCELS : stores
  PARCELS o|--o{ TRANSACTIONS : traces
  WAREHOUSE ||--|{ GRID_CELLS : describes
  USERS ||--o| USER_PREFERENCES : customizes
  USERS o|--o{ NOTIFICATIONS : receives
  NOTIFICATIONS ||--o{ NOTIFICATION_READS : tracks
  USERS ||--o{ NOTIFICATION_READS : reads
```

Warehouse is a singleton; every grid cell belongs to that one warehouse. Parcel records retain the last storage location after dispatch for historical traceability. Occupancy is calculated from nondispatched parcel quantities and sizes rather than maintained as a second mutable counter.

The default layout has one Warehouse Access Point configured for Receiving + Dispatch. Grid cells describe both physical layout and inventory. Active/walkable flags, movement costs, and direction restrictions define the current routing graph. Floor storage is configurable as walkable or nonwalkable. Retrieval and return paths run through independent Dijkstra calculations; occupied locations require both paths before a layout can be saved.

For current hosting, nightly cloud copies, layering and engineering tradeoffs, see the [engineering handbook](../engineering/README.md). The diagrams above summarize domain relationships; exact keys and nullability are defined by the base schema plus migrations.
