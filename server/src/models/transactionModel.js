import { all, get } from "../config/database.js";
const query = `SELECT t.*,p.code AS parcel_code,p.description AS parcel_description,u.name AS user_name,u.code AS user_code FROM transactions t LEFT JOIN parcels p ON p.id=t.parcel_id JOIN users u ON u.id=t.user_id`;
export async function listTransactions({
  q = "",
  type = "",
  parcel = "",
} = {}) {
  const conditions = [],
    params = [];
  if (q) {
    conditions.push(
      "(t.code ILIKE ? OR p.code ILIKE ? OR u.name ILIKE ? OR u.code ILIKE ?)",
    );
    params.push(...Array(4).fill(`%${String(q).slice(0, 120)}%`));
  }
  if (type) {
    conditions.push("t.type=?");
    params.push(type);
  }
  if (parcel) {
    conditions.push("t.parcel_id=?");
    params.push(parcel);
  }
  return (
    await all(
      `${query}${conditions.length ? " WHERE " + conditions.join(" AND ") : ""} ORDER BY t.created_at DESC,t.id DESC`,
      ...params,
    )
  ).map((t) => ({
    ...t,
    metadata: JSON.parse(t.metadata),
  }));
}
export const findTransaction = async (id) => {
  const t = await get(`${query} WHERE t.id=?`, id);
  return t
    ? {
        ...t,
        metadata: JSON.parse(t.metadata),
      }
    : null;
};
