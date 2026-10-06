# WSRMS implementation scope

The system helps warehouse staff register, organize, locate, retrieve, verify, and dispatch parcels. Administrators configure racks and layout, manage staff and categories, inspect audit records, and export operational reports.

The implementation includes persistent PostgreSQL records, role-based authentication, smart storage eligibility and ranking, Dijkstra routing, QR/CODE128 labels, camera and keyboard scanning, verified dispatch, rack/floor inventory mapping, Chart.js reports, and transactional audit logging.

The warehouse starts as an editable 10 × 14 grid. Layout changes preserve reachability and historical storage identities. Routes report grid steps; capacity separately limits item quantities, size units, and weight. Dashboard data refreshes by polling. Database backup scheduling, external carrier APIs, and external deployment are outside the supplied requirements.

A single Warehouse Access Point supports receiving and dispatch. The layout editor supports racks, floor storage, optionally storable walkways, doors, walls, and blocked cells. Parcel occupancy is derived from saved inventory. Dispatch shows independently calculated retrieval and return routes. Notifications cover storage capacity, parcel events, failed verification, and accessibility changes. Administrators configure notification events and floor assignment policy; users save readable font sizes and one of five accent colors.
