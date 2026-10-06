import { useState } from "react";
import { Plus, Pencil, Tags } from "lucide-react";
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
export default function CategoriesPage() {
  const categories = useApi("/categories"),
    [edit, setEdit] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(edit.id ? `/categories/${edit.id}` : "/categories", {
        method: edit.id ? "PUT" : "POST",
        body: edit,
      });
      setEdit(null);
      categories.reload();
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
        title="Parcel categories"
        description="Organize inventory and match parcels to suitable storage."
      >
        <Button
          onClick={() => {
            setEdit({ name: "", color: "#688d77", active: 1 });
            setError("");
          }}
        >
          <Plus size={17} />
          Add category
        </Button>
      </PageTitle>
      <LoadState {...categories} />
      <div className="category-cards">
        {categories.data?.map((c) => (
          <Card className="category-card" key={c.id}>
            <div className="flex justify-between">
              <span
                className="category-icon"
                style={{ background: `${c.color}20`, color: c.color }}
              >
                <Tags size={23} />
              </span>
              <button
                className="icon-button"
                onClick={() => {
                  setEdit(c);
                  setError("");
                }}
                aria-label={`Edit ${c.name}`}
              >
                <Pencil size={16} />
              </button>
            </div>
            <h2 className="mt-5">{c.name}</h2>
            <p className="muted text-sm mt-2">
              {c.parcel_count} parcel records
            </p>
            <div className="mt-5">
              <StatusBadge status={c.active ? "Active" : "Inactive"} />
            </div>
          </Card>
        ))}
      </div>
      {edit && (
        <Modal
          title={edit.id ? "Edit category" : "Add category"}
          onClose={() => setEdit(null)}
        >
          <form onSubmit={save}>
            <ErrorMessage message={error} />
            <Field label="Category name">
              <input
                required
                minLength={2}
                maxLength={60}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            <Field label="Category color">
              <input
                type="color"
                value={edit.color}
                onChange={(e) => setEdit({ ...edit, color: e.target.value })}
              />
            </Field>
            <Field
              label="Availability"
              hint="Inactive categories remain in historical records."
            >
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
            <div className="form-footer">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEdit(null)}
              >
                Cancel
              </Button>
              <Button loading={busy}>Save category</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
