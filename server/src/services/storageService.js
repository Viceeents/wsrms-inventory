import { getWarehouse } from "../models/warehouseModel.js";
import { get } from "../config/database.js";
import storageScoring, { fitsLocation } from "../algorithms/storageScoring.js";
import { routeToLocation } from "./pathfindingService.js";
export async function recommendStorage(parcel, excludeLocationId = null) {
  const warehouse = await getWarehouse(),
    settings = await get("SELECT * FROM system_settings WHERE id=1");
  return warehouse.locations
    .filter(
      (l) => l.id !== excludeLocationId && fitsLocation(l, parcel, settings),
    )
    .flatMap((location) => {
      const route = routeToLocation(warehouse, location);
      return route
        ? [
            {
              ...location,
              distance: route.inboundSteps,
              score: storageScoring(location, parcel, route.inbound.cost),
              remaining_capacity: location.capacity - location.occupancy,
              remaining_units: location.unit_capacity - location.used_units,
              route,
            },
          ]
        : [];
    })
    .sort((a, b) => a.score - b.score || a.code.localeCompare(b.code));
}
