import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Grid2X2, RotateCw } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useApi from "../hooks/useApi";
import { parcelService } from "../services/parcelService";
import { warehouseService } from "../services/warehouseService";
import {
  PageTitle,
  Card,
  LoadState,
  ErrorMessage,
} from "../components/common/UI";
import Button from "../components/common/Button";
import RouteUnavailable from "../components/warehouse/RouteUnavailable";
import WarehouseGrid from "../components/warehouse/WarehouseGrid";
import StorageInfo from "../components/warehouse/StorageInfo";
import DispatchRouteSummary from "../components/warehouse/DispatchRouteSummary";
export default function WarehouseMapPage() {
  const warehouse = useApi("/warehouse", { poll: true }),
    { user } = useAuth(),
    [params] = useSearchParams(),
    [selected, setSelected] = useState(null),
    [route, setRoute] = useState(null),
    [routeParcel, setRouteParcel] = useState(null),
    [routeFailure, setRouteFailure] = useState(null),
    [direction, setDirection] = useState("inbound"),
    [start, setStart] = useState(""),
    [error, setError] = useState(""),
    [chooseStart, setChooseStart] = useState(false);
  const [rack, setRack] = useState("A");
  const [routeBusy, setRouteBusy] = useState(false);
  const w = warehouse.data;
  useEffect(() => {
    let current = true;
    if (!params.get("parcel")) {
      setRoute(null);
      setRouteParcel(null);
      setRouteFailure(null);
      setError("");
    }
    if (params.get("parcel"))
      Promise.all([
        parcelService.route(params.get("parcel"), start),
        parcelService.get(params.get("parcel")),
      ])
        .then(([r, p]) => {
          if (current) {
            setRoute(r);
            setRouteParcel(p);
            setSelected(r.target);
            setError("");
          }
        })
        .catch((e) => {
          if (current) {
            setRouteParcel(null);
            setRouteFailure(e.message);
            setError(e.message);
            setRoute(null);
          }
        });
    return () => {
      current = false;
    };
  }, [params, start, w?.revision]);
  const storage = w?.locations.filter((l) => l.can_store && l.active) || [];
  async function showLocationPath(location, rackGroup = null) {
    setRouteBusy(true);
    setRoute(null);
    setRouteFailure(null);
    setError("");
    try {
      const [next, current] = await Promise.all([
        rackGroup
          ? warehouseService.rackRoute(rackGroup, start)
          : warehouseService.route(location.id, start),
        warehouseService.get(),
      ]);
      if (next.revision !== current.revision)
        throw new Error("Warehouse layout changed. Show the path again.");
      warehouse.setData(current);
      setRouteParcel(null);
      setDirection("inbound");
      setRoute(next);
      setSelected(next.target);
    } catch (e) {
      setRouteFailure(e.message);
    } finally {
      setRouteBusy(false);
    }
  }
  return (
    <>
      <RouteUnavailable
        message={routeFailure}
        onClose={() => setRouteFailure(null)}
      />
      <PageTitle
        title="Warehouse map"
        description="Your layout and inventory in one map. Select any storage cell."
      >
        <Button variant="secondary" onClick={warehouse.reload}>
          <RotateCw size={16} />
          Refresh
        </Button>
        {["admin", "manager"].includes(user.role) && (
          <Link className="btn btn-primary" to="/admin/layout">
            <Grid2X2 size={16} />
            Edit layout
          </Link>
        )}
      </PageTitle>
      <ErrorMessage message={error} />
      <LoadState {...warehouse} />
      {w && !warehouse.error && (
        <>
          <div className="map-summary">
            <span>
              <strong>
                {storage.filter((l) => l.storage_type === "rack").length}
              </strong>{" "}
              racks
            </span>
            <span>
              <strong>
                {
                  storage.filter((l) => l.storage_type === "floor_storage")
                    .length
                }
              </strong>{" "}
              floor areas
            </span>
            <span>
              <strong>{storage.reduce((n, l) => n + l.occupancy, 0)}</strong>{" "}
              stored parcels
            </span>
            <span>
              Layout revision <strong>{w.revision}</strong>
            </span>
          </div>
          <Card title="Rack destination">
            <div className="card-body rack-picker">
              <div role="group" aria-label="Rack destination">
                {["A", "B", "C"].map((value) => (
                  <button
                    className={`btn ${rack === value ? "btn-primary" : "btn-secondary"}`}
                    key={value}
                    aria-pressed={rack === value}
                    onClick={() => {
                      setRack(value);
                      setSelected(null);
                      setRoute(null);
                      setRouteParcel(null);
                    }}
                  >
                    Rack {value}
                  </button>
                ))}
              </div>
              {!selected && (
                <Button
                  loading={routeBusy}
                  onClick={() => showLocationPath(null, rack)}
                >
                  Show Best Path
                </Button>
              )}
              <p className="muted">
                Routes to the nearest reachable location in the selected rack
                group.
              </p>
            </div>
          </Card>
          <div className="map-layout">
            <Card
              title={routeParcel ? routeParcel.code : w.name}
              description={
                routeParcel
                  ? `Location ${routeParcel.location_code}`
                  : chooseStart
                    ? "Click an active walkable cell to set your start."
                    : "Warehouse Access Point · Receiving + Dispatch"
              }
              actions={
                <Button
                  variant="secondary"
                  onClick={() => setChooseStart((v) => !v)}
                >
                  {chooseStart ? "Cancel" : "Set route start"}
                </Button>
              }
            >
              <div className="card-body">
                <WarehouseGrid
                  warehouse={w}
                  selected={selected}
                  route={route}
                  direction={direction}
                  onCellClick={(cell) => {
                    if (
                      chooseStart &&
                      cell.walkable &&
                      cell.active &&
                      cell.availability === "Available"
                    ) {
                      setRoute(null);
                      setStart(cell.id);
                      setChooseStart(false);
                      setError("");
                    } else {
                      setSelected(cell.id);
                      setRack(null);
                      setRoute(null);
                      setRouteParcel(null);
                    }
                  }}
                />
                <DispatchRouteSummary
                  route={route}
                  direction={direction}
                  onDirection={setDirection}
                />
                {start && (
                  <p className="muted mt-3 text-sm">
                    Start: {start}{" "}
                    <button
                      className="text-link"
                      onClick={() => {
                        setRoute(null);
                        setStart("");
                      }}
                    >
                      Reset to Warehouse Access Point
                    </button>
                  </p>
                )}
              </div>
            </Card>
            <Card>
              {w.locations.some((l) => l.cell_id === selected) ? (
                <StorageInfo
                  location={w.locations.find((l) => l.cell_id === selected)}
                  onShowPath={() =>
                    showLocationPath(
                      w.locations.find((l) => l.cell_id === selected),
                    )
                  }
                  routeBusy={routeBusy}
                />
              ) : selected ? (
                <div className="card-body pt-6">
                  <h2>
                    {w.cells.find((c) => c.id === selected)?.type === "door"
                      ? "Warehouse Access Point"
                      : "Layout cell"}
                  </h2>
                  <dl className="detail-list">
                    <div>
                      <dt>Position</dt>
                      <dd>{selected}</dd>
                    </div>
                    <div>
                      <dt>Walkable</dt>
                      <dd>
                        {w.cells.find((c) => c.id === selected)?.walkable
                          ? "Yes"
                          : "No"}
                      </dd>
                    </div>
                    <div>
                      <dt>Usage</dt>
                      <dd>
                        {{
                          both: "Receiving + Dispatch",
                          receiving: "Receiving",
                          dispatch: "Dispatch",
                        }[w.cells.find((c) => c.id === selected)?.door_usage] ||
                          "No parcel storage"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <StorageInfo />
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
