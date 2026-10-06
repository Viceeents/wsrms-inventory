import { all, get } from "../config/database.js";
const query = `SELECT l.*,c.row,c.col,c.walkable,c.active,c.can_store,c.availability,c.movement_cost,c.type AS cell_type,
 COALESCE(SUM(p.quantity),0) AS occupancy,COUNT(p.id) AS parcel_count,
 COALESCE(SUM(CASE p.size WHEN 'Small' THEN 1 WHEN 'Medium' THEN 2 ELSE 4 END*p.quantity),0) AS used_units,
 COALESCE(SUM(p.weight*p.quantity),0) AS used_weight,cat.name AS category_name,
 COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'code',p.code,'quantity',p.quantity,'status',p.status)) FILTER(WHERE p.id IS NOT NULL),'[]'::jsonb) AS stored_parcels
 FROM storage_locations l JOIN grid_cells c ON c.id=l.cell_id LEFT JOIN parcels p ON p.location_id=l.id AND p.status!='Dispatched' LEFT JOIN categories cat ON cat.id=l.category_id`;
export function enrichLocation(l) {
  const utilization = Math.max(
    l.occupancy / l.capacity,
    l.used_units / l.unit_capacity,
    l.used_weight / l.max_weight,
  );
  return {
    ...l,
    contains_parcels: l.parcel_count > 0,
    utilization,
    inventory_status:
      !l.active || !l.can_store || l.availability === "Blocked"
        ? "Unavailable"
        : l.status !== "Available"
          ? l.status
          : utilization >= 1
            ? "Full"
            : l.occupancy > 0
              ? "Occupied"
              : "Empty",
  };
}
export const listLocations = async () =>
  (await all(`${query} GROUP BY l.id,c.id,cat.name ORDER BY l.code`)).map(
    enrichLocation,
  );
export const findLocation = async (id) => {
  const l = await get(`${query} WHERE l.id=? GROUP BY l.id,c.id,cat.name`, id);
  return l ? enrichLocation(l) : null;
};
