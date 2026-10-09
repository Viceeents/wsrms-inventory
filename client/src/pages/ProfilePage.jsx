import { useState } from "react";
import useAuth from "../hooks/useAuth";
import useApi from "../hooks/useApi";
import { api } from "../services/api";
import { PageTitle, Card, Field, ErrorMessage } from "../components/common/UI";
import Button from "../components/common/Button";
export default function ProfilePage() {
  const { user, refreshUser } = useAuth(),
    requests = useApi("/profile/requests", { poll: true }),
    account = useApi("/auth/me", { poll: true });
  const [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false);
  const isAdmin = user.role === "admin",
    pending = !isAdmin && requests.data?.some((r) => r.status === "Pending"),
    current = account.data?.profile_image || user.profile_image;
  async function choose(e) {
    setError("");
    setSaved(false);
    setPreview(null);
    const file = e.target.files[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 500000
    ) {
      setError("Choose JPEG, PNG, or WEBP, up to 500 KB.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      if (image.width > 4096 || image.height > 4096)
        throw new Error("Maximum dimensions: 4096 x 4096.");
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } catch (e) {
      setError(e.message || "This image could not be opened.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/profile/requests", {
        method: "POST",
        body: { image: preview },
      });
      setPreview(null);
      account.reload();
      await refreshUser();
      setSaved(isAdmin);
      requests.reload();
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title="Profile" description={`${user.name} · ${user.code}`} />
      <ErrorMessage message={error} />
      {saved && (
        <div role="status" className="alert alert-success">
          Profile picture saved.
        </div>
      )}
      <Card title="Profile picture">
        <div className="card-body">
          <div className="profile-previews">
            <figure>
              {current ? (
                <img
                  className="profile-preview"
                  src={current}
                  alt="Current profile"
                />
              ) : (
                <span className="avatar light">{user.name[0]}</span>
              )}
              <figcaption>Current picture</figcaption>
            </figure>
            {preview && (
              <figure>
                <img
                  className="profile-preview"
                  src={preview}
                  alt="Requested profile preview"
                />
                <figcaption>
                  {isAdmin ? "New picture" : "Requested picture"}
                </figcaption>
              </figure>
            )}
          </div>
          {pending ? (
            <p role="status">Pending admin approval</p>
          ) : (
            <>
              <Field
                label="Change profile picture"
                hint="JPEG, PNG, or WEBP · maximum 500 KB"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={choose}
                />
              </Field>
              <Button
                disabled={
                  !preview || (!isAdmin && (requests.loading || requests.error))
                }
                loading={busy}
                onClick={submit}
              >
                {isAdmin ? "Save picture" : "Submit request"}
              </Button>
            </>
          )}
          {!isAdmin && (
            <p className="muted mt-4">
              Your current picture stays active until another administrator
              approves.
            </p>
          )}
        </div>
      </Card>
      {!isAdmin && (
        <Card title="Request history" className="mt-6">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Status</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {requests.data?.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td>{r.status}</td>
                    <td>
                      {new Date(r.requested_at).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
