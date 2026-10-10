import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PackagePlus,
  Truck,
  Search,
  ScanLine,
  Warehouse,
  Boxes,
  Package,
  History,
  Grid2X2,
  Users,
  Tags,
  ChartNoAxesCombined,
  LogOut,
  Box,
  Bell,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
export const navGroups = [
  {
    title: "WORKSPACE",
    items: [
      ["/", "Overview", LayoutDashboard],
      ["/notifications", "Notifications", Bell],
      ["/profile", "Profile", Users],
      ["/settings", "Appearance settings", Settings],
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      ["/check-in", "Check-in parcel", PackagePlus],
      ["/dispatch", "Dispatch parcel", Truck],
      ["/find", "Find parcel", Search],
      ["/scan", "Scan QR / barcode", ScanLine],
    ],
  },
  {
    title: "WAREHOUSE",
    items: [
      ["/warehouse", "Warehouse map", Warehouse],
      ["/inventory", "Inventory", Boxes],
    ],
  },
  {
    title: "RECORDS",
    items: [
      ["/parcels", "All parcels", Package],
      ["/transactions", "Transactions", History],
    ],
  },
  {
    title: "MANAGEMENT",
    roles: ["admin", "manager"],
    items: [
      ["/admin/profile-requests", "Profile requests", Users],
      ["/admin/layout", "Layout editor", Grid2X2],
      ["/admin/categories", "Categories", Tags],
      ["/admin/settings", "System settings", SlidersHorizontal],
      ["/admin/reports", "Reports", ChartNoAxesCombined],
    ],
  },
  {
    title: "ADMINISTRATION",
    admin: true,
    items: [
      ["/admin/database", "Database health", History],
      ["/admin/users", "Team members", Users],
    ],
  },
];
export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  return (
    <>
      <button
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <NavLink to="/" className="brand" onClick={onClose}>
          <span className="brand-symbol">
            <Box size={25} />
          </span>
          <span>
            Storix<span className="brand-caption">WAREHOUSE MANAGEMENT</span>
          </span>
        </NavLink>
        <div className="workspace-pill">
          <span className="online-dot" />
          <div>
            Main warehouse<small>Operations workspace</small>
          </div>
          <span className="workspace-count">01</span>
        </div>
        <nav>
          {navGroups
            .filter(
              (g) =>
                (!g.admin || user.role === "admin") &&
                (!g.roles || g.roles.includes(user.role)),
            )
            .map((group) => (
              <div className="nav-group" key={group.title}>
                <p>{group.title}</p>
                {group.items.map(([to, label, Icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon size={18} strokeWidth={1.7} />
                    {label}
                  </NavLink>
                ))}
              </div>
            ))}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">
            {user.profile_image ? (
              <img src={user.profile_image} alt="" />
            ) : (
              user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
            )}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {
                {
                  admin: "Administrator",
                  manager: "Warehouse manager",
                  staff: "Warehouse staff",
                }[user.role]
              }
            </small>
          </div>
          <button
            className="icon-button"
            onClick={() => logout().catch(() => window.location.reload())}
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
    </>
  );
}
