import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
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
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import useAuth from "../../hooks/useAuth";
const blank = { name: "", email: "", password: "", role: "staff", active: 1 };
export default function UsersPage() {
  const { user } = useAuth();
  const [deleteReason, setDeleteReason] = useState("");
  const [archived, setArchived] = useState(false),
    [deleting, setDeleting] = useState(null);
  const users = useApi(archived ? "/users?archived=true" : "/users", {
      poll: true,
    }),
    [edit, setEdit] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(edit.id ? `/users/${edit.id}` : "/users", {
        method: edit.id ? "PUT" : "POST",
        body: edit,
      });
      setEdit(null);
      users.reload();
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
        title="Team members"
        description="Manage the people who keep your warehouse moving."
      >
        <Button
          onClick={() => {
            setEdit(blank);
            setError("");
          }}
        >
          <Plus size={17} />
          Add team member
        </Button>
      </PageTitle>
      <div className="form-footer">
        <Button variant="secondary" onClick={() => setArchived(!archived)}>
          {archived ? "Current users" : "Archived users"}
        </Button>
      </div>
      <Card>
        <LoadState {...users} />
        {users.data && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>User code</th>
                  <th>Role</th>
                  <th>Account</th>
                  <th>Presence</th>
                  <th>Last active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-main">
                        <span className="avatar light">
                          {u.profile_image ? (
                            <img src={u.profile_image} alt="" />
                          ) : (
                            u.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                          )}
                        </span>
                        <div>
                          <button
                            className="text-link"
                            disabled={!!u.deleted_at}
                            onClick={() => {
                              setEdit({ ...u, password: "" });
                              setError("");
                            }}
                          >
                            {u.name}
                          </button>
                          <small>{u.email}</small>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{u.code}</td>
                    <td>
                      <span className="role-chip">
                        <Users size={13} />
                        {
                          {
                            admin: "Administrator",
                            manager: "Warehouse manager",
                            staff: "Warehouse staff",
                          }[u.role]
                        }
                      </span>
                    </td>
                    <td>
                      <StatusBadge
                        status={
                          u.deleted_at
                            ? "Deleted"
                            : u.suspended
                              ? "Suspended"
                              : u.active
                                ? "Active"
                                : "Inactive"
                        }
                      />
                    </td>
                    <td>
                      <span
                        className={`presence presence-${u.presence.toLowerCase()}`}
                      >
                        {u.presence}
                      </span>
                    </td>
                    <td title={u.last_activity_at || ""}>
                      {u.last_activity_at
                        ? Date.now() - new Date(u.last_activity_at) < 60000
                          ? "Now"
                          : `${Math.floor((Date.now() - new Date(u.last_activity_at)) / 60000)} min ago`
                        : "Never"}
                    </td>
                    <td className="user-actions">
                      {!u.deleted_at && (
                        <button
                          className="icon-button"
                          onClick={() => {
                            setEdit({ ...u, password: "" });
                            setError("");
                          }}
                          aria-label={`Edit ${u.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {deleting && (
        <Modal
          title="Delete Account"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <ErrorMessage message={error} />
          <p>Are you sure you want to delete this account?</p>
          <dl className="detail-list">
            <div>
              <dt>User Code</dt>
              <dd>{deleting.code}</dd>
            </div>
            <div>
              <dt>User Name</dt>
              <dd>{deleting.name}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{deleting.role}</dd>
            </div>
          </dl>
          <p>
            This user will no longer be able to log in. Historical transactions
            and audit records will remain available in the archived account.
          </p>
          <Field label="Reason (optional)">
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              maxLength={500}
              disabled={busy}
              rows={2}
            />
          </Field>
          <div className="form-footer">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api(`/users/${deleting.id}`, {
                    method: "DELETE",
                    body: { reason: deleteReason },
                  });
                  setDeleting(null);
                  users.reload();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete Account
            </Button>
          </div>
        </Modal>
      )}
      {edit && (
        <Modal
          title={edit.id ? "Edit team member" : "Add team member"}
          onClose={() => setEdit(null)}
        >
          <form onSubmit={save}>
            <ErrorMessage message={error} />
            {edit.id && (
              <dl className="detail-list">
                <div>
                  <dt>User code</dt>
                  <dd>{edit.code}</dd>
                </div>
                {[
                  ["last_login_at", "Last login"],
                  ["last_activity_at", "Last active"],
                  ["last_logout_at", "Last logout"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <dt>{label}</dt>
                    <dd>
                      {edit[key]
                        ? new Date(edit[key]).toLocaleString("en-PH", {
                            timeZone: "Asia/Manila",
                          })
                        : "Never"}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <Field label="Full name">
              <input
                required
                minLength={2}
                maxLength={80}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Email address">
              <input
                required
                type="email"
                maxLength={200}
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </Field>
            <Field
              label={edit.id ? "New password (optional)" : "Password"}
              hint="At least 10 characters. Changing a password ends existing sessions."
            >
              <input
                type="password"
                autoComplete="new-password"
                required={!edit.id}
                minLength={10}
                maxLength={128}
                value={edit.password}
                onChange={(e) => setEdit({ ...edit, password: e.target.value })}
              />
            </Field>
            <div className="form-grid">
              <Field label="Role">
                <select
                  value={edit.role}
                  onChange={(e) => setEdit({ ...edit, role: e.target.value })}
                >
                  <option value="staff">Warehouse staff</option>
                  <option value="manager">Warehouse manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </Field>
              <Field label="Account status">
                <select
                  value={edit.active}
                  onChange={(e) =>
                    setEdit({ ...edit, active: Number(e.target.value) })
                  }
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </Field>
            </div>
            <label className="toggle-field">
              <input
                type="checkbox"
                checked={edit.suspended || false}
                onChange={(e) =>
                  setEdit({ ...edit, suspended: e.target.checked })
                }
              />
              Suspended
            </label>
            <div className="form-footer">
              {edit.id && (
                <Button
                  variant="danger"
                  type="button"
                  disabled={busy || edit.id === user.id}
                  title={
                    edit.id === user.id
                      ? "You cannot delete your own account."
                      : undefined
                  }
                  onClick={() => {
                    setDeleting(edit);
                    setDeleteReason("");
                    setEdit(null);
                    setError("");
                  }}
                >
                  <Trash2 size={16} />
                  Delete Account
                </Button>
              )}
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEdit(null)}
              >
                Cancel
              </Button>
              <Button loading={busy}>Save team member</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
