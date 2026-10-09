import { classifyParcel } from "../algorithms/parcelDimensions.js";
import { getWarehouse } from "../models/warehouseModel.js";
import { get } from "../config/database.js";
import storageScoring, { fitsLocation } from "../algorithms/storageScoring.js";
import { routeToLocation } from "./pathfindingService.js";
export async function recommendStorage(parcel, excludeLocationId = null) {
  const warehouse = await getWarehouse(),
    settings = await get("SELECT * FROM system_settings WHERE id=1");
  parcel = { ...parcel, size: classifyParcel(parcel, settings.size_limits) };
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
              parcel_size: parcel.size,
              reason:
                location.storage_type === "rack"
                  ? "Nearest compatible rack with sufficient capacity."
                  : "Compatible floor storage; use when no suitable rack is available.",
              distance: route.inboundSteps,
              score: storageScoring(location, parcel, route.inbound.cost),
              remaining_capacity: location.capacity - location.occupancy,
              remaining_units: location.unit_capacity - location.used_units,
              route,
            },
          ]
        : [];
    })
    .sort(
      (a, b) =>
        (a.storage_type === "floor_storage") -
          (b.storage_type === "floor_storage") ||
        a.route.inbound.cost - b.route.inbound.cost ||
        a.utilization - b.utilization ||
        a.code.localeCompare(b.code),
    );
}
