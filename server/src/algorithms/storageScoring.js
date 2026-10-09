import { dimensionsFit } from "./parcelDimensions.js";
export const sizeUnits = { Small: 1, Medium: 2, Large: 4 };
export function fitsLocation(
  location,
  parcel,
  { floor_storage_enabled = true } = {},
) {
  return (
    dimensionsFit(parcel, location) &&
    location.active &&
    location.can_store &&
    location.availability === "Available" &&
    location.status === "Available" &&
    (floor_storage_enabled || location.storage_type !== "floor_storage") &&
    sizeUnits[parcel.size] <= sizeUnits[location.max_size] &&
    location.occupancy + parcel.quantity <= location.capacity &&
    location.used_units + sizeUnits[parcel.size] * parcel.quantity <=
      location.unit_capacity &&
    location.used_weight + parcel.weight * parcel.quantity <=
      location.max_weight &&
    (!location.category_id || location.category_id === parcel.category_id)
  );
}
export default function storageScoring(location, parcel, cost) {
  const occupancy = Math.max(
    location.occupancy / location.capacity,
    location.used_units / location.unit_capacity,
    location.used_weight / location.max_weight,
  );
  return Number(
    (
      cost * 2 +
      occupancy * 12 +
      (location.category_id === parcel.category_id ? 0 : 4)
    ).toFixed(2),
  );
}
