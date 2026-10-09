import { Link } from "react-router-dom";
import { ArrowUpRight, Package, MoreVertical } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import formatDate from "../../utils/formatDate";
import { neutralColor } from "../../utils/neutralColor";
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
            <th>Size</th>
            <th>Location</th>
            <th>Status</th>
            <th>Staff</th>
            <th>Updated</th>
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
                  style={{ background: neutralColor(p.category_color) }}
                />
                {p.category_name}
              </td>
              <td
                title={
                  p.length_cm
                    ? `${p.length_cm} x ${p.width_cm} x ${p.height_cm} cm`
                    : "Not measured"
                }
              >
                {p.size}
              </td>
              <td>
                <span className="location-chip">{p.location_code}</span>
              </td>
              <td>
                <StatusBadge status={p.status} />
              </td>
              <td>{p.staff_name}</td>
              <td className="date-cell">
                {formatDate(p.dispatched_at || p.checked_in_at, {
                  time: false,
                })}
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
                  <div className="table-actions">
                    <Link
                      className="text-link"
                      aria-label={`View ${p.code}`}
                      to={`/parcels/${p.id}`}
                    >
                      View
                    </Link>
                    <details className="overflow-actions">
                      <summary aria-label={`More actions for ${p.code}`}>
                        <MoreVertical size={16} />
                      </summary>
                      <div>
                        <Link to={`/parcels/${p.id}`}>View details</Link>
                        {p.status !== "Dispatched" && (
                          <Link to={`/warehouse?parcel=${p.id}`}>
                            View route
                          </Link>
                        )}
                        <Link to={`/labels?parcel=${p.id}`}>Print label</Link>
                        <Link to={`/transactions?parcel=${p.id}`}>
                          Transaction history
                        </Link>
                      </div>
                    </details>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
