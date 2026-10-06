import { Box } from "lucide-react";
import QRGenerator from "./QRGenerator";
import BarcodeGenerator from "./BarcodeGenerator";
import formatDate from "../../utils/formatDate";
import { locationLabel } from "../../utils/storage";
export default function LabelPreview({ parcel, onReady }) {
  return (
    <article className="parcel-label">
      <div className="label-top">
        <span>
          <Box size={18} />
          wsrms
        </span>
        <strong>{locationLabel(parcel)}</strong>
      </div>
      <div className="label-center">
        <div>
          <p className="eyebrow">PARCEL IDENTIFIER</p>
          <h3 className="mono">{parcel.code}</h3>
          <p>{parcel.description}</p>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{parcel.category_name}</dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{formatDate(parcel.checked_in_at, { time: false })}</dd>
            </div>
            <div>
              <dt>Qty / weight</dt>
              <dd>
                {parcel.quantity} / {parcel.weight} kg each
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{parcel.status}</dd>
            </div>
          </dl>
        </div>
        <QRGenerator value={parcel.code} size={92} onReady={onReady} />
      </div>
      <BarcodeGenerator value={parcel.code} />
      <p className="label-footer mono">{parcel.code}</p>
    </article>
  );
}
