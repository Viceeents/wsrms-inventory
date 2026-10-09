import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "../common/Button";
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
  const [zoom, setZoom] = useState(1),
    [fit, setFit] = useState(false);
  const rackByCell = useMemo(
    () => new Map((warehouse?.locations || []).map((r) => [r.cell_id, r])),
    [warehouse?.locations],
  );
  const currentRoute =
    route && route.revision === warehouse?.revision ? route : null;
  const path =
    direction === "outbound"
      ? currentRoute?.outbound?.path
      : currentRoute?.inbound?.path;
  const routeCells = useMemo(
    () => new Set((path || []).map(({ row, col }) => `${row}-${col}`)),
    [path],
  );
  if (!warehouse) return null;
  route = currentRoute;
  return (
    <div className={`warehouse-grid-shell ${compact ? "compact" : ""}`}>
      <div className="map-controls">
        <Button
          variant="secondary"
          onClick={() => {
            setFit(false);
            setZoom((v) => Math.max(0.75, v - 0.25));
          }}
          aria-label="Zoom out"
        >
          <Minus size={16} />
        </Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button
          variant="secondary"
          onClick={() => {
            setFit(false);
            setZoom((v) => Math.min(2.5, v + 0.25));
          }}
          aria-label="Zoom in"
        >
          <Plus size={16} />
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setFit(true);
            setZoom(1);
          }}
        >
          Fit to screen
        </Button>
        <span className="muted">Scroll to pan</span>
      </div>
      <div
        className="warehouse-map-viewport"
        tabIndex={0}
        role="region"
        aria-label="Scrollable warehouse map"
      >
        <div
          style={{
            width: `${zoom * 100}%`,
            minWidth: fit ? "100%" : `${600 * zoom}px`,
          }}
        >
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
                  inRoute={routeCells.has(cell.id)}
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
        </div>
      </div>
      <div className="grid-legend">
        {route && (
          <>
            <span>
              <i className="legend-route-start" />
              Start
            </span>
            <span>
              <i className="legend-destination" />
              Destination
            </span>
          </>
        )}

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
