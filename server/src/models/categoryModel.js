import { all } from "../config/database.js";
export const listCategories = async () =>
  await all(
    "SELECT c.*,COUNT(p.id) AS parcel_count FROM categories c LEFT JOIN parcels p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name",
  );
