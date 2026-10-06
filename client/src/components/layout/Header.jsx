import { Menu, ChevronDown, CalendarDays, Bell } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import useApi from "../../hooks/useApi";
import { navGroups } from "./Sidebar";
import formatDate from "../../utils/formatDate";
export default function Header({ onMenu }) {
  const notifications = useApi("/notifications", { poll: true });
  useEffect(() => {
    window.addEventListener("notifications-updated", notifications.reload);
    return () =>
      window.removeEventListener("notifications-updated", notifications.reload);
  }, [notifications.reload]);
  const { pathname } = useLocation();
  const match = navGroups
    .flatMap((g) => g.items)
    .find(([path]) => path === pathname);
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">
        <button
          className="icon-button mobile-menu"
          aria-label="Open menu"
          onClick={onMenu}
        >
          <Menu size={22} />
        </button>
        <span className="breadcrumb">
          Workspace <span>/</span>{" "}
          <strong>{match?.[1] || "Parcel details"}</strong>
        </span>
      </div>
      <div className="topbar-right">
        <Link
          to="/notifications"
          className="notification-button"
          aria-label={`Open notifications, ${notifications.data?.unread || 0} unread`}
        >
          <Bell size={18} />
          {notifications.data?.unread > 0 && (
            <span>{notifications.data.unread}</span>
          )}
        </Link>
        <span className="live-indicator">
          <span />
          Live workspace
        </span>
        <span className="topbar-date">
          <CalendarDays size={15} />
          {formatDate(new Date(), { time: false })}
        </span>
        <span className="warehouse-selector">
          Main warehouse
          <ChevronDown size={14} />
        </span>
      </div>
    </header>
  );
}
