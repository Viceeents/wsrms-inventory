import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import useApi from "../../hooks/useApi";
import { api } from "../../services/api";
import {
  PageTitle,
  Card,
  LoadState,
  Field,
  ErrorMessage,
} from "../../components/common/UI";
import Button from "../../components/common/Button";
const events = {
  capacity_near_full: "Storage nearing capacity",
  capacity_full: "Storage full",
  check_in: "Parcel check-in completed",
  dispatch: "Parcel dispatch completed",
  verification_failed: "QR / barcode verification failed",
  blocked_route: "Blocked routes / rejected layout changes",
  storage_unavailable: "Storage recommendation unavailable",
  layout_change: "Layout changed / accessibility warnings",
};
export default function SystemSettingsPage() {
  const settings = useApi("/system-settings"),
    [draft, setDraft] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  useEffect(() => setDraft(settings.data), [settings.data]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      settings.setData(
        await api("/system-settings", { method: "PUT", body: draft }),
      );
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION"
        title="System & notification settings"
        description="Configure storage policy and the events shown inside this workspace."
      />
      <LoadState {...settings} />
      <ErrorMessage message={error} />
      {success && (
        <div role="status" className="alert alert-success">
          <Check size={17} />
          System settings saved and audited.
        </div>
      )}
      {draft && (
        <form onSubmit={save}>
          <div className="detail-layout">
            <Card title="Storage policy">
              <div className="card-body">
                <label className="toggle-field">
                  <input
                    type="checkbox"
                    checked={draft.floor_storage_enabled}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        floor_storage_enabled: e.target.checked,
                      })
                    }
                  />
                  Allow new floor-storage assignments
                </label>
                <p className="muted text-sm mb-6">
                  Existing floor parcels remain visible and retrievable when
                  this option is disabled. New check-ins and transfers cannot
                  use floor storage.
                </p>
                <Field
                  label="Nearing capacity threshold (%)"
                  hint="Alerts consider parcel capacity, size units, and weight limits."
                >
                  <input
                    type="number"
                    required
                    min="50"
                    max="99"
                    value={draft.near_full_threshold}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        near_full_threshold: Number(e.target.value),
                      })
                    }
                  />
                </Field>
              </div>
            </Card>
            <Card title="Notification events">
              <div className="card-body">
                {Object.entries(events).map(([key, label]) => (
                  <label className="toggle-field" key={key}>
                    <input
                      type="checkbox"
                      checked={draft.notification_events.includes(key)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notification_events: e.target.checked
                            ? [...draft.notification_events, key]
                            : draft.notification_events.filter(
                                (v) => v !== key,
                              ),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
                <p className="muted text-sm mt-5">
                  Notifications stay inside the app. Capacity and layout alerts
                  are shared; parcel and verification events go to the staff
                  member performing the action.
                </p>
              </div>
            </Card>
          </div>
          <Button className="mt-6" loading={busy}>
            Save system settings
          </Button>
        </form>
      )}
    </>
  );
}
