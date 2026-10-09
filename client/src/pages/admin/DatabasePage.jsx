import { useState } from "react";
import useApi from "../../hooks/useApi";
import { api } from "../../services/api";
import {
  PageTitle,
  Card,
  LoadState,
  ErrorMessage,
  Field,
} from "../../components/common/UI";
import Button from "../../components/common/Button";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
const date = (v) =>
  v
    ? new Date(v).toLocaleString("en-PH", { timeZone: "Asia/Manila" })
    : "No successful activity";
export default function DatabasePage() {
  const health = useApi("/admin/database", { poll: true }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [history, setHistory] = useState(false),
    [restore, setRestore] = useState(null),
    [confirmation, setConfirmation] = useState(""),
    [password, setPassword] = useState("");
  async function backup() {
    setBusy(true);
    setError("");
    try {
      await api("/admin/database/backups", { method: "POST" });
      setMessage("Backup completed successfully.");
      health.reload();
    } catch (e) {
      setError(e.message);
      health.reload();
    } finally {
      setBusy(false);
    }
  }
  async function recover(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api("/admin/database/restore", {
        method: "POST",
        body: { backup_id: restore.id, confirmation, password },
      });
      setMessage(result.message);
      setRestore(null);
      setPassword("");
      health.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const h = health.data;
  const latestBackup = h?.history.find((b) => b.status === "Completed");
  return (
    <>
      <PageTitle
        title="Database health"
        description="Primary operations and emergency recovery."
      />
      <ErrorMessage message={error} />
      {message && (
        <div role="status" className="alert alert-success">
          {message}
        </div>
      )}
      <LoadState {...health} />
      {h?.high_availability && (
        <Card title="Primary / standby" className="mb-6">
          <div className="card-body">
            {h.high_availability.configured ? (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Server</th>
                        <th>Role</th>
                        <th>Connection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {h.high_availability.nodes.map((n) => (
                        <tr key={n.id}>
                          <td>
                            {n.id}
                            <small>{n.name}</small>
                          </td>
                          <td>{n.role}</td>
                          <td>
                            <StatusBadge status={n.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Current active database</dt>
                    <dd>
                      {h.high_availability.active_database || "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt>Replication status</dt>
                    <dd>
                      <StatusBadge
                        status={h.high_availability.replication_status}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Last synchronization</dt>
                    <dd>{date(h.high_availability.last_synchronization)}</dd>
                  </div>
                </dl>
                {h.high_availability.split_brain_detected && (
                  <p role="alert" className="alert alert-error">
                    Conflicting primary reports. Contact the database operator
                    immediately.
                  </p>
                )}
              </>
            ) : (
              <p className="muted">
                Not configured. The current recovery copy uses scheduled
                backups.
              </p>
            )}
          </div>
        </Card>
      )}
      {h && (
        <>
          <div className="detail-layout">
            <Card title="Primary database">
              <div className="card-body">
                <StatusBadge status={h.primary.status} />
                <p className="mt-4">{h.primary.name}</p>
                <p className="muted mt-4">Currently used by the system</p>
                <dl className="detail-list">
                  <div>
                    <dt>Last successful activity</dt>
                    <dd>{date(h.primary.last_activity)}</dd>
                  </div>
                </dl>
              </div>
            </Card>
            <Card title="Backup database">
              <div className="card-body">
                <StatusBadge status={h.backup.status} />
                <p className="mt-4">{h.backup.name}</p>
                <dl className="detail-list">
                  <div>
                    <dt>Last successful backup</dt>
                    <dd>{date(h.backup.last_success)}</dd>
                  </div>
                  <div>
                    <dt>Backup size</dt>
                    <dd>
                      {h.backup.size_bytes
                        ? `${(h.backup.size_bytes / 1048576).toFixed(2)} MB`
                        : "Unavailable"}
                    </dd>
                  </div>
                  <div>
                    <dt>Schedule</dt>
                    <dd>
                      {h.schedule_hours
                        ? `Every ${h.schedule_hours} hours (persistent server)`
                        : "External scheduler or manual"}
                    </dd>
                  </div>
                  <div>
                    <dt>Replication</dt>
                    <dd>{h.replication}</dd>
                  </div>
                </dl>
                <div className="form-footer">
                  <Button
                    disabled={!h.can_backup || h.operation_locked}
                    loading={busy}
                    onClick={backup}
                  >
                    Create backup
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={
                      !latestBackup || !h.can_restore || h.operation_locked
                    }
                    onClick={() => {
                      setRestore(latestBackup);
                      setConfirmation("");
                      setPassword("");
                    }}
                  >
                    Restore latest backup
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setHistory(!history)}
                  >
                    {history ? "Hide" : "View"} backup history
                  </Button>
                </div>
                {!h.can_backup && (
                  <p className="muted mt-4">
                    Configure a persistent backup worker with PostgreSQL tools
                    and durable storage.
                  </p>
                )}
                {h.operation_locked && (
                  <p className="alert alert-warning">
                    A database operation is running or needs administrator
                    review after an interruption.
                  </p>
                )}
              </div>
            </Card>
          </div>
          {history && (
            <Card title="Backup history" className="mt-6">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Started</th>
                      <th>Status</th>
                      <th>Size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.history.map((b) => (
                      <tr key={b.id}>
                        <td>
                          {date(b.started_at)}
                          {b.error && <small>{b.error}</small>}
                        </td>
                        <td>{b.status}</td>
                        <td>
                          {b.size_bytes
                            ? `${(b.size_bytes / 1048576).toFixed(2)} MB`
                            : "Unavailable"}
                        </td>
                        <td>
                          {b.status === "Completed" && (
                            <Button
                              variant="secondary"
                              disabled={!h.can_restore || h.operation_locked}
                              onClick={() => {
                                setRestore(b);
                                setConfirmation("");
                                setPassword("");
                              }}
                            >
                              Restore backup copy
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
      {restore && (
        <Modal
          title="Restore backup database"
          onClose={() => {
            setRestore(null);
            setPassword("");
          }}
        >
          <form onSubmit={recover}>
            <p>
              This replaces the configured emergency database with the backup
              from {date(restore.completed_at)}. The primary database remains in
              use.
            </p>
            <ErrorMessage message={error} />
            <Field label="Type RESTORE EMERGENCY DATABASE">
              <input
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </Field>
            <Field label="Administrator password">
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <div className="form-footer">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRestore(null);
                  setPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={confirmation !== "RESTORE EMERGENCY DATABASE"}
                loading={busy}
              >
                Confirm restore
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
