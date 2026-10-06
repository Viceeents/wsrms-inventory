import {
  ArrowUpRight,
  PackagePlus,
  Truck,
  History,
  ArrowRightLeft,
  LogIn,
} from "lucide-react";
import formatDate from "../../utils/formatDate";
import { Empty } from "../common/UI";
const icons = {
  "Check-in": PackagePlus,
  Dispatch: Truck,
  "Storage transfer": ArrowRightLeft,
  "Sign-in": LogIn,
};
export default function TransactionTable({
  transactions,
  onSelect,
  compact = false,
}) {
  if (!transactions?.length)
    return (
      <Empty
        title="No transactions yet"
        description="Warehouse actions will appear here."
      />
    );
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{compact ? "Activity" : "Transaction"}</th>
            <th>Parcel</th>
            {!compact && <th>Team member</th>}
            <th>Date & time</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const Icon = icons[t.type] || History;
            return (
              <tr key={t.id}>
                <td>
                  <div className="table-main">
                    <span
                      className={`activity-icon ${t.type === "Dispatch" ? "gold" : ""}`}
                    >
                      <Icon size={16} />
                    </span>
                    <div>
                      <strong>{t.type}</strong>
                      {!compact && <small className="mono">{t.code}</small>}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="mono parcel-code">
                    {t.parcel_code || "—"}
                  </span>
                  <small>
                    {t.new_location || t.previous_location || "Workspace"}
                  </small>
                </td>
                {!compact && (
                  <td>
                    {t.user_name}
                    <small className="mono">{t.user_code}</small>
                  </td>
                )}
                <td className="date-cell">{formatDate(t.created_at)}</td>
                <td>
                  <button
                    className="icon-button"
                    onClick={() => onSelect?.(t)}
                    aria-label={`View transaction ${t.code}`}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
