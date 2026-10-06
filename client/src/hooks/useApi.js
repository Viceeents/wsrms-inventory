import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
export default function useApi(path, { poll = false } = {}) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api(path, { signal: controller.signal })
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active && e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [path, version]);
  useEffect(() => {
    if (!poll) return;
    const timer = setInterval(reload, 30000);
    return () => clearInterval(timer);
  }, [poll, reload]);
  return { data, error, loading, reload, setData };
}
