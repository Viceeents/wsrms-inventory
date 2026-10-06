import { useEffect, useState } from "react";
import { Check, Type, Palette } from "lucide-react";
import { useAppearance, palette } from "../context/AppearanceContext";
import { PageTitle, Card, Field, ErrorMessage } from "../components/common/UI";
import Button from "../components/common/Button";
import StatusBadge from "../components/common/StatusBadge";
export default function SettingsPage() {
  const { preferences, save } = useAppearance(),
    [draft, setDraft] = useState(preferences),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => setDraft(preferences), [preferences]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await save(draft);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        title="Appearance settings"
        description="Choose a comfortable font size and a readable accent color. Saved to your account."
      />
      <ErrorMessage message={error} />
      {saved && (
        <div role="status" className="alert alert-success">
          <Check size={17} />
          Appearance settings saved.
        </div>
      )}
      <div className="detail-layout">
        <Card title="Your interface">
          <form className="card-body" onSubmit={submit}>
            <Field label="Font size">
              <select
                value={draft.font_size}
                onChange={(e) => {
                  setDraft({ ...draft, font_size: e.target.value });
                  setSaved(false);
                }}
              >
                {["small", "medium", "large"].map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset className="accent-options">
              <legend>
                <Palette size={16} />
                Accent color
              </legend>
              {Object.entries(palette).map(([key, color]) => (
                <label
                  className={draft.accent_color === key ? "selected" : ""}
                  key={key}
                >
                  <input
                    type="radio"
                    name="accent-color"
                    value={key}
                    checked={draft.accent_color === key}
                    onChange={() => {
                      setDraft({ ...draft, accent_color: key });
                      setSaved(false);
                    }}
                  />
                  <span style={{ background: color }} />
                  {key[0].toUpperCase() + key.slice(1)}
                </label>
              ))}
            </fieldset>
            <Button loading={busy} className="mt-6">
              Save appearance
            </Button>
          </form>
        </Card>
        <Card title="Readable by design">
          <div className="card-body">
            <Type size={32} className="muted mb-5" />
            <p className="muted">
              Five predefined colors keep white button text readable. Font
              settings scale navigation, forms, labels, and inventory details.
            </p>
            <div className="appearance-example">
              <h3>Every parcel, accounted for.</h3>
              <p>
                Buttons, active navigation, route highlights, and status badges
                use your saved accent.
              </p>
              <Button type="button">Example action</Button>
              <StatusBadge status="Available" />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
