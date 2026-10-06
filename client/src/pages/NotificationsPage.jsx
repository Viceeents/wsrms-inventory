import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import useApi from "../hooks/useApi";
import { api } from "../services/api";
import { PageTitle, Card, LoadState, Empty } from "../components/common/UI";
import Button from "../components/common/Button";
import formatDate from "../utils/formatDate";
export default function NotificationsPage() {
  const notifications = useApi("/notifications", { poll: true });
  async function mark(path) {
    try {
      await api(path, { method: "POST" });
      notifications.reload();
      window.dispatchEvent(new Event("notifications-updated"));
    } catch {
      notifications.reload();
    }
  }
  return (
    <>
      <PageTitle
        title="Notifications"
        description="Storage capacity, parcel events, verification warnings, and accessibility updates."
      >
        <Button
          variant="secondary"
          disabled={!notifications.data?.unread}
          onClick={() => mark("/notifications/read-all")}
        >
          <CheckCheck size={17} />
          Mark all as read
        </Button>
      </PageTitle>
      <LoadState {...notifications} />
      <Card>
        {notifications.data?.items.length
          ? notifications.data.items.map((n) => (
              <article
                className={`notification-item ${n.read_at ? "" : "unread"} notification-${n.severity}`}
                key={n.id}
              >
                <span className="notification-icon">
                  <Bell size={19} />
                </span>
                <div>
                  <strong>{n.message}</strong>
                  <p>
                    {n.type.replaceAll("_", " ")} · {formatDate(n.created_at)}
                  </p>
                  {n.parcel_id && (
                    <Link
                      className="text-link mt-2"
                      to={`/parcels/${n.parcel_id}`}
                    >
                      View parcel
                    </Link>
                  )}
                </div>
                {!n.read_at && (
                  <Button
                    variant="secondary"
                    onClick={() => mark(`/notifications/${n.id}/read`)}
                  >
                    Mark read
                  </Button>
                )}
              </article>
            ))
          : notifications.data && (
              <Empty
                title="You’re all caught up"
                description="New warehouse events will appear here."
              />
            )}
      </Card>
    </>
  );
}
