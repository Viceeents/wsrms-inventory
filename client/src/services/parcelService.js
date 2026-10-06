import { api, queryString } from "./api";
export const parcelService = {
  list: (filters) => api(`/parcels${queryString(filters || {})}`),
  get: (id) => api(`/parcels/${id}`),
  recommend: (body) =>
    api("/parcels/recommendations", { method: "POST", body }),
  create: (body) => api("/parcels", { method: "POST", body }),
  route: (id, start) => api(`/parcels/${id}/route${queryString({ start })}`),
  retrieve: (id) => api(`/parcels/${id}/retrieve`, { method: "POST" }),
  verify: (id, scanned_code) =>
    api(`/parcels/${id}/verify`, { method: "POST", body: { scanned_code } }),
  dispatch: (id, scanned_code) =>
    api(`/parcels/${id}/dispatch`, { method: "POST", body: { scanned_code } }),
  transfer: (id, location_id) =>
    api(`/parcels/${id}/transfer`, { method: "POST", body: { location_id } }),
};
