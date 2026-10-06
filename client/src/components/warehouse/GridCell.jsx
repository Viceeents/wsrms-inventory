import { ArrowLeftRight, Lock } from "lucide-react";
import { cellType, locationLabel } from "../../utils/storage";
export default function GridCell({
  cell,
  location,
  selected,
  onClick,
  inRoute,
}) {
  const utilization = location
    ? Math.max(
        (location.occupancy || 0) / location.capacity,
        (location.used_units || 0) / location.unit_capacity,
        (location.used_weight || 0) / location.max_weight,
      )
    : 0;
  const state =
    !cell.active ||
    cell.availability === "Blocked" ||
    location?.status === "Blocked"
      ? "unavailable"
      : utilization >= 1
        ? "full"
        : location?.occupancy
          ? "occupied"
          : "empty";
  return (
    <button
      type="button"
      onClick={() => onClick?.(cell)}
      aria-label={`${cellType(cell.type)} row ${cell.row + 1} column ${cell.col + 1}${location ? `, ${locationLabel(location)}, ${state}, ${location.occupancy || 0} of ${location.capacity} parcels` : ""}`}
      title={
        location
          ? `${location.code} · ${location.occupancy || 0}/${location.capacity} parcels · ${state}`
          : cellType(cell.type)
      }
      className={`grid-cell cell-${cell.type} inventory-${state} ${selected ? "selected" : ""} ${inRoute ? "on-route" : ""}`}
    >
      <span>
        {location && cell.can_store ? (
          <>
            <b>{location.code}</b>
            <small>
              {location.occupancy || 0}/{location.capacity}
            </small>
          </>
        ) : cell.type === "door" ? (
          <ArrowLeftRight size={18} />
        ) : cell.type === "blocked" || !cell.active ? (
          <Lock size={13} />
        ) : null}
      </span>
      {location && cell.can_store && (
        <i style={{ width: `${Math.min(100, utilization * 100)}%` }} />
      )}
    </button>
  );
}
