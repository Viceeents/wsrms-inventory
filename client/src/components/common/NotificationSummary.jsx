import { Link } from "react-router-dom";
import { Bell, ArrowRight } from "lucide-react";
import useApi from "../../hooks/useApi";
import { Card } from "./UI";
export default function NotificationSummary() {
  const events = useApi("/notifications", { poll: true });
  const warnings =
    events.data?.items.filter((n) => !n.read_at).slice(0, 3) || [];
  return (
    <Card
      className="mt-6"
      title="Warehouse notifications"
      description={`${events.data?.unread || 0} unread events`}
      actions={
        <Link className="text-link" to="/notifications">
          View all
          <ArrowRight size={15} />
        </Link>
      }
    >
      <div className="dashboard-alerts">
        {warnings.length ? (
          warnings.map((n) => (
            <div
              key={n.id}
              className={`dashboard-alert notification-${n.severity}`}
            >
              <Bell size={16} />
              <span>{n.message}</span>
            </div>
          ))
        ) : (
          <p className="muted text-sm">
            No unread alerts. Capacity and warehouse events will appear here.
          </p>
        )}
      </div>
    </Card>
  );
}
