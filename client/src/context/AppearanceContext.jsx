import { createContext, useContext, useEffect, useState } from "react";
import useAuth from "../hooks/useAuth";
import { api } from "../services/api";
export const palette = {
  blue: "#1d4ed8",
  teal: "#0f766e",
  green: "#245d46",
  purple: "#6d28d9",
  orange: "#9a3412",
};
const defaults = { font_size: "medium", accent_color: "green" },
  AppearanceContext = createContext(null);
export const useAppearance = () => useContext(AppearanceContext);
export default function AppearanceProvider({ children }) {
  const { user } = useAuth(),
    [preferences, setPreferences] = useState(defaults);
  useEffect(() => {
    let active = true;
    setPreferences(defaults);
    if (user)
      api("/preferences")
        .then((p) => {
          if (active) setPreferences(p);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id]);
  useEffect(() => {
    document.documentElement.dataset.font = preferences.font_size;
    document.documentElement.dataset.accent = preferences.accent_color;
  }, [preferences]);
  async function save(next) {
    const result = await api("/preferences", { method: "PUT", body: next });
    setPreferences(result);
    return result;
  }
  return (
    <AppearanceContext.Provider
      value={{ preferences, save, accent: palette[preferences.accent_color] }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}
