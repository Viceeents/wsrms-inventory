import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ScanLine } from "lucide-react";
import { parcelService } from "../services/parcelService";
import { PageTitle, Card, ErrorMessage, Field } from "../components/common/UI";
import Button from "../components/common/Button";
import QRScanner from "../components/qr/QRScanner";
export default function ScanPage() {
  const navigate = useNavigate(),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function find(value) {
    setCode(value);
    setError("");
    setBusy(true);
    try {
      const rows = await parcelService.list({ q: value.trim() });
      const match = rows.find(
        (p) => p.code === value.trim() || p.tracking_number === value.trim(),
      );
      if (!match) {
        setError("No parcel matches this label. Check the code and try again.");
        return;
      }
      navigate(`/parcels/${match.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Scan a parcel"
        description="Scan a QR code or barcode to instantly open its parcel record."
      />
      <div className="scan-layout">
        <Card title="Camera scanner">
          <div className="card-body">
            <QRScanner onScan={find} />
          </div>
        </Card>
        <Card
          title="Scanner or manual entry"
          description="Works with USB scanners that type a code and press Enter."
        >
          <div className="card-body">
            <span className="help-icon">
              <ScanLine size={30} />
            </span>
            <p className="muted my-6">
              Click the field below, then scan the parcel label. You can also
              type an internal parcel code or tracking number.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                find(code);
              }}
            >
              <Field label="Parcel code / tracking number">
                <input
                  required
                  autoComplete="off"
                  value={code}
                  maxLength={100}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="PRC-2026-000001"
                />
              </Field>
              <ErrorMessage message={error} />
              <Button loading={busy}>
                Find parcel
                <ArrowRight size={16} />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </>
  );
}
