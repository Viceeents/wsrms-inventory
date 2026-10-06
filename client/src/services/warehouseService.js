import { api } from "./api";
export const warehouseService = {
  get: () => api("/warehouse"),
  save: (body) => api("/warehouse", { method: "PUT", body }),
};
