import { api, queryString } from "./api";
export const transactionService = {
  list: (filters) => api(`/transactions${queryString(filters || {})}`),
};
