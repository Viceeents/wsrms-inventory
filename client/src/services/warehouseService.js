import { api, queryString } from "./api";
export const warehouseService = {
  get: () => api("/warehouse"),
  route: (id, start) =>
    api(`/warehouse/locations/${id}/route${queryString({ start })}`),
  save: (body) => api("/warehouse", { method: "PUT", body }),
};
