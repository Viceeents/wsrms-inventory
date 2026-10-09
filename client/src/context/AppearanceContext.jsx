import { createContext, useContext, useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";
import { api } from "../services/api";
const defaults = { font_size: "medium", theme: "light" },
  AppearanceContext = createContext(null);
export const useAppearance = () => useContext(AppearanceContext);
export default function AppearanceProvider({ children }) {
  const { user } = useAuth(),
    [preferences, setPreferences] = useState(defaults),
    [theme, setTheme] = useState("light");
  useEffect(() => {
    let active = true;
    setPreferences(defaults);
    if (user)
      api("/preferences")
        .then((p) => {
          if (active)
            setPreferences({
              ...p,
              theme: p.theme === "dark" ? "dark" : "light",
            });
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);
  useEffect(() => {
    document.documentElement.dataset.font = preferences.font_size;
    delete document.documentElement.dataset.accent;
    const resolved = preferences.theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = resolved;
    setTheme(resolved);
  }, [preferences]);
  async function save(next) {
    const result = await api("/preferences", { method: "PUT", body: next });
    setPreferences(result);
    return result;
  }
  return (
    <AppearanceContext.Provider
      value={{
        preferences,
        save,
        theme,
        accent: theme === "dark" ? "#75b6ff" : "#1769d2",
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}
