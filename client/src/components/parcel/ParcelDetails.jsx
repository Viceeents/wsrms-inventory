import formatDate from "../../utils/formatDate";
export default function ParcelDetails({ parcel: p }) {
  return (
    <dl className="detail-list">
      <div>
        <dt>Tracking number</dt>
        <dd className="mono">{p.tracking_number || "—"}</dd>
      </div>
      <div>
        <dt>Category</dt>
        <dd>{p.category_name}</dd>
      </div>
      <div>
        <dt>Parcel size</dt>
        <dd>{p.size}</dd>
      </div>
      <div>
        <dt>Quantity</dt>
        <dd>{p.quantity}</dd>
      </div>
      <div>
        <dt>Weight per item</dt>
        <dd>{p.weight} kg</dd>
      </div>
      <div>
        <dt>Total weight</dt>
        <dd>{(p.weight * p.quantity).toFixed(2)} kg</dd>
      </div>
      <div>
        <dt>Assigned location</dt>
        <dd>
          {p.location_code}
          {p.status === "Dispatched" ? " (last location)" : ""}
        </dd>
      </div>
      <div>
        <dt>Checked in</dt>
        <dd>{formatDate(p.checked_in_at)}</dd>
      </div>
      <div>
        <dt>Processed by</dt>
        <dd>
          {p.staff_name} · {p.staff_code}
        </dd>
      </div>
      {p.dispatched_at && (
        <div>
          <dt>Dispatched</dt>
          <dd>{formatDate(p.dispatched_at)}</dd>
        </div>
      )}
    </dl>
  );
}
