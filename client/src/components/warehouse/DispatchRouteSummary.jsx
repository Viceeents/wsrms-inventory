export default function DispatchRouteSummary({
  route,
  direction = "inbound",
  onDirection,
}) {
  if (!route) return null;
  return (
    <div className="route-summary">
      <dl>
        <div>
          <dt>Route to parcel</dt>
          <dd>{route.inboundSteps} steps</dd>
        </div>
        <div>
          <dt>Return to Access Point</dt>
          <dd>{route.returnSteps} steps</dd>
        </div>
        <div>
          <dt>Total dispatch route</dt>
          <dd>{route.totalSteps} steps</dd>
        </div>
      </dl>
      {onDirection && (
        <div
          className="route-direction"
          role="group"
          aria-label="Route direction"
        >
          <button
            type="button"
            className={direction === "inbound" ? "active" : ""}
            onClick={() => onDirection("inbound")}
          >
            Route to parcel
          </button>
          <button
            type="button"
            className={direction === "outbound" ? "active" : ""}
            onClick={() => onDirection("outbound")}
          >
            Return to Access Point
          </button>
        </div>
      )}
      <small>
        Calculated independently from layout revision {route.revision}. Weighted
        travel cost: {route.totalCost}.
      </small>
    </div>
  );
}
