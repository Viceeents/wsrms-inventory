import { Check, Route, Sparkles } from "lucide-react";
import { Empty, Progress } from "../common/UI";
import { locationLabel, storageType } from "../../utils/storage";
export default function StorageRecommendation({
  locations,
  selected,
  onSelect,
}) {
  if (!locations.length)
    return (
      <Empty
        title="No suitable storage available"
        description="No reachable storage location fits this parcel’s category, size, weight, and quantity. Review the parcel details or ask an administrator to configure available locations."
      />
    );
  return (
    <div className="recommendations">
      {locations.slice(0, 6).map((r, i) => (
        <button
          type="button"
          className={`recommendation ${selected === r.id ? "chosen" : ""}`}
          onClick={() => onSelect(r.id)}
          key={r.id}
        >
          <div className="recommendation-top">
            <strong>{locationLabel(r)}</strong>
            {i === 0 ? (
              <span className="recommendation-tag">
                <Sparkles size={12} />
                Best fit
              </span>
            ) : null}
            <span className="radio-dot">
              {selected === r.id ? <Check size={11} /> : null}
            </span>
          </div>
          <p>
            {storageType(r.storage_type)} ·{" "}
            {r.category_name || "All categories"} · {r.max_size}
          </p>
          <Progress value={r.utilization * 100} />
          <div className="recommendation-bottom">
            <span>
              {r.remaining_capacity} parcels / {r.remaining_units} units free
            </span>
            <span>
              <Route size={13} />
              {r.distance} steps
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
