import { all, get } from "../config/database.js";
import { listLocations } from "./storageLocationModel.js";
export async function getWarehouse() {
  const locations = await listLocations(),
    byCell = new Map(locations.map((l) => [l.cell_id, l]));
  return {
    ...(await get("SELECT * FROM warehouse WHERE id=1")),
    locations,
    cells: (await all("SELECT * FROM grid_cells ORDER BY row,col")).map((c) => {
      const storage = byCell.get(c.id) || null;
      return {
        ...c,
        storage,
        location_id: storage?.id || null,
        location_code: storage?.code || null,
        capacity: storage?.capacity || 0,
        occupancy: storage?.occupancy || 0,
        parcel_count: storage?.parcel_count || 0,
        contains_parcels: Boolean(storage?.parcel_count),
        stored_parcels: storage?.stored_parcels || [],
      };
    }),
  };
}
