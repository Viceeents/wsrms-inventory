import { useEffect, useRef, useState } from "react";
import { Send, Archive, RefreshCw, Minus } from "lucide-react";
import MemberAvatar from "../common/MemberAvatar";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { Field, ErrorMessage } from "../common/UI";
import useAuth from "../../hooks/useAuth";
import { api } from "../../services/api";

const channels = [
  ["announcements", "Announcements"],
  ["team", "Team"],
  ["updates", "Updates"],
];
const descriptions = {
  team: "Main Warehouse Team",
  announcements: "Warehouse announcements",
  updates: "System updates",
};
export default function MessagingPanel({ unread, onRead, onClose }) {
  const { user } = useAuth();
  const [channel, setChannel] = useState("team");
  const [history, setHistory] = useState({ items: [], hasMore: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [version, setVersion] = useState(0);
  const [archive, setArchive] = useState(null);
  const list = useRef(null);
  const newest = useRef(null);
  const refreshHistory = useRef(null);
  const [typing, setTyping] = useState([]);
  const lastTyping = useRef(0);
  const idleTimer = useRef(null);
  function stopTyping() {
    clearTimeout(idleTimer.current);
    if (!lastTyping.current) return;
    lastTyping.current = 0;
    api("/messages/team/typing", {
      method: "POST",
      body: { typing: false },
    }).catch(() => {});
  }
  function changeDraft(value) {
    setDraft(value);
    if (channel !== "team") return;
    clearTimeout(idleTimer.current);
    if (!value.trim()) {
      stopTyping();
      return;
    }
    const now = Date.now();
    if (now - lastTyping.current >= 4000) {
      lastTyping.current = now;
      api("/messages/team/typing", {
        method: "POST",
        body: { typing: true },
      }).catch(() => {});
    }
    idleTimer.current = setTimeout(stopTyping, 4000);
  }
  useEffect(() => {
    setTyping([]);
    if (channel !== "team") return;
    let active = true,
      pending = false;
    const controller = new AbortController();
    const check = async () => {
      if (document.hidden) {
        stopTyping();
        return;
      }
      if (pending) return;
      pending = true;
      try {
        const activity = await api("/messages/team/activity", {
          signal: controller.signal,
        });
        if (active) {
          setTyping(activity.typing);
          if (activity.latestId > (newest.current || 0))
            refreshHistory.current?.();
        }
      } catch {
        if (active) setTyping([]);
      } finally {
        pending = false;
      }
    };
    check();
    const timer = setInterval(check, 2500);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      stopTyping();
    };
  }, [channel]);
  useEffect(() => {
    let active = true,
      fetching = false;
    const controller = new AbortController();
    setHistory({ items: [], hasMore: false });
    newest.current = null;
    setLoading(true);
    const load = async () => {
      if (document.hidden || fetching) return;
      fetching = true;
      try {
        const next = await api(`/messages/${channel}`, {
          signal: controller.signal,
        });
        if (!active) return;
        const latest = next.items.at(-1)?.id;
        const nearBottom =
          !list.current ||
          list.current.scrollHeight -
            list.current.scrollTop -
            list.current.clientHeight <
            80;
        const initial = newest.current === null;
        setHistory((previous) => {
          if (initial) return next;
          const first = next.items[0]?.id;
          return {
            items: [
              ...previous.items.filter((item) => first && item.id < first),
              ...next.items,
            ],
            hasMore: previous.hasMore,
            members: { ...previous.members, ...next.members },
          };
        });
        setError("");
        if (initial || (nearBottom && newest.current !== latest))
          requestAnimationFrame(() => {
            if (active && list.current)
              list.current.scrollTop = list.current.scrollHeight;
          });
        newest.current = latest || 0;
        if (latest && !document.hidden) {
          await api(`/messages/${channel}/read`, {
            method: "POST",
            body: { through: latest },
            signal: controller.signal,
          });
          if (active) await onRead();
        }
      } catch (e) {
        if (active && e.name !== "AbortError") setError(e.message);
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };
    refreshHistory.current = load;
    load();
    const timer = setInterval(load, 30000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      controller.abort();
      refreshHistory.current = null;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [channel, version, onRead]);

  async function older() {
    setBusy(true);
    try {
      const height = list.current.scrollHeight;
      const next = await api(
        `/messages/${channel}?before=${history.items[0].id}`,
      );
      setHistory((previous) => ({
        items: [...next.items, ...previous.items],
        members: { ...previous.members, ...next.members },
        hasMore: next.hasMore,
      }));
      requestAnimationFrame(() => {
        if (list.current)
          list.current.scrollTop += list.current.scrollHeight - height;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/messages/${channel}`, {
        method: "POST",
        body: { message: draft, title, priority },
      });
      setDraft("");
      setTitle("");
      setPriority("Normal");
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function archiveAnnouncement(id) {
    setBusy(true);
    setError("");
    try {
      await api(`/messages/announcements/${id}`, { method: "DELETE" });
      setArchive(null);
      setVersion((v) => v + 1);
      await onRead();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const canSend =
    channel === "team" ||
    (channel === "announcements" && user.role === "admin");
  return (
    <Modal
      title="Storix Messages"
      headerActions={
        <button
          type="button"
          className="icon-button message-minimize"
          aria-label="Minimize messages"
          disabled={busy}
          onClick={onClose}
        >
          <Minus size={19} />
        </button>
      }
      className="messaging-modal"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <nav className="message-tabs" aria-label="Messaging channels">
        {channels.map(([key, label]) => (
          <button
            type="button"
            key={key}
            disabled={busy}
            aria-pressed={channel === key}
            className={channel === key ? "active" : ""}
            onClick={() => {
              setChannel(key);
              setDraft("");
              setTitle("");
              setArchive(null);
              setError("");
            }}
          >
            {label}
            {unread[key] > 0 && (
              <span className="channel-count">{unread[key]}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="message-channel-heading">
        <h3>{descriptions[channel]}</h3>
        <button
          type="button"
          className="icon-button"
          disabled={busy || loading}
          aria-label="Refresh messages"
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <ErrorMessage message={error} />
      <div
        className="message-history"
        ref={list}
        role="log"
        aria-label={descriptions[channel]}
        aria-live="polite"
        aria-busy={loading}
      >
        {history.hasMore && (
          <Button
            variant="secondary"
            className="w-full"
            loading={busy}
            onClick={older}
          >
            Load earlier messages
          </Button>
        )}
        {loading && <p className="message-empty">Loading messages…</p>}
        {!loading && !history.items.length && (
          <p className="message-empty">
            {channel === "team"
              ? "Start a conversation with your warehouse team."
              : "You’re all caught up. New posts will appear here."}
          </p>
        )}
        {history.items.map((item) => (
          <article
            key={item.id}
            className={`message-item ${item.sender_user_id === user.id ? "own-message" : ""} ${item.unread ? "unread-message" : ""}`}
          >
            <div className="message-meta">
              <MemberAvatar
                name={item.sender_name}
                image={history.members?.[item.sender_user_id]}
              />
              <strong>{item.sender_name}</strong>
              {item.priority !== "Normal" && (
                <span
                  className={`message-priority priority-${item.priority.toLowerCase()}`}
                >
                  {item.priority}
                </span>
              )}
              {item.unread && <span className="message-new">New</span>}
            </div>
            {item.title && <h4>{item.title}</h4>}
            <p>{item.message}</p>
            <div className="message-meta">
              <time dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleString("en-PH", {
                  timeZone: "Asia/Manila",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
              {channel === "announcements" && user.role === "admin" && (
                <button
                  type="button"
                  className="icon-button"
                  disabled={busy}
                  aria-label={`Archive announcement ${item.title}`}
                  onClick={() => setArchive(item.id)}
                >
                  <Archive size={15} />
                </button>
              )}
            </div>
            {archive === item.id && (
              <div className="message-archive-confirm">
                <p>Archive this announcement?</p>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setArchive(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  loading={busy}
                  onClick={() => archiveAnnouncement(item.id)}
                >
                  Archive
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      {channel === "team" && (
        <div className="typing-indicator" role="status" aria-live="polite">
          {typing.length > 0 && (
            <>
              <span className="typing-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>
                {typing.length === 1
                  ? `${typing[0].name} is typing…`
                  : typing.length === 2
                    ? `${typing[0].name} and ${typing[1].name} are typing…`
                    : `${typing[0].name} and ${typing.length - 1} others are typing…`}
              </span>
            </>
          )}
        </div>
      )}
      {canSend && (
        <form className="message-composer" onSubmit={send}>
          {channel === "announcements" && (
            <>
              <Field label="Announcement title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={100}
                  disabled={busy}
                />
              </Field>
              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={busy}
                >
                  {["Normal", "Important", "Urgent"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field
            label={channel === "team" ? "Team message" : "Announcement message"}
          >
            <textarea
              rows={2}
              placeholder="Type a message…"
              value={draft}
              onChange={(e) => changeDraft(e.target.value)}
              onBlur={stopTyping}
              required
              maxLength={2000}
              disabled={busy}
            />
          </Field>
          <div className="message-send">
            <small className="muted">{draft.length} / 2000</small>
            <Button
              type="submit"
              loading={busy}
              disabled={
                !draft.trim() || (channel === "announcements" && !title.trim())
              }
            >
              <Send size={16} />
              {channel === "team" ? "Send" : "Publish announcement"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
