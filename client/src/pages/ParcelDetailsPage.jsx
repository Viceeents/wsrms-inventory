import useDraft from "../hooks/useDraft";
import DraftNotice from "../components/common/DraftNotice";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Printer, Truck, Route, ArrowRightLeft, Pencil } from "lucide-react";
import useAuth from "../hooks/useAuth";
import ParcelForm from "../components/parcel/ParcelForm";
import useApi from "../hooks/useApi";
import { api } from "../services/api";
import { parcelService } from "../services/parcelService";
import {
  PageTitle,
  Card,
  LoadState,
  ErrorMessage,
  Field,
} from "../components/common/UI";
import StatusBadge from "../components/common/StatusBadge";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import ParcelDetails from "../components/parcel/ParcelDetails";
import RouteUnavailable from "../components/warehouse/RouteUnavailable";
import WarehouseGrid from "../components/warehouse/WarehouseGrid";
import TransactionTable from "../components/transaction/TransactionTable";
import TransactionDetails from "../components/transaction/TransactionDetails";
import LabelPreview from "../components/qr/LabelPreview";
import StorageRecommendation from "../components/parcel/StorageRecommendation";
import DispatchRouteSummary from "../components/warehouse/DispatchRouteSummary";
import { locationLabel } from "../utils/storage";
export default function ParcelDetailsPage() {
  const { id } = useParams(),
    parcel = useApi(`/parcels/${id}`),
    warehouse = useApi("/warehouse"),
    transactions = useApi(`/transactions?parcel=${id}`),
    [route, setRoute] = useState(null),
    [routeFailure, setRouteFailure] = useState(null),
    [direction, setDirection] = useState("inbound"),
    [error, setError] = useState(""),
    [transfer, setTransfer] = useState(null),
    [rack, setRack] = useState(null),
    [busy, setBusy] = useState(false),
    [transaction, setTransaction] = useState(null);
  const { user } = useAuth(),
    categories = useApi("/categories"),
    [edit, setEdit] = useState(null);
  const recovery = useDraft(`parcel-edit-${id}`, edit, setEdit, !!edit);
  const p = parcel.data;
  useEffect(() => {
    setRoute(null);
  }, [id]);
  useEffect(() => {
    if (route?.revision && route.revision !== warehouse.data?.revision)
      setRoute(null);
  }, [route, warehouse.data?.revision]);
  async function getRoute() {
    setError("");
    try {
      setRoute(null);
      const [next, current] = await Promise.all([
        parcelService.route(id),
        api("/warehouse"),
      ]);
      if (next.revision !== current.revision)
        throw new Error("Warehouse layout changed. Show the route again.");
      warehouse.setData(current);
      setRoute(next);
    } catch (e) {
      setRoute(null);
      setRouteFailure(e.message);
      setError(e.message);
    }
  }
  async function saveCorrection(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/parcels/${id}`, { method: "PATCH", body: edit });
      recovery.clear();
      setEdit(null);
      parcel.reload();
      warehouse.reload();
      transactions.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function openTransfer() {
    setError("");
    try {
      const options = await api(`/parcels/${id}/transfer-options`);
      setTransfer(options);
      setRack(options[0]?.id);
    } catch (e) {
      setError(e.message);
    }
  }
  async function confirmTransfer() {
    setBusy(true);
    try {
      await parcelService.transfer(id, rack);
      setTransfer(null);
      parcel.reload();
      warehouse.reload();
      transactions.reload();
      setRoute(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!p || parcel.error) return <LoadState {...parcel} />;
  return (
    <>
      <Link to="/parcels" className="back-link">
        ← Back to parcels
      </Link>
      <RouteUnavailable
        message={routeFailure}
        onClose={() => setRouteFailure(null)}
      />
      <PageTitle
        eyebrow="PARCEL RECORD"
        title={p.code}
        description={p.description}
      >
        <StatusBadge status={p.status} />
        {["admin", "manager"].includes(user.role) && (
          <Button
            variant="secondary"
            onClick={() => {
              setEdit({
                ...p,
                tracking_number: p.tracking_number || "",
                reason: "",
              });
              setError("");
            }}
          >
            <Pencil size={15} />
            Correct record
          </Button>
        )}
        <Link className="btn btn-secondary" to={`/labels?parcel=${id}`}>
          <Printer size={16} />
          Print label
        </Link>
        {p.status !== "Dispatched" && (
          <Link className="btn btn-primary" to={`/dispatch?parcel=${id}`}>
            <Truck size={16} />
            Retrieve & dispatch
          </Link>
        )}
      </PageTitle>
      {["admin", "manager"].includes(user.role) && (
        <DraftNotice
          draft={recovery}
          label="Unfinished parcel correction found"
        />
      )}
      <ErrorMessage message={error} />
      <div className="detail-layout">
        <Card title="Parcel information">
          <div className="card-body">
            <ParcelDetails parcel={p} />
            {p.status === "Stored" && (
              <Button
                className="mt-5"
                variant="secondary"
                onClick={openTransfer}
              >
                <ArrowRightLeft size={16} />
                Transfer storage
              </Button>
            )}
          </div>
        </Card>
        <Card
          title="Storage location"
          description={
            p.status === "Dispatched"
              ? "Historical location · storage capacity released"
              : locationLabel(p)
          }
          actions={
            p.status !== "Dispatched" && (
              <Button variant="secondary" onClick={getRoute}>
                <Route size={16} />
                Show Route
              </Button>
            )
          }
        >
          <div className="card-body">
            <LoadState {...warehouse} />
            {warehouse.data && (
              <WarehouseGrid
                warehouse={warehouse.data}
                route={route}
                direction={direction}
                selected={
                  warehouse.data.locations.find((r) => r.id === p.location_id)
                    ?.cell_id
                }
              />
            )}
            <DispatchRouteSummary
              route={route}
              direction={direction}
              onDirection={setDirection}
            />
            {!route && (
              <p className="muted text-sm mt-4">
                Select “Show Route” to plan retrieval and return to the
                Warehouse Access Point.
              </p>
            )}
          </div>
        </Card>
      </div>
      <div className="detail-layout mt-6">
        <Card title="Parcel activity">
          <LoadState {...transactions} />
          {transactions.data && (
            <TransactionTable
              transactions={transactions.data}
              compact
              onSelect={setTransaction}
            />
          )}
        </Card>
        <Card title="Parcel label">
          <div className="card-body">
            <LabelPreview parcel={p} />
          </div>
        </Card>
      </div>
      {transfer && (
        <Modal
          title="Transfer to a different location"
          onClose={() => setTransfer(null)}
          wide
        >
          <ErrorMessage message={error} />
          <StorageRecommendation
            locations={transfer}
            selected={rack}
            onSelect={setRack}
          />
          <div className="form-footer">
            <Button variant="secondary" onClick={() => setTransfer(null)}>
              Cancel
            </Button>
            <Button disabled={!rack} loading={busy} onClick={confirmTransfer}>
              Confirm transfer
            </Button>
          </div>
        </Modal>
      )}
      {transaction && (
        <Modal title="Transaction record" onClose={() => setTransaction(null)}>
          <TransactionDetails transaction={transaction} />
        </Modal>
      )}
      {edit && (
        <Modal title="Correct parcel record" onClose={() => setEdit(null)} wide>
          <ErrorMessage message={error} />
          <ParcelForm
            value={edit}
            onChange={setEdit}
            categories={categories.data || []}
            onSubmit={saveCorrection}
            busy={busy}
            submitLabel="Save correction"
            footerNote="The original values and reason are recorded in the audit log."
            extraFields={
              <Field label="Reason for correction">
                <textarea
                  required
                  minLength={5}
                  maxLength={250}
                  value={edit.reason}
                  onChange={(e) => setEdit({ ...edit, reason: e.target.value })}
                />
              </Field>
            }
          />
        </Modal>
      )}
    </>
  );
}
