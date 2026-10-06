import { createContext, useEffect, useState } from "react";
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
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
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
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
