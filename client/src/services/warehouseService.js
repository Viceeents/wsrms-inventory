import { api, queryString } from "./api";
export const warehouseService = {
  rackRoute: (rack, start) => api(`/warehouse/racks/${rack}/route${queryString({ start })}`),
  get: () => api("/warehouse"),
  route: (id, start) =>
    api(`/warehouse/locations/${id}/route${queryString({ start })}`),
  save: (body) => api("/warehouse", { method: "PUT", body }),
};
