import useDraft from "../hooks/useDraft";
import DraftNotice from "../components/common/DraftNotice";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PackagePlus, Check, ArrowLeft, Printer, MapPin } from "lucide-react";
import useApi from "../hooks/useApi";
import { parcelService } from "../services/parcelService";
import {
  PageTitle,
  Card,
  ErrorMessage,
  LoadState,
} from "../components/common/UI";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import ParcelForm from "../components/parcel/ParcelForm";
import StorageRecommendation from "../components/parcel/StorageRecommendation";
import WarehouseGrid from "../components/warehouse/WarehouseGrid";
import QRScanner from "../components/qr/QRScanner";
import LabelPreview from "../components/qr/LabelPreview";
const initial = {
  tracking_number: "",
  description: "",
  category_id: "",
  size: "Small",
  weight: "",
  quantity: 1,
};
export default function CheckInPage() {
  const categories = useApi("/categories"),
    warehouse = useApi("/warehouse"),
    [form, setForm] = useState(initial),
    [recommendations, setRecommendations] = useState(null),
    [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [parcel, setParcel] = useState(null),
    [scan, setScan] = useState(false);
  const draft = useDraft(
    "check-in",
    form,
    setForm,
    !parcel && JSON.stringify(form) !== JSON.stringify(initial),
  );
  async function recommend(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const locations = await parcelService.recommend(form);
      setRecommendations(locations);
      setSelected(locations[0]?.id || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    setBusy(true);
    setError("");
    try {
      setParcel(await parcelService.create({ ...form, location_id: selected }));
      draft.clear();
      warehouse.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const picked = recommendations?.find((r) => r.id === selected);
  return (
    <>
      <PageTitle
        title="Check-in parcel"
        description="Register an arrival and give it the right place in your warehouse."
      />
      {!parcel && (
        <DraftNotice draft={draft} label="Unfinished check-in found" />
      )}
      <ErrorMessage message={error} />
      {categories.loading || categories.error ? (
        <LoadState {...categories} />
      ) : parcel ? (
        <Card className="checkin-success">
          <span className="success-icon">
            <Check size={32} />
          </span>
          <p className="eyebrow">CHECK-IN COMPLETE</p>
          <h2>Your parcel is ready for storage.</h2>
          <p className="muted">
            {parcel.code} has been assigned to {parcel.location_code}. The
            check-in is recorded.
          </p>
          <LabelPreview parcel={parcel} />
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              className="btn btn-primary"
              to={`/labels?parcel=${parcel.id}`}
            >
              <Printer size={17} />
              Print label
            </Link>
            <Link className="btn btn-secondary" to={`/parcels/${parcel.id}`}>
              View parcel
            </Link>
            <Button
              variant="secondary"
              onClick={() => {
                setParcel(null);
                setForm(initial);
                setRecommendations(null);
                setError("");
              }}
            >
              <PackagePlus size={16} />
              Check-in another
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="steps-bar">
            <span className={recommendations ? "complete" : "current"}>
              <i>{recommendations ? <Check size={13} /> : 1}</i>Parcel details
            </span>
            <b />
            <span className={recommendations ? "current" : ""}>
              <i>2</i>Storage location
            </span>
            <b />
            <span>
              <i>3</i>Label & finish
            </span>
          </div>
          {!recommendations ? (
            <div className="checkin-layout">
              <Card
                title="Parcel information"
                description="Enter the parcel details or scan an existing tracking label."
              >
                <div className="card-body">
                  <ParcelForm
                    value={form}
                    onChange={setForm}
                    categories={categories.data || []}
                    onSubmit={recommend}
                    onScan={() => setScan(true)}
                    busy={busy}
                  />
                </div>
              </Card>
              <Card className="help-card">
                <span className="help-icon">
                  <MapPin size={28} />
                </span>
                <h2>A smarter place to store.</h2>
                <p>
                  We’ll recommend a reachable storage location that fits this
                  parcel.
                </p>
                <ul>
                  <li>Available capacity and weight limits</li>
                  <li>Compatible parcel size and category</li>
                  <li>Shortest walk from the Warehouse Access Point</li>
                </ul>
                <div className="help-note">
                  You always confirm the final storage location.
                </div>
              </Card>
            </div>
          ) : (
            <div className="recommendation-layout">
              <Card
                title="Choose a storage location"
                description={`${picked?.parcel_size || ""} - ${form.length_cm} x ${form.width_cm} x ${form.height_cm} cm - ${form.description} · ${form.quantity} item(s) · ${form.weight} kg each`}
              >
                <div className="card-body">
                  <StorageRecommendation
                    locations={recommendations}
                    selected={selected}
                    onSelect={setSelected}
                  />
                  <div className="form-footer">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setRecommendations(null);
                        setError("");
                      }}
                    >
                      <ArrowLeft size={15} />
                      Edit details
                    </Button>
                    <Button
                      onClick={confirm}
                      loading={busy}
                      disabled={!selected}
                    >
                      <Check size={16} />
                      Confirm check-in
                    </Button>
                  </div>
                </div>
              </Card>
              <Card
                title="Your storage route"
                description={
                  picked
                    ? `Entrance → Rack ${picked.code} · ${picked.distance} steps`
                    : "Select a storage location"
                }
              >
                <LoadState {...warehouse} />
                {warehouse.data && (
                  <div className="card-body">
                    <WarehouseGrid
                      warehouse={warehouse.data}
                      route={picked?.route}
                    />
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}
      {scan && (
        <Modal title="Scan tracking number" onClose={() => setScan(false)}>
          <QRScanner
            onScan={(code) => {
              setForm({ ...form, tracking_number: code });
              setScan(false);
            }}
          />
        </Modal>
      )}
    </>
  );
}
