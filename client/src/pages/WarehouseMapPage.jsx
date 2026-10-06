import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Grid2X2, RotateCw } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useApi from "../hooks/useApi";
import { parcelService } from "../services/parcelService";
import {
  PageTitle,
  Card,
  LoadState,
  ErrorMessage,
} from "../components/common/UI";
import Button from "../components/common/Button";
import WarehouseGrid from "../components/warehouse/WarehouseGrid";
import StorageInfo from "../components/warehouse/StorageInfo";
import DispatchRouteSummary from "../components/warehouse/DispatchRouteSummary";
export default function WarehouseMapPage() {
  const warehouse = useApi("/warehouse", { poll: true }),
    { user } = useAuth(),
    [params] = useSearchParams(),
    [selected, setSelected] = useState(null),
    [route, setRoute] = useState(null),
    [direction, setDirection] = useState("inbound"),
    [start, setStart] = useState(""),
    [error, setError] = useState(""),
    [chooseStart, setChooseStart] = useState(false);
  const w = warehouse.data;
  useEffect(() => {
    let current = true;
    if (params.get("parcel"))
      parcelService
        .route(params.get("parcel"), start)
        .then((r) => {
          if (current) {
            setRoute(r);
            setError("");
          }
        })
        .catch((e) => {
          if (current) {
            setError(e.message);
            setRoute(null);
          }
        });
    return () => {
      current = false;
    };
  }, [params, start, w?.revision]);
  const storage = w?.locations.filter((l) => l.can_store && l.active) || [];
  return (
    <>
      <PageTitle
        title="Warehouse map"
        description="Your layout and inventory in one map. Select any storage cell."
      >
        <Button variant="secondary" onClick={warehouse.reload}>
          <RotateCw size={16} />
          Refresh
        </Button>
        {user.role === "admin" && (
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
          <div className="map-layout">
            <Card
              title={w.name}
              description={
                chooseStart
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
                      setStart(cell.id);
                      setChooseStart(false);
                      setError("");
                    } else setSelected(cell.id);
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
                    <button className="text-link" onClick={() => setStart("")}>
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
