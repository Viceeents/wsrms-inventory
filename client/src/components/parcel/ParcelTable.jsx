import { Link } from "react-router-dom";
import { ArrowUpRight, Package } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import formatDate from "../../utils/formatDate";
import { Empty } from "../common/UI";
export default function ParcelTable({ parcels, onSelect, selected, onToggle }) {
  if (!parcels?.length) return <Empty />;
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {onToggle && <th>Select</th>}
            <th>Parcel</th>
            <th>Category</th>
            <th>Location</th>
            <th>Status</th>
            <th>Check-in date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {parcels.map((p) => (
            <tr key={p.id}>
              {onToggle && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${p.code}`}
                    checked={selected.includes(p.id)}
                    onChange={() => onToggle(p.id)}
                  />
                </td>
              )}
              <td>
                <div className="table-main">
                  <span className="parcel-table-icon">
                    <Package size={18} />
                  </span>
                  <div>
                    <strong className="mono parcel-code">{p.code}</strong>
                    <small>{p.description}</small>
                  </div>
                </div>
              </td>
              <td>
                <span
                  className="category-dot"
                  style={{ background: p.category_color }}
                />
                {p.category_name}
              </td>
              <td>
                <span className="location-chip">{p.location_code}</span>
              </td>
              <td>
                <StatusBadge status={p.status} />
              </td>
              <td className="date-cell">
                {formatDate(p.checked_in_at, { time: false })}
              </td>
              <td>
                {onSelect ? (
                  <button
                    className="icon-button"
                    onClick={() => onSelect(p)}
                    aria-label={`Select ${p.code}`}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                ) : (
                  <Link
                    className="icon-button"
                    to={`/parcels/${p.id}`}
                    aria-label={`View ${p.code}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
