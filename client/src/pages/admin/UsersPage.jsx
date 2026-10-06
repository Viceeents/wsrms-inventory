import { useState } from "react";
import { Plus, Pencil, Users } from "lucide-react";
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
const blank = { name: "", email: "", password: "", role: "staff", active: 1 };
export default function UsersPage() {
  const users = useApi("/users"),
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
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.data.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="table-main">
                        <span className="avatar light">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{u.name}</strong>
                          <small>{u.email}</small>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{u.code}</td>
                    <td>
                      <span className="role-chip">
                        <Users size={13} />
                        {u.role === "admin"
                          ? "Administrator"
                          : "Warehouse staff"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={u.active ? "Active" : "Inactive"} />
                    </td>
                    <td>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && (
        <Modal
          title={edit.id ? "Edit team member" : "Add team member"}
          onClose={() => setEdit(null)}
        >
          <form onSubmit={save}>
            <ErrorMessage message={error} />
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
            <div className="form-footer">
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
