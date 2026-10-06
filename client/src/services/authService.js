import { api } from "./api";
export const authService = {
  me: () => api("/auth/me"),
  login: (body) => api("/auth/login", { method: "POST", body }),
  logout: () => api("/auth/logout", { method: "POST" }),
};
