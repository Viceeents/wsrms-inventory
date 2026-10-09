import { Boxes, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import { Progress } from "../common/UI";
import { locationLabel, storageType } from "../../utils/storage";
import Button from "../common/Button";
export default function StorageInfo({
  location,
  onShowPath,
  routeBusy = false,
}) {
  if (!location)
    return (
      <div className="rack-placeholder">
        <MapPin size={30} />
        <h3>Explore your inventory map</h3>
        <p className="muted">
          Select a storage cell to see its configuration and actual parcels.
        </p>
      </div>
    );
  return (
    <div className="rack-info">
      <span className="rack-icon">
        <Boxes size={24} />
      </span>
      <p className="eyebrow mt-4">STORAGE LOCATION</p>
      <h2>{locationLabel(location)}</h2>
      <p className="muted text-sm mb-3">{storageType(location.storage_type)}</p>
      <StatusBadge status={location.inventory_status} />
      {onShowPath && (
        <Button
          variant="primary"
          className="w-full mt-3"
          disabled={routeBusy}
          onClick={onShowPath}
        >
          {routeBusy ? "Finding path…" : "Show Best Path"}
        </Button>
      )}
      <div className="rack-occupancy">
        <div className="flex justify-between">
          <span>Current parcels</span>
          <strong>
            {location.occupancy} / {location.capacity}
          </strong>
        </div>
        <Progress value={(location.occupancy / location.capacity) * 100} />
        <small>
          {location.parcel_count} parcel records ·{" "}
          {location.active ? "Active" : "Inactive"}
        </small>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Location code</dt>
          <dd>{location.code}</dd>
        </div>
        <div>
          <dt>Size units</dt>
          <dd>
            {location.used_units} / {location.unit_capacity}
          </dd>
        </div>
        <div>
          <dt>Weight</dt>
          <dd>
            {Number(location.used_weight).toFixed(1)} / {location.max_weight} kg
          </dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>
            {location.width_cm} x {location.depth_cm} x {location.height_cm} cm
          </dd>
        </div>
        <div>
          <dt>Available capacity</dt>
          <dd>{Math.max(0, location.capacity - location.occupancy)}</dd>
        </div>
        <div>
          <dt>Maximum size</dt>
          <dd>{location.max_size}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{location.category_name || "Any category"}</dd>
        </div>
        <div>
          <dt>Walkable</dt>
          <dd>{location.walkable ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Can store parcels</dt>
          <dd>{location.can_store ? "Yes" : "No"}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>
            Row {location.row + 1}, column {location.col + 1}
          </dd>
        </div>
      </dl>
      <h3 className="text-sm mt-5 mb-3">Stored parcel IDs</h3>
      <div className="stored-parcels">
        {location.stored_parcels?.length ? (
          location.stored_parcels.map((p) => (
            <Link key={p.id} to={`/parcels/${p.id}`} className="stored-parcel">
              <span className="mono">{p.code}</span>
              <small>
                ID {p.id} · Qty {p.quantity} · {p.status}
              </small>
            </Link>
          ))
        ) : (
          <p className="muted text-sm">This storage location is empty.</p>
        )}
      </div>
      <Link
        className="btn btn-secondary w-full"
        to={`/parcels?location=${location.id}`}
      >
        View location records
      </Link>
    </div>
  );
}
