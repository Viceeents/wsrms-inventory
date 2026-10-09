import { createContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { authService } from "../services/authService";
export const AuthContext = createContext(null);
export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .catch((e) => {
        if (e.status !== 401)
          setError(
            e.status
              ? e.message
              : "Cannot connect to the server. Check your connection and the API deployment.",
          );
      })
      .finally(() => setLoading(false));
    const expire = () => {
      setUser(null);
      setError(
        "Session expired. Sign in to continue; unfinished drafts remain saved.",
      );
    };
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  useEffect(() => {
    if (!user) return;
    let activity = Date.now();
    const touch = () => {
      if (document.visibilityState === "visible") activity = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll"];
    events.forEach((event) =>
      window.addEventListener(event, touch, { passive: true }),
    );
    const beat = () => {
      if (document.visibilityState === "visible" && navigator.onLine)
        api("/presence/heartbeat", {
          method: "POST",
          body: { activity_at: new Date(activity).toISOString() },
        })
          .then((result) =>
            setUser((current) =>
              current
                ? { ...current, profile_image: result.profile_image }
                : null,
            ),
          )
          .catch(() => {});
    };
    beat();
    const timer = setInterval(beat, 60000);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, touch));
    };
  }, [user?.id]);
  const login = async (body) => {
    const u = await authService.login(body);
    setUser(u);
    setError("");
  };
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshUser: async () => setUser(await authService.me()),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
