import { useState } from "react";
import useApi from "../../hooks/useApi";
import useAuth from "../../hooks/useAuth";
import { api } from "../../services/api";
import {
  PageTitle,
  Card,
  LoadState,
  ErrorMessage,
} from "../../components/common/UI";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
export default function ProfileRequestsPage() {
  const requests = useApi("/admin/profile-requests", { poll: true }),
    { user } = useAuth();
  const [selected, setSelected] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function review(status) {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/profile-requests/${selected.id}/review`, {
        method: "POST",
        body: { status },
      });
      setSelected(null);
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
      <PageTitle title="Profile picture requests" />
      <ErrorMessage message={error} />
      <Card>
        <LoadState {...requests} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>User code</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.data?.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.code}</td>
                  <td>{r.status}</td>
                  <td>
                    {new Date(r.requested_at).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                    })}
                  </td>
                  <td>
                    <Button variant="secondary" onClick={() => setSelected(r)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && (
        <Modal
          title={`Profile request · ${selected.code}`}
          onClose={() => setSelected(null)}
        >
          <p>{selected.name}</p>
          <ErrorMessage message={error} />
          <div className="profile-previews">
            <figure>
              {selected.current_image ? (
                <img
                  className="profile-preview"
                  src={selected.current_image}
                  alt="Current profile"
                />
              ) : (
                <span className="avatar light">{selected.name[0]}</span>
              )}
              <figcaption>Current</figcaption>
            </figure>
            <figure>
              <img
                className="profile-preview"
                src={selected.requested_image}
                alt="Requested profile"
              />
              <figcaption>Requested</figcaption>
            </figure>
          </div>
          {selected.status === "Pending" && (
            <div className="form-footer">
              <Button
                variant="secondary"
                disabled={selected.user_id === user.id}
                loading={busy}
                onClick={() => review("Rejected")}
              >
                Reject
              </Button>
              <Button
                disabled={selected.user_id === user.id}
                loading={busy}
                onClick={() => review("Approved")}
              >
                Approve
              </Button>
            </div>
          )}
          {selected.user_id === user.id && (
            <p className="muted">
              Another administrator or manager must review your request.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
