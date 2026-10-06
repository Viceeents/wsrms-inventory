import { api } from "./api";
export const reportService = {
  summary: () => api("/reports"),
  exportUrl: (kind) => `/api/reports/export/${kind}`,
};
