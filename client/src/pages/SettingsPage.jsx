import { useEffect, useState } from "react";
import { Check, Type } from "lucide-react";
import { useAppearance } from "../context/AppearanceContext";
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
        description="Choose your theme and font size."
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
            <Field label="Theme">
              <select
                value={draft.theme}
                onChange={(e) => setDraft({ ...draft, theme: e.target.value })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </Field>
            <Button loading={busy} className="mt-6">
              Save appearance
            </Button>
          </form>
        </Card>
        <Card title="Readable by design">
          <div className="card-body">
            <Type size={32} className="muted mb-5" />
            <p className="muted">
              Light and dark themes use readable surfaces and text. Font
              settings scale navigation, forms, labels, and inventory details.
            </p>
            <div className="appearance-example">
              <h3>Every parcel, accounted for.</h3>
              <p>
                Buttons, active navigation, route highlights, and status badges
                follow your theme.
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
