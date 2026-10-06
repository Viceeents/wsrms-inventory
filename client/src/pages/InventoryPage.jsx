import { useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, ArrowUpRight } from "lucide-react";
import useApi from "../hooks/useApi";
import {
  PageTitle,
  Card,
  LoadState,
  Progress,
  Empty,
} from "../components/common/UI";
import SearchBar from "../components/common/SearchBar";
import StatusBadge from "../components/common/StatusBadge";
import { locationLabel, storageType } from "../utils/storage";
export default function InventoryPage() {
  const warehouse = useApi("/warehouse", { poll: true }),
    [q, setQ] = useState(""),
    [status, setStatus] = useState(""),
    [type, setType] = useState("");
  const locations = warehouse.data?.locations.filter(
    (l) =>
      l.code.toLowerCase().includes(q.toLowerCase()) &&
      (!status || l.inventory_status === status) &&
      (!type || l.storage_type === type),
  );
  return (
    <>
      <PageTitle
        title="Inventory & storage"
        description="Monitor racks, floor areas, capacity, and the parcels inside them."
      />
      <Card>
        <div className="filter-bar">
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Search location code…"
          />
          <select
            aria-label="Filter storage type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All storage types</option>
            {["rack", "floor_storage", "walkway"].map((t) => (
              <option key={t} value={t}>
                {storageType(t)}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter storage status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {[
              "Empty",
              "Occupied",
              "Full",
              "Reserved",
              "Blocked",
              "Unavailable",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </Card>
      <LoadState {...warehouse} />
      {locations && (
        <div className="rack-cards mt-6">
          {locations.length ? (
            locations.map((l) => (
              <Card className="rack-card" key={l.id}>
                <div className="flex justify-between items-start">
                  <span className="rack-icon">
                    <Boxes size={24} />
                  </span>
                  <StatusBadge status={l.inventory_status} />
                </div>
                <h2 className="mt-5">{locationLabel(l)}</h2>
                <p className="muted text-sm">
                  {storageType(l.storage_type)} ·{" "}
                  {l.category_name || "Any category"}
                </p>
                <div className="flex justify-between mt-6 mb-2 text-sm">
                  <span>
                    {l.occupancy} / {l.capacity} parcels
                  </span>
                  <strong>{Math.round(l.utilization * 100)}%</strong>
                </div>
                <Progress value={l.utilization * 100} />
                <p className="muted text-xs mt-3">
                  {l.used_units}/{l.unit_capacity} size units ·{" "}
                  {Number(l.used_weight).toFixed(1)}/{l.max_weight} kg
                </p>
                <div className="rack-card-footer">
                  <span>
                    {l.parcel_count} records ·{" "}
                    {l.active ? "Active" : "Inactive"}
                  </span>
                  <Link
                    className="icon-button"
                    to={`/parcels?location=${l.id}`}
                    aria-label={`View storage ${l.code}`}
                  >
                    <ArrowUpRight size={19} />
                  </Link>
                </div>
              </Card>
            ))
          ) : (
            <Empty title="No matching storage locations" />
          )}
        </div>
      )}
    </>
  );
}
