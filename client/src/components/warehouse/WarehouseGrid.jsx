import GridCell from "./GridCell";
import RouteOverlay from "./RouteOverlay";
export default function WarehouseGrid({
  warehouse,
  route,
  selected,
  onCellClick,
  compact = false,
  direction = "inbound",
}) {
  if (!warehouse) return null;
  const rackByCell = new Map(warehouse.locations.map((r) => [r.cell_id, r]));
  return (
    <div className={`warehouse-grid-shell ${compact ? "compact" : ""}`}>
      <div
        className="column-labels"
        style={{ gridTemplateColumns: `repeat(${warehouse.cols},1fr)` }}
      >
        {Array.from({ length: warehouse.cols }, (_, i) => (
          <span key={i}>{String.fromCharCode(65 + i)}</span>
        ))}
      </div>
      <div className="grid-with-labels">
        <div className="row-labels">
          {Array.from({ length: warehouse.rows }, (_, i) => (
            <span key={i}>{String(i + 1).padStart(2, "0")}</span>
          ))}
        </div>
        <div
          className="warehouse-grid"
          style={{
            gridTemplateColumns: `repeat(${warehouse.cols},1fr)`,
            gridTemplateRows: `repeat(${warehouse.rows},1fr)`,
          }}
        >
          {warehouse.cells.map((cell) => (
            <GridCell
              key={cell.id}
              cell={cell}
              location={rackByCell.get(cell.id)}
              selected={selected === cell.id || route?.target === cell.id}
              onClick={onCellClick}
              inRoute={(direction === "outbound"
                ? route?.outbound?.path
                : route?.inbound?.path || route?.path
              )?.includes(cell.id)}
            />
          ))}
          <RouteOverlay
            route={route}
            rows={warehouse.rows}
            cols={warehouse.cols}
            direction={direction}
          />
        </div>
      </div>
      <div className="grid-legend">
        <span>
          <i className="legend-rack" />
          Storage rack
        </span>
        <span>
          <i className="legend-floor_storage" />
          Floor Storage
        </span>
        <span>
          <i className="legend-door" />
          Access Point
        </span>
        <span>
          <i className="legend-occupied" />
          Occupied
        </span>
        <span>
          <i className="legend-full" />
          Full
        </span>
        <span>
          <i className="legend-walkway" />
          Walkway
        </span>
        <span>
          <i className="legend-wall" />
          Wall
        </span>
        <span>
          <i className="legend-blocked" />
          Blocked
        </span>
        <span>
          <i className="legend-route" />
          {direction === "outbound" ? "Return route" : "Route to parcel"}
        </span>
      </div>
    </div>
  );
}
