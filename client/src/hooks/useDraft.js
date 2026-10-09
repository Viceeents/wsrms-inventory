import { useEffect, useRef, useState } from "react";
import useAuth from "./useAuth";
const ttl = 7 * 24 * 3600000;
export default function useDraft(name, value, onRestore, enabled = true) {
  const { user } = useAuth();
  const serialized = JSON.stringify(value);
  const key = `wsrms:draft:${user?.id}:${name}`;
  const [pending, setPending] = useState(null),
    [saved, setSaved] = useState(null),
    [error, setError] = useState("");
  const pendingRef = useRef(null);
  pendingRef.current = pending;
  const latest = useRef({ value, enabled }),
    blocked = useRef(null),
    ready = useRef(false);
  latest.current = { value, enabled };
  useEffect(() => {
    ready.current = false;
    setPending(null);
    setSaved(null);
    blocked.current = null;
    try {
      const raw = localStorage.getItem(key),
        record = raw ? JSON.parse(raw) : null;
      if (
        record?.state === "Draft" &&
        record.version === 1 &&
        Date.now() - Date.parse(record.saved_at) < ttl
      )
        setPending(record);
      else if (raw) localStorage.removeItem(key);
    } catch {
      setError("Draft recovery is unavailable in this browser.");
    }
    ready.current = true;
  }, [key]);
  useEffect(
    () => () => {
      const current = latest.current;
      if (
        !user ||
        pendingRef.current ||
        !current.enabled ||
        current.value == null ||
        JSON.stringify(current.value) === blocked.current
      )
        return;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            state: "Draft",
            saved_at: new Date().toISOString(),
            value: current.value,
          }),
        );
      } catch {}
    },
    [key, user?.id],
  );
  useEffect(() => {
    if (!user || pending || !ready.current) return;
    const persist = () => {
      const current = latest.current;
      if (!current.enabled || current.value == null) return;
      const body = JSON.stringify(current.value);
      if (body === blocked.current) return;
      try {
        const record = {
          version: 1,
          state: "Draft",
          saved_at: new Date().toISOString(),
          value: current.value,
        };
        localStorage.setItem(key, JSON.stringify(record));
        setSaved(record.saved_at);
        setError("");
      } catch {
        setError(
          "Draft could not be saved. Browser storage is full or unavailable.",
        );
      }
    };
    const timer = setTimeout(persist, 800);
    window.addEventListener("pagehide", persist);
    window.addEventListener("beforeunload", persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("beforeunload", persist);
    };
  }, [key, user?.id, serialized, enabled, pending]);
  function clear() {
    try {
      localStorage.removeItem(key);
    } catch {}
    blocked.current = JSON.stringify(latest.current.value);
    setPending(null);
    setSaved(null);
  }
  function restore() {
    const record = pending;
    if (!record) return;
    setPending(null);
    onRestore(record.value);
    setSaved(record.saved_at);
  }
  return { pending, saved, error, restore, discard: clear, clear };
}
