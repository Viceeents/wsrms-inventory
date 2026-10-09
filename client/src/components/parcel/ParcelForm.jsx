import { ScanLine, ArrowRight } from "lucide-react";
import Button from "../common/Button";
import { Field } from "../common/UI";
export default function ParcelForm({
  value,
  onChange,
  categories,
  onSubmit,
  onScan,
  busy,
  submitLabel = "Recommend storage",
  footerNote = "An internal parcel code is generated on check-in.",
  extraFields,
}) {
  const change = (key, v) => onChange({ ...value, [key]: v });
  return (
    <form onSubmit={onSubmit}>
      <div className="form-grid">
        <Field
          label="External tracking number"
          hint="Optional · use the carrier’s existing code."
        >
          <div className="input-action">
            <input
              value={value.tracking_number}
              maxLength={100}
              onChange={(e) => change("tracking_number", e.target.value)}
              placeholder="e.g. TRK-860001"
            />
            {onScan && (
              <button
                type="button"
                className="icon-button"
                aria-label="Scan external tracking number"
                onClick={onScan}
              >
                <ScanLine size={19} />
              </button>
            )}
          </div>
        </Field>
        <Field label="Category">
          <select
            required
            value={value.category_id}
            onChange={(e) => change("category_id", Number(e.target.value))}
          >
            <option value="">Select a category</option>
            {categories
              .filter((c) => c.active || c.id === value.category_id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="col-span-2">
          <Field label="Parcel description">
            <textarea
              required
              minLength={3}
              maxLength={250}
              value={value.description}
              onChange={(e) => change("description", e.target.value)}
              placeholder="Describe the contents of this parcel"
              rows={3}
            />
          </Field>
        </div>
        {[
          ["length_cm", "Length"],
          ["width_cm", "Width"],
          ["height_cm", "Height"],
        ].map(([key, label]) => (
          <Field key={key} label={`${label} (cm)`}>
            <input
              required
              type="number"
              min="0.1"
              max="10000"
              step="0.1"
              value={value[key] ?? ""}
              onChange={(e) => change(key, e.target.value)}
            />
          </Field>
        ))}
        <Field label="Weight per item (kg)">
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="10000"
            required
            value={value.weight}
            onChange={(e) => change("weight", e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Quantity">
          <input
            type="number"
            min="1"
            max="10000"
            step="1"
            required
            value={value.quantity}
            onChange={(e) => change("quantity", e.target.value)}
          />
        </Field>
      </div>
      {extraFields}
      <div className="form-footer">
        <p className="muted">{footerNote}</p>
        <Button loading={busy}>
          {submitLabel}
          <ArrowRight size={17} />
        </Button>
      </div>
    </form>
  );
}
