import { Routes, Route, Link } from "react-router-dom";
import { lazy } from "react";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "../components/layout/AppLayout";
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const ProfileRequestsPage = lazy(
  () => import("../pages/admin/ProfileRequestsPage"),
);
const DatabasePage = lazy(() => import("../pages/admin/DatabasePage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const CheckInPage = lazy(() => import("../pages/CheckInPage"));
const DispatchPage = lazy(() => import("../pages/DispatchPage"));
const ParcelSearchPage = lazy(() => import("../pages/ParcelSearchPage"));
const ParcelDetailsPage = lazy(() => import("../pages/ParcelDetailsPage"));
const WarehouseMapPage = lazy(() => import("../pages/WarehouseMapPage"));
const InventoryPage = lazy(() => import("../pages/InventoryPage"));
const TransactionsPage = lazy(() => import("../pages/TransactionsPage"));
const LabelPrintPage = lazy(() => import("../pages/LabelPrintPage"));
const ScanPage = lazy(() => import("../pages/ScanPage"));
const LayoutEditorPage = lazy(() => import("../pages/admin/LayoutEditorPage"));
const UsersPage = lazy(() => import("../pages/admin/UsersPage"));
const CategoriesPage = lazy(() => import("../pages/admin/CategoriesPage"));
const ReportsPage = lazy(() => import("../pages/admin/ReportsPage"));
const SettingsPage = lazy(() => import("../pages/SettingsPage"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));
const SystemSettingsPage = lazy(
  () => import("../pages/admin/SystemSettingsPage"),
);
import { Empty } from "../components/common/UI";
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="check-in" element={<CheckInPage />} />
          <Route path="dispatch" element={<DispatchPage />} />
          <Route path="find" element={<ParcelSearchPage find />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="parcels" element={<ParcelSearchPage />} />
          <Route path="parcels/:id" element={<ParcelDetailsPage />} />
          <Route path="warehouse" element={<WarehouseMapPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="labels" element={<LabelPrintPage />} />
          <Route element={<ProtectedRoute admin />}>
            <Route path="admin/database" element={<DatabasePage />} />
            <Route path="admin/users" element={<UsersPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={["admin", "manager"]} />}>
            <Route path="admin/settings" element={<SystemSettingsPage />} />
            <Route path="admin/layout" element={<LayoutEditorPage />} />
            <Route path="admin/categories" element={<CategoriesPage />} />
            <Route
              path="admin/profile-requests"
              element={<ProfileRequestsPage />}
            />
            <Route path="admin/reports" element={<ReportsPage />} />
          </Route>
          <Route
            path="*"
            element={
              <Empty
                title="Page not found"
                description="Let’s get you back to your workspace."
              >
                <Link className="btn btn-primary" to="/">
                  Back to overview
                </Link>
              </Empty>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
