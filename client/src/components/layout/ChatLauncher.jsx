import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { api } from "../../services/api";
import MessagingPanel from "./MessagingPanel";
export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState({ total: 0, channels: {} });
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
    const timer = setInterval(check, open ? 30000 : 60000);
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
