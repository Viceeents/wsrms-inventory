import { all, get } from "../config/database.js";
const query = `SELECT p.*,c.name AS category_name,c.color AS category_color,r.code AS location_code,r.storage_type,u.name AS staff_name,u.code AS staff_code FROM parcels p JOIN categories c ON c.id=p.category_id JOIN storage_locations r ON r.id=p.location_id JOIN users u ON u.id=p.checked_in_by`;
export const findParcel = async (id) => await get(`${query} WHERE p.id=?`, id);
export async function listParcels({
  q = "",
  status = "",
  category = "",
  location = "",
} = {}) {
  const conditions = [],
    params = [];
  if (q) {
    conditions.push(
      "(p.code ILIKE ? OR p.tracking_number ILIKE ? OR p.description ILIKE ? OR r.code ILIKE ?)",
    );
    params.push(...Array(4).fill(`%${String(q).slice(0, 120)}%`));
  }
  if (status) {
    conditions.push("p.status=?");
    params.push(status);
  }
  if (category) {
    conditions.push("p.category_id=?");
    params.push(category);
  }
  if (location) {
    conditions.push("p.location_id=?");
    params.push(location);
  }
  return await all(
    `${query}${conditions.length ? " WHERE " + conditions.join(" AND ") : ""} ORDER BY p.checked_in_at DESC,p.id DESC`,
    ...params,
  );
}
