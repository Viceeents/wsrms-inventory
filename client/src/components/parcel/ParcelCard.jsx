import { Link } from "react-router-dom";
import { Package, ArrowUpRight } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
export default function ParcelCard({ parcel: p }) {
  return (
    <Link className="parcel-result-card" to={`/parcels/${p.id}`}>
      <Package size={22} />
      <div>
        <strong className="mono">{p.code}</strong>
        <p>{p.description}</p>
        <small>
          {p.category_name} · Rack {p.location_code}
        </small>
      </div>
      <StatusBadge status={p.status} />
      <ArrowUpRight size={18} />
    </Link>
  );
}
