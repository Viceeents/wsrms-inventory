import useDraft from "../hooks/useDraft";
import DraftNotice from "../components/common/DraftNotice";
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Truck,
  Check,
  ScanLine,
  Route,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import useApi from "../hooks/useApi";
import { parcelService } from "../services/parcelService";
import { matchesParcel } from "../utils/validators";
import {
  PageTitle,
  Card,
  ErrorMessage,
  LoadState,
  Field,
  Empty,
} from "../components/common/UI";
import SearchBar from "../components/common/SearchBar";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import StatusBadge from "../components/common/StatusBadge";
import ParcelTable from "../components/parcel/ParcelTable";
import RouteUnavailable from "../components/warehouse/RouteUnavailable";
import WarehouseGrid from "../components/warehouse/WarehouseGrid";
import QRScanner from "../components/qr/QRScanner";
import DispatchRouteSummary from "../components/warehouse/DispatchRouteSummary";
import { locationLabel } from "../utils/storage";
export default function DispatchPage() {
  const [params, setParams] = useSearchParams(),
    [parcel, setParcel] = useState(null),
    [route, setRoute] = useState(null),
    [routeFailure, setRouteFailure] = useState(null),
    [direction, setDirection] = useState("inbound"),
    [verification, setVerification] = useState(null),
    [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [code, setCode] = useState(""),
    [scan, setScan] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(null),
    parcels = useApi(`/parcels?q=${encodeURIComponent(q)}`),
    warehouse = useApi("/warehouse", { poll: true });
  const id = params.get("parcel");
  const preparation = useDraft(
    "dispatch-preparation",
    id ? { parcel_id: id } : null,
    (value) => setParams({ parcel: String(value.parcel_id) }),
    !!id && !done,
  );
  useEffect(() => {
    if (!id) {
      setParcel(null);
      setRoute(null);
      return;
    }
    let alive = true;
    setError("");
    setCode("");
    setVerification(null);
    setRoute(null);
    parcelService
      .get(id)
      .then(async (p) => {
        if (!alive) return;
        setParcel(p);
        if (p.status !== "Dispatched") {
          try {
            const r = await parcelService.route(id);
            if (alive) setRoute(r);
          } catch (e) {
            if (alive) {
              setRoute(null);
              setRouteFailure(e.message);
              setError(e.message);
            }
          }
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [id, warehouse.data?.revision]);
  async function verifyCode(value = code) {
    if (!value.trim() || parcel?.status !== "Retrieved") return;
    setCode(value);
    setVerification(null);
    setBusy(true);
    setError("");
    try {
      const result = await parcelService.verify(parcel.id, value);
      setVerification(result.verified ? value.trim() : null);
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function retrieve() {
    setBusy(true);
    setError("");
    try {
      setParcel(await parcelService.retrieve(parcel.id));
      parcels.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function dispatch(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const p = await parcelService.dispatch(parcel.id, code);
      preparation.clear();
      setDone(p);
      parcels.reload();
      warehouse.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const verified =
    verification === code.trim() && matchesParcel(parcel?.code, code);
  return (
    <>
      <RouteUnavailable
        message={routeFailure}
        onClose={() => setRouteFailure(null)}
      />
      <PageTitle
        title="Retrieve & dispatch"
        description="Find the right parcel, follow its route, and verify before release."
      />
      {!done && (
        <DraftNotice
          draft={preparation}
          label="Unfinished dispatch preparation found"
        />
      )}
      <ErrorMessage message={error} />
      {done ? (
        <Card className="checkin-success">
          <span className="success-icon">
            <Truck size={30} />
          </span>
          <p className="eyebrow">DISPATCH COMPLETE</p>
          <h2>Verified. Recorded. On its way.</h2>
          <p className="muted">
            {done.code} has been dispatched. {locationLabel(done)} capacity is
            released.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Button
              onClick={() => {
                setDone(null);
                setParcel(null);
                setParams({});
                setCode("");
                setError("");
              }}
            >
              Dispatch another parcel
            </Button>
            <Link className="btn btn-secondary" to={`/parcels/${done.id}`}>
              View transaction record
            </Link>
          </div>
        </Card>
      ) : !parcel ? (
        <Card
          title="Select a parcel"
          description="Search by internal code or carrier tracking number."
        >
          <form
            className="filter-bar"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(search);
            }}
          >
            <SearchBar value={search} onChange={setSearch} />
            <Button variant="secondary">Search</Button>
          </form>
          <LoadState {...parcels} />
          {parcels.data && (
            <ParcelTable
              parcels={parcels.data
                .filter((p) => p.status !== "Dispatched")
                .slice(0, 15)}
              onSelect={(p) => setParams({ parcel: p.id })}
            />
          )}
        </Card>
      ) : parcel.status === "Dispatched" ? (
        <Card>
          <Empty
            title="This parcel is already dispatched"
            description="Choose another parcel to continue."
          >
            <Button
              onClick={() => {
                setParams({});
                setParcel(null);
              }}
            >
              Choose a parcel
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          <div className="dispatch-summary">
            <div>
              <p className="eyebrow">SELECTED PARCEL</p>
              <h2 className="mono">{parcel.code}</h2>
              <p>{parcel.description}</p>
            </div>
            <div>
              <span className="location-chip">{locationLabel(parcel)}</span>
              <StatusBadge status={parcel.status} />
              <Button
                variant="secondary"
                onClick={() => {
                  setParams({});
                  setParcel(null);
                  setError("");
                }}
              >
                Change parcel
              </Button>
            </div>
          </div>
          <div className="dispatch-layout">
            <Card
              title="1. Locate & retrieve"
              description={
                route
                  ? `Warehouse Access Point → ${locationLabel(parcel)}`
                  : "Calculate a route to the assigned storage location."
              }
            >
              <div className="card-body">
                <LoadState {...warehouse} />
                {warehouse.data && (
                  <WarehouseGrid
                    warehouse={warehouse.data}
                    route={route}
                    direction={direction}
                  />
                )}
                <DispatchRouteSummary
                  route={route}
                  direction={direction}
                  onDirection={setDirection}
                />
                <div className="form-footer">
                  <span className="muted text-sm">
                    <Route size={15} className="inline-icon" />
                    Warehouse Access Point → {parcel.location_code}
                  </span>
                  <Button
                    onClick={retrieve}
                    loading={busy}
                    disabled={!route || parcel.status === "Retrieved"}
                  >
                    <PackageCheck size={17} />
                    {parcel.status === "Retrieved"
                      ? "Retrieved"
                      : "Mark as retrieved"}
                  </Button>
                </div>
              </div>
            </Card>
            <Card
              title="2. Verify & dispatch"
              description="Scan the parcel label to confirm its identity."
            >
              <div className="card-body">
                <div className="verify-illustration">
                  <ScanLine size={46} strokeWidth={1} />
                  <p>The right parcel. Every time.</p>
                </div>
                <p className="muted text-sm mb-5">
                  Use a USB scanner, your camera, or enter the code printed on
                  the label.
                </p>
                <form onSubmit={dispatch}>
                  <Field label="Scanned parcel code">
                    <div className="input-action">
                      <input
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          setVerification(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void verifyCode();
                          }
                        }}
                        placeholder="Scan or enter parcel code"
                        autoComplete="off"
                        maxLength={100}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Open camera scanner"
                        onClick={() => setScan(true)}
                      >
                        <ScanLine size={20} />
                      </button>
                    </div>
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mb-4"
                    disabled={!code || parcel.status !== "Retrieved"}
                    loading={busy}
                    onClick={() => verifyCode()}
                  >
                    Verify code
                  </Button>
                  {code && (
                    <div
                      role="status"
                      className={`verification-result ${verified ? "verified" : "wrong"}`}
                    >
                      {verified ? <Check size={18} /> : <ScanLine size={18} />}
                      <div>
                        <strong>
                          {verified
                            ? "Parcel verified"
                            : matchesParcel(parcel?.code, code)
                              ? "Ready to verify"
                              : "Codes do not match"}
                        </strong>
                        <p>
                          {verified
                            ? "The scanned label matches this parcel."
                            : "Scan the label on the selected parcel."}
                        </p>
                      </div>
                    </div>
                  )}
                  {parcel.status !== "Retrieved" && (
                    <p className="muted text-sm mb-4">
                      Mark this parcel as retrieved before dispatch.
                    </p>
                  )}
                  <Button
                    className="w-full"
                    loading={busy}
                    disabled={
                      !route || !verified || parcel.status !== "Retrieved"
                    }
                  >
                    <Truck size={17} />
                    Confirm dispatch
                    <ArrowRight size={16} />
                  </Button>
                </form>
                <p className="dispatch-note">
                  Dispatch releases storage capacity and records a verified
                  transaction.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
      {scan && (
        <Modal title="Verify parcel label" onClose={() => setScan(false)}>
          <QRScanner
            onScan={(value) => {
              setScan(false);
              void verifyCode(value);
            }}
          />
        </Modal>
      )}
    </>
  );
}
