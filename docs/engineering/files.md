# Complete file reference

[README](../../README.md) ? [Engineering handbook](README.md)

Tracked source/configuration/reference inventory at this update. Build output, dependencies, private environments, dumps, logs and test artifacts are excluded. Paths resolve from this reference into the repository; update it when files are added or removed.

## Repository root

| File                                               | Responsibility                                                             |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| [.env.example](../../.env.example)                 | Supporting project/tool configuration; inspect alongside parent directory. |
| [.gitignore](../../.gitignore)                     | Supporting project/tool configuration; inspect alongside parent directory. |
| [.prettierignore](../../.prettierignore)           | Supporting project/tool configuration; inspect alongside parent directory. |
| [.vercelignore](../../.vercelignore)               | Supporting project/tool configuration; inspect alongside parent directory. |
| [README.md](../../README.md)                       | Documentation: project entry and setup.                                    |
| [docker-compose.yml](../../docker-compose.yml)     | Separate local primary/backup PostgreSQL services.                         |
| [package-lock.json](../../package-lock.json)       | Exact dependency resolution for npm ci.                                    |
| [package.json](../../package.json)                 | Node engine, npm commands and dependencies.                                |
| [playwright.config.js](../../playwright.config.js) | Browser targets, workers, trace retention and server lifecycle.            |
| [vercel.json](../../vercel.json)                   | Build/output, regions, API function and rewrites.                          |

## .github/workflows

| File                                                             | Responsibility                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [ci.yml](../../.github/workflows/ci.yml)                         | Isolated Node/PostgreSQL API, build and browser verification.          |
| [nightly-backup.yml](../../.github/workflows/nightly-backup.yml) | Scheduled/manual GitHub-hosted Neon copy and configuration validation. |

## api

| File                           | Responsibility                                                            |
| ------------------------------ | ------------------------------------------------------------------------- |
| [index.js](../../api/index.js) | Vercel adapter, warm-instance initialization and setup-failure responses. |

## client

| File                                          | Responsibility                                            |
| --------------------------------------------- | --------------------------------------------------------- |
| [index.html](../../client/index.html)         | Document metadata and React/favicon entries.              |
| [vite.config.js](../../client/vite.config.js) | Vite/Tailwind/React build, dev API proxy and strict port. |

## client/public

| File                                           | Responsibility                  |
| ---------------------------------------------- | ------------------------------- |
| [favicon.svg](../../client/public/favicon.svg) | Storix parcel browser-tab icon. |

## client/src

| File                                  | Responsibility                                         |
| ------------------------------------- | ------------------------------------------------------ |
| [App.jsx](../../client/src/App.jsx)   | Provider composition and application route rendering.  |
| [main.jsx](../../client/src/main.jsx) | React browser mount with StrictMode and global styles. |

## client/src/components/charts

| File                                                                      | Responsibility                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------ |
| [ActivityChart.jsx](../../client/src/components/charts/ActivityChart.jsx) | ActivityChart reusable view and interaction component. |

## client/src/components/common

| File                                                                                  | Responsibility                                               |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Button.jsx](../../client/src/components/common/Button.jsx)                           | Button reusable view and interaction component.              |
| [DraftNotice.jsx](../../client/src/components/common/DraftNotice.jsx)                 | DraftNotice reusable view and interaction component.         |
| [MemberAvatar.jsx](../../client/src/components/common/MemberAvatar.jsx)               | MemberAvatar reusable view and interaction component.        |
| [Modal.jsx](../../client/src/components/common/Modal.jsx)                             | Modal reusable view and interaction component.               |
| [NotificationSummary.jsx](../../client/src/components/common/NotificationSummary.jsx) | NotificationSummary reusable view and interaction component. |
| [SearchBar.jsx](../../client/src/components/common/SearchBar.jsx)                     | SearchBar reusable view and interaction component.           |
| [StatusBadge.jsx](../../client/src/components/common/StatusBadge.jsx)                 | StatusBadge reusable view and interaction component.         |
| [UI.jsx](../../client/src/components/common/UI.jsx)                                   | UI reusable view and interaction component.                  |

## client/src/components/layout

| File                                                                            | Responsibility                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [AppLayout.jsx](../../client/src/components/layout/AppLayout.jsx)               | AppLayout reusable view and interaction component.        |
| [ChatLauncher.jsx](../../client/src/components/layout/ChatLauncher.jsx)         | ChatLauncher reusable view and interaction component.     |
| [Header.jsx](../../client/src/components/layout/Header.jsx)                     | Header reusable view and interaction component.           |
| [MessagingPanel.jsx](../../client/src/components/layout/MessagingPanel.jsx)     | MessagingPanel reusable view and interaction component.   |
| [MobileNavigation.jsx](../../client/src/components/layout/MobileNavigation.jsx) | MobileNavigation reusable view and interaction component. |
| [Sidebar.jsx](../../client/src/components/layout/Sidebar.jsx)                   | Sidebar reusable view and interaction component.          |

## client/src/components/parcel

| File                                                                                      | Responsibility                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [ParcelDetails.jsx](../../client/src/components/parcel/ParcelDetails.jsx)                 | ParcelDetails reusable view and interaction component.         |
| [ParcelForm.jsx](../../client/src/components/parcel/ParcelForm.jsx)                       | ParcelForm reusable view and interaction component.            |
| [ParcelTable.jsx](../../client/src/components/parcel/ParcelTable.jsx)                     | ParcelTable reusable view and interaction component.           |
| [StorageRecommendation.jsx](../../client/src/components/parcel/StorageRecommendation.jsx) | StorageRecommendation reusable view and interaction component. |

## client/src/components/qr

| File                                                                        | Responsibility                                            |
| --------------------------------------------------------------------------- | --------------------------------------------------------- |
| [BarcodeGenerator.jsx](../../client/src/components/qr/BarcodeGenerator.jsx) | BarcodeGenerator reusable view and interaction component. |
| [LabelPreview.jsx](../../client/src/components/qr/LabelPreview.jsx)         | LabelPreview reusable view and interaction component.     |
| [QRGenerator.jsx](../../client/src/components/qr/QRGenerator.jsx)           | QRGenerator reusable view and interaction component.      |
| [QRScanner.jsx](../../client/src/components/qr/QRScanner.jsx)               | QRScanner reusable view and interaction component.        |

## client/src/components/transaction

| File                                                                                     | Responsibility                                              |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [TransactionDetails.jsx](../../client/src/components/transaction/TransactionDetails.jsx) | TransactionDetails reusable view and interaction component. |
| [TransactionTable.jsx](../../client/src/components/transaction/TransactionTable.jsx)     | TransactionTable reusable view and interaction component.   |

## client/src/components/warehouse

| File                                                                                       | Responsibility                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| [DispatchRouteSummary.jsx](../../client/src/components/warehouse/DispatchRouteSummary.jsx) | DispatchRouteSummary reusable view and interaction component. |
| [GridCell.jsx](../../client/src/components/warehouse/GridCell.jsx)                         | GridCell reusable view and interaction component.             |
| [GridEditorToolbar.jsx](../../client/src/components/warehouse/GridEditorToolbar.jsx)       | GridEditorToolbar reusable view and interaction component.    |
| [RouteOverlay.jsx](../../client/src/components/warehouse/RouteOverlay.jsx)                 | RouteOverlay reusable view and interaction component.         |
| [RouteUnavailable.jsx](../../client/src/components/warehouse/RouteUnavailable.jsx)         | RouteUnavailable reusable view and interaction component.     |
| [StorageInfo.jsx](../../client/src/components/warehouse/StorageInfo.jsx)                   | StorageInfo reusable view and interaction component.          |
| [WarehouseGrid.jsx](../../client/src/components/warehouse/WarehouseGrid.jsx)               | WarehouseGrid reusable view and interaction component.        |

## client/src/context

| File                                                                    | Responsibility                           |
| ----------------------------------------------------------------------- | ---------------------------------------- |
| [AppearanceContext.jsx](../../client/src/context/AppearanceContext.jsx) | AppearanceContext provider/shared state. |
| [AuthContext.jsx](../../client/src/context/AuthContext.jsx)             | AuthContext provider/shared state.       |

## client/src/hooks

| File                                                              | Responsibility                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| [useApi.js](../../client/src/hooks/useApi.js)                     | Fetching, refresh, loading/error state and optional polling.          |
| [useAuth.js](../../client/src/hooks/useAuth.js)                   | useAuth shared React behavior.                                        |
| [useDraft.js](../../client/src/hooks/useDraft.js)                 | User-scoped browser persistence, expiry, restore/discard and cleanup. |
| [useScanner.js](../../client/src/hooks/useScanner.js)             | Camera/scanner lifecycle and cleanup.                                 |
| [useWarehouseGrid.js](../../client/src/hooks/useWarehouseGrid.js) | Grid interaction state and gesture handling.                          |

## client/src/pages

| File                                                                  | Responsibility                                    |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| [CheckInPage.jsx](../../client/src/pages/CheckInPage.jsx)             | CheckIn screen, interaction and view state.       |
| [DashboardPage.jsx](../../client/src/pages/DashboardPage.jsx)         | Dashboard screen, interaction and view state.     |
| [DispatchPage.jsx](../../client/src/pages/DispatchPage.jsx)           | Dispatch screen, interaction and view state.      |
| [InventoryPage.jsx](../../client/src/pages/InventoryPage.jsx)         | Inventory screen, interaction and view state.     |
| [LabelPrintPage.jsx](../../client/src/pages/LabelPrintPage.jsx)       | LabelPrint screen, interaction and view state.    |
| [LoginPage.jsx](../../client/src/pages/LoginPage.jsx)                 | Login screen, interaction and view state.         |
| [NotificationsPage.jsx](../../client/src/pages/NotificationsPage.jsx) | Notifications screen, interaction and view state. |
| [ParcelDetailsPage.jsx](../../client/src/pages/ParcelDetailsPage.jsx) | ParcelDetails screen, interaction and view state. |
| [ParcelSearchPage.jsx](../../client/src/pages/ParcelSearchPage.jsx)   | ParcelSearch screen, interaction and view state.  |
| [ProfilePage.jsx](../../client/src/pages/ProfilePage.jsx)             | Profile screen, interaction and view state.       |
| [ScanPage.jsx](../../client/src/pages/ScanPage.jsx)                   | Scan screen, interaction and view state.          |
| [SettingsPage.jsx](../../client/src/pages/SettingsPage.jsx)           | Settings screen, interaction and view state.      |
| [TransactionsPage.jsx](../../client/src/pages/TransactionsPage.jsx)   | Transactions screen, interaction and view state.  |
| [WarehouseMapPage.jsx](../../client/src/pages/WarehouseMapPage.jsx)   | WarehouseMap screen, interaction and view state.  |

## client/src/pages/admin

| File                                                                            | Responsibility                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| [CategoriesPage.jsx](../../client/src/pages/admin/CategoriesPage.jsx)           | Categories screen, interaction and view state.      |
| [DatabasePage.jsx](../../client/src/pages/admin/DatabasePage.jsx)               | Database screen, interaction and view state.        |
| [LayoutEditorPage.jsx](../../client/src/pages/admin/LayoutEditorPage.jsx)       | LayoutEditor screen, interaction and view state.    |
| [ProfileRequestsPage.jsx](../../client/src/pages/admin/ProfileRequestsPage.jsx) | ProfileRequests screen, interaction and view state. |
| [ReportsPage.jsx](../../client/src/pages/admin/ReportsPage.jsx)                 | Reports screen, interaction and view state.         |
| [SystemSettingsPage.jsx](../../client/src/pages/admin/SystemSettingsPage.jsx)   | SystemSettings screen, interaction and view state.  |
| [UsersPage.jsx](../../client/src/pages/admin/UsersPage.jsx)                     | Users screen, interaction and view state.           |

## client/src/routes

| File                                                             | Responsibility                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| [AppRoutes.jsx](../../client/src/routes/AppRoutes.jsx)           | Lazy browser screens and role-specific route groups. |
| [ProtectedRoute.jsx](../../client/src/routes/ProtectedRoute.jsx) | Client authentication and role navigation guard.     |

## client/src/services

| File                                                                     | Responsibility                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [api.js](../../client/src/services/api.js)                               | Same-origin JSON transport, query construction, errors and session expiry. |
| [authService.js](../../client/src/services/authService.js)               | Auth HTTP request adapter.                                                 |
| [parcelService.js](../../client/src/services/parcelService.js)           | Parcel HTTP request adapter.                                               |
| [reportService.js](../../client/src/services/reportService.js)           | Report HTTP request adapter.                                               |
| [transactionService.js](../../client/src/services/transactionService.js) | Transaction HTTP request adapter.                                          |
| [warehouseService.js](../../client/src/services/warehouseService.js)     | Warehouse HTTP request adapter.                                            |

## client/src/styles

| File                                             | Responsibility                                |
| ------------------------------------------------ | --------------------------------------------- |
| [global.css](../../client/src/styles/global.css) | Shared themes, responsive UI and print rules. |

## client/src/utils

| File                                                      | Responsibility                                      |
| --------------------------------------------------------- | --------------------------------------------------- |
| [formatCode.js](../../client/src/utils/formatCode.js)     | formatCode helper functions for the owning layer.   |
| [formatDate.js](../../client/src/utils/formatDate.js)     | formatDate helper functions for the owning layer.   |
| [neutralColor.js](../../client/src/utils/neutralColor.js) | neutralColor helper functions for the owning layer. |
| [storage.js](../../client/src/utils/storage.js)           | storage helper functions for the owning layer.      |
| [validators.js](../../client/src/utils/validators.js)     | validators helper functions for the owning layer.   |

## database

| File                                              | Responsibility                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| [sample-data.sql](../../database/sample-data.sql) | Sample-data reference; inspect before manual execution.                  |
| [schema.sql](../../database/schema.sql)           | Base relational definitions; ordered migrations complete current schema. |

## database/migrations

| File                                                                             | Responsibility                                          |
| -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [002_inventory_cells.sql](../../database/migrations/002_inventory_cells.sql)     | Tracked one-time migration: inventory cells.            |
| [003_recovery_physical.sql](../../database/migrations/003_recovery_physical.sql) | Tracked one-time migration: recovery physical.          |
| [004_backup_neutral.sql](../../database/migrations/004_backup_neutral.sql)       | Tracked one-time migration: backup neutral.             |
| [005_deleted_users.sql](../../database/migrations/005_deleted_users.sql)         | Tracked one-time migration: deleted users.              |
| [006_team_messaging.sql](../../database/migrations/006_team_messaging.sql)       | Tracked one-time migration: team messaging.             |
| [007_chat_activity.sql](../../database/migrations/007_chat_activity.sql)         | Tracked one-time migration: chat activity.              |
| [008_manager_role.sql](../../database/migrations/008_manager_role.sql)           | Tracked one-time migration: manager role.               |
| [README.md](../../database/migrations/README.md)                                 | Documentation: parent directory reference and guidance. |

## database/seeds

| File                                    | Responsibility                                               |
| --------------------------------------- | ------------------------------------------------------------ |
| [demo.js](../../database/seeds/demo.js) | Initial users/categories/layout and optional demo inventory. |

## docs/api

| File                                                                          | Responsibility                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [README.md](../../docs/api/README.md)                                         | Documentation: parent directory reference and guidance.                 |
| [WSRMS.postman_collection.json](../../docs/api/WSRMS.postman_collection.json) | Generated importable API requests; current contracts are in API README. |

## docs/diagrams

| File                                                   | Responsibility                                          |
| ------------------------------------------------------ | ------------------------------------------------------- |
| [architecture.md](../../docs/diagrams/architecture.md) | Documentation: parent directory reference and guidance. |

## docs/engineering

| File                                          | Responsibility                                          |
| --------------------------------------------- | ------------------------------------------------------- |
| [README.md](../../docs/engineering/README.md) | Documentation: parent directory reference and guidance. |
| [files.md](../../docs/engineering/files.md)   | Documentation: parent directory reference and guidance. |

## docs/operations

| File                                                               | Responsibility                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [recovery.md](../../docs/operations/recovery.md)                   | Documentation: parent directory reference and guidance.               |
| [vercel.md](../../docs/operations/vercel.md)                       | Documentation: parent directory reference and guidance.               |
| [wsrms-backup.service](../../docs/operations/wsrms-backup.service) | Linux systemd persistent administrative backup-host service template. |

## scripts

| File                                                                         | Responsibility                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [backup-database.js](../../scripts/backup-database.js)                       | One-shot dump and optional synchronization entry.                 |
| [backup-worker.js](../../scripts/backup-worker.js)                           | Legacy persistent interval backup process.                        |
| [generate-postman.js](../../scripts/generate-postman.js)                     | Generates importable API request examples.                        |
| [install-cloud-backup-task.ps1](../../scripts/install-cloud-backup-task.ps1) | Install/replace daily Philippine-time Windows backup task.        |
| [run-cloud-backup.ps1](../../scripts/run-cloud-backup.ps1)                   | Hidden Windows run with private cloud env and output logs.        |
| [run-tests.js](../../scripts/run-tests.js)                                   | Random schema isolation, child-process test settings and cleanup. |
| [setup-database.js](../../scripts/setup-database.js)                         | Explicit migration/initialization entry.                          |

## server/src

| File                                    | Responsibility                                                             |
| --------------------------------------- | -------------------------------------------------------------------------- |
| [app.js](../../server/src/app.js)       | Express composition, headers/origin checks, API mounts and static hosting. |
| [server.js](../../server/src/server.js) | Persistent startup, initialization, interval scheduler and shutdown.       |

## server/src/algorithms

| File                                                                   | Responsibility                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [buildGraph.js](../../server/src/algorithms/buildGraph.js)             | Directed weighted graph from accessible grid cells.                   |
| [dijkstra.js](../../server/src/algorithms/dijkstra.js)                 | Weighted shortest path search.                                        |
| [parcelDimensions.js](../../server/src/algorithms/parcelDimensions.js) | Measured size classification and upright-height physical fit.         |
| [storageScoring.js](../../server/src/algorithms/storageScoring.js)     | Capacity/units/weight compatibility and supplemental numeric scoring. |

## server/src/config

| File                                               | Responsibility                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [database.js](../../server/src/config/database.js) | Query helpers, transaction context/advisory lock, business counters and migrations. |
| [env.js](../../server/src/config/env.js)           | Private environment loading and runtime configuration.                              |
| [postgres.js](../../server/src/config/postgres.js) | Pooled/direct connection selection and PostgreSQL options.                          |

## server/src/controllers

| File                                                                              | Responsibility                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------- |
| [authController.js](../../server/src/controllers/authController.js)               | Auth HTTP adaptation and response handlers.        |
| [categoryController.js](../../server/src/controllers/categoryController.js)       | Category HTTP adaptation and response handlers.    |
| [parcelController.js](../../server/src/controllers/parcelController.js)           | Parcel HTTP adaptation and response handlers.      |
| [reportController.js](../../server/src/controllers/reportController.js)           | Report HTTP adaptation and response handlers.      |
| [settingsController.js](../../server/src/controllers/settingsController.js)       | Settings HTTP adaptation and response handlers.    |
| [transactionController.js](../../server/src/controllers/transactionController.js) | Transaction HTTP adaptation and response handlers. |
| [userController.js](../../server/src/controllers/userController.js)               | User HTTP adaptation and response handlers.        |
| [warehouseController.js](../../server/src/controllers/warehouseController.js)     | Warehouse HTTP adaptation and response handlers.   |

## server/src/middleware

| File                                                                 | Responsibility                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------- |
| [authMiddleware.js](../../server/src/middleware/authMiddleware.js)   | Hashed-cookie session lookup and eligible account enforcement. |
| [errorMiddleware.js](../../server/src/middleware/errorMiddleware.js) | HTTP/database failure mapping and recovery responses.          |
| [roleMiddleware.js](../../server/src/middleware/roleMiddleware.js)   | Server-side role allowlist.                                    |
| [validateRequest.js](../../server/src/middleware/validateRequest.js) | Zod payload parsing and validation errors.                     |

## server/src/models

| File                                                                       | Responsibility                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [categoryModel.js](../../server/src/models/categoryModel.js)               | Category persistence queries and record projections.        |
| [gridCellModel.js](../../server/src/models/gridCellModel.js)               | Gridcell persistence queries and record projections.        |
| [parcelModel.js](../../server/src/models/parcelModel.js)                   | Parcel persistence queries and record projections.          |
| [storageLocationModel.js](../../server/src/models/storageLocationModel.js) | Storagelocation persistence queries and record projections. |
| [transactionModel.js](../../server/src/models/transactionModel.js)         | Transaction persistence queries and record projections.     |
| [userModel.js](../../server/src/models/userModel.js)                       | User persistence queries and record projections.            |
| [warehouseModel.js](../../server/src/models/warehouseModel.js)             | Warehouse persistence queries and record projections.       |

## server/src/routes

| File                                                                 | Responsibility                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [authRoutes.js](../../server/src/routes/authRoutes.js)               | Auth endpoint contracts, payload validation and role gates.        |
| [categoryRoutes.js](../../server/src/routes/categoryRoutes.js)       | Category endpoint contracts, payload validation and role gates.    |
| [messageRoutes.js](../../server/src/routes/messageRoutes.js)         | Message endpoint contracts, payload validation and role gates.     |
| [parcelRoutes.js](../../server/src/routes/parcelRoutes.js)           | Parcel endpoint contracts, payload validation and role gates.      |
| [recoveryRoutes.js](../../server/src/routes/recoveryRoutes.js)       | Recovery endpoint contracts, payload validation and role gates.    |
| [reportRoutes.js](../../server/src/routes/reportRoutes.js)           | Report endpoint contracts, payload validation and role gates.      |
| [settingsRoutes.js](../../server/src/routes/settingsRoutes.js)       | Settings endpoint contracts, payload validation and role gates.    |
| [transactionRoutes.js](../../server/src/routes/transactionRoutes.js) | Transaction endpoint contracts, payload validation and role gates. |
| [userRoutes.js](../../server/src/routes/userRoutes.js)               | User endpoint contracts, payload validation and role gates.        |
| [warehouseRoutes.js](../../server/src/routes/warehouseRoutes.js)     | Warehouse endpoint contracts, payload validation and role gates.   |

## server/src/services

| File                                                                               | Responsibility                                                                           |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [auditService.js](../../server/src/services/auditService.js)                       | Business transaction/audit insertion.                                                    |
| [backupService.js](../../server/src/services/backupService.js)                     | Dump/checksum validation, transactional target restore, history, locking and scheduling. |
| [highAvailabilityService.js](../../server/src/services/highAvailabilityService.js) | Read-only interpretation of optional external fenced HA monitors.                        |
| [notificationService.js](../../server/src/services/notificationService.js)         | Event visibility, capacity alerts, configuration and read-state operations.              |
| [parcelService.js](../../server/src/services/parcelService.js)                     | Check-in, correction, transfer, retrieve, verify and dispatch invariants.                |
| [pathfindingService.js](../../server/src/services/pathfindingService.js)           | Storage/group routes, pickup points and independent return paths.                        |
| [qrService.js](../../server/src/services/qrService.js)                             | Parcel-code label/QR supporting behavior.                                                |
| [reportService.js](../../server/src/services/reportService.js)                     | Operational aggregates, timezone-aware activity and CSV preparation.                     |
| [storageService.js](../../server/src/services/storageService.js)                   | Compatible reachable storage candidates and rack-first ordering.                         |
| [transactionService.js](../../server/src/services/transactionService.js)           | Transactiondomain supporting operations.                                                 |

## server/src/utils

| File                                                                            | Responsibility                                                 |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [databaseAvailability.js](../../server/src/utils/databaseAvailability.js)       | databaseAvailability helper functions for the owning layer.    |
| [generateParcelCode.js](../../server/src/utils/generateParcelCode.js)           | generateParcelCode helper functions for the owning layer.      |
| [generateTransactionCode.js](../../server/src/utils/generateTransactionCode.js) | generateTransactionCode helper functions for the owning layer. |
| [generateUserCode.js](../../server/src/utils/generateUserCode.js)               | generateUserCode helper functions for the owning layer.        |
| [logger.js](../../server/src/utils/logger.js)                                   | logger helper functions for the owning layer.                  |
| [password.js](../../server/src/utils/password.js)                               | Salted scrypt hashing and timing-safe comparison.              |
| [profileImage.js](../../server/src/utils/profileImage.js)                       | Upload limits, decode and normalized WEBP conversion.          |
| [schemas.js](../../server/src/utils/schemas.js)                                 | schemas helper functions for the owning layer.                 |

## tests/backend

| File                                           | Responsibility                                               |
| ---------------------------------------------- | ------------------------------------------------------------ |
| [api.test.js](../../tests/backend/api.test.js) | api.test verification scenarios; see handbook for isolation. |

## tests/frontend

| File                                                        | Responsibility                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| [deployed.spec.js](../../tests/frontend/deployed.spec.js)   | deployed.spec verification scenarios; see handbook for isolation.  |
| [recovery.spec.js](../../tests/frontend/recovery.spec.js)   | recovery.spec verification scenarios; see handbook for isolation.  |
| [scanner.spec.js](../../tests/frontend/scanner.spec.js)     | scanner.spec verification scenarios; see handbook for isolation.   |
| [storix.spec.js](../../tests/frontend/storix.spec.js)       | storix.spec verification scenarios; see handbook for isolation.    |
| [workflows.spec.js](../../tests/frontend/workflows.spec.js) | workflows.spec verification scenarios; see handbook for isolation. |

## tests/pathfinding

| File                                                       | Responsibility                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| [ha.test.js](../../tests/pathfinding/ha.test.js)           | ha.test verification scenarios; see handbook for isolation.      |
| [routing.test.js](../../tests/pathfinding/routing.test.js) | routing.test verification scenarios; see handbook for isolation. |
