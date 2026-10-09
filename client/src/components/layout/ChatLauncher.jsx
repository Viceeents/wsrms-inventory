import { useCallback, useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import MemberAvatar from "../common/MemberAvatar";
import { api } from "../../services/api";
import MessagingPanel from "./MessagingPanel";
export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState({ total: 0, channels: {} });
  const [dismissed, setDismissed] = useState({});
  const refresh = useCallback(
    async () => setUnread(await api("/messages/unread")),
    [],
  );
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const check = () => {
      if (document.hidden) return;
      api("/messages/unread", { signal: controller.signal })
        .then((value) => {
          if (active) setUnread(value);
        })
        .catch(() => {});
    };
    check();
    const timer = setInterval(check, open ? 30000 : 15000);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [open]);
  return (
    <>
      {!open && (
        <div className="chat-heads" aria-label="Unread team conversations">
          {(unread.heads || [])
            .filter((head) => dismissed[head.id] !== head.latest_id)
            .map((head) => (
              <div className="chat-head-wrap" key={head.id}>
                <button
                  type="button"
                  className="chat-head"
                  aria-label={`Open team chat, ${head.unread} unread from ${head.name}`}
                  title={`${head.name} · Main Warehouse Team`}
                  onClick={() => setOpen(true)}
                >
                  <MemberAvatar name={head.name} image={head.profile_image} />
                  <span className="message-badge" aria-hidden="true">
                    {head.unread > 99 ? "99+" : head.unread}
                  </span>
                </button>
                <button
                  type="button"
                  className="chat-head-dismiss"
                  aria-label={`Dismiss chat head for ${head.name}`}
                  onClick={() =>
                    setDismissed((previous) => ({
                      ...previous,
                      [head.id]: head.latest_id,
                    }))
                  }
                >
                  <X size={12} />
                </button>
              </div>
            ))}
        </div>
      )}
      {!open && (
        <button
          className="chat-launcher"
          aria-label={`Open Storix messages${unread.total ? `, ${unread.total} unread` : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <MessageCircle size={24} />
          {unread.total > 0 && (
            <span className="message-badge" aria-hidden="true">
              {unread.total > 99 ? "99+" : unread.total}
            </span>
          )}
        </button>
      )}
      {open && (
        <MessagingPanel
          unread={unread.channels}
          onRead={refresh}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
