import formatDate from "../../utils/formatDate";
export default function TransactionDetails({ transaction: t }) {
  return (
    <>
      <p className="eyebrow">{t.type}</p>
      <h3 className="mono mb-5">{t.code}</h3>
      <dl className="detail-list">
        <div>
          <dt>Parcel</dt>
          <dd className="mono">{t.parcel_code || "—"}</dd>
        </div>
        <div>
          <dt>Processed by</dt>
          <dd>
            {t.user_name} · {t.user_code}
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatDate(t.created_at)}</dd>
        </div>
        <div>
          <dt>Status change</dt>
          <dd>
            {t.previous_status || "—"} → {t.new_status || "—"}
          </dd>
        </div>
        <div>
          <dt>Location change</dt>
          <dd>
            {t.previous_location || "—"} → {t.new_location || "—"}
          </dd>
        </div>
        <div>
          <dt>QR / barcode verified</dt>
          <dd>
            {t.verified === 1
              ? "Verified"
              : t.verified === 0
                ? "Failed"
                : "Not applicable"}
          </dd>
        </div>
      </dl>
      {Object.keys(t.metadata || {}).length > 0 && (
        <details className="audit-metadata">
          <summary>Recorded change details</summary>
          <pre>{JSON.stringify(t.metadata, null, 2)}</pre>
        </details>
      )}
    </>
  );
}
