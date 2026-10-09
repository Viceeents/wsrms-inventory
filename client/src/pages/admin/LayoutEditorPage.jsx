import useDraft from "../../hooks/useDraft";
import DraftNotice from "../../components/common/DraftNotice";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Info } from "lucide-react";
import useApi from "../../hooks/useApi";
import { warehouseService } from "../../services/warehouseService";
import {
  PageTitle,
  Card,
  LoadState,
  ErrorMessage,
  Field,
} from "../../components/common/UI";
import WarehouseGrid from "../../components/warehouse/WarehouseGrid";
import GridEditorToolbar from "../../components/warehouse/GridEditorToolbar";
import { cellDefaults, cellType, storageType } from "../../utils/storage";
export default function LayoutEditorPage() {
  const warehouse = useApi("/warehouse"),
    categories = useApi("/categories"),
    [draft, setDraft] = useState(null),
    [tool, setTool] = useState("select"),
    [selected, setSelected] = useState(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [warnings, setWarnings] = useState([]);
  useEffect(() => {
    if (warehouse.data) {
      setDraft(structuredClone(warehouse.data));
      setDirty(false);
    }
  }, [warehouse.data]);
  const recovery = useDraft(
    "warehouse-layout",
    draft,
    (value) => {
      setDraft(value);
      setDirty(true);
    },
    dirty,
  );
  function commit(next) {
    setDraft(next);
    setDirty(true);
    setError("");
    setSuccess("");
    setWarnings([]);
  }
  function configureCell(cell, changes) {
    const nextCell = { ...cell, ...changes },
      old = draft.locations.find((l) => l.cell_id === cell.id);
    if (
      old?.parcel_count &&
      (!nextCell.active ||
        !nextCell.can_store ||
        nextCell.availability === "Blocked" ||
        ["wall", "blocked"].includes(nextCell.type))
    ) {
      setError(
        `${old.code} contains active parcels. Transfer them before disabling or blocking this cell.`,
      );
      return;
    }
    let locations = draft.locations.map((l) =>
      l.cell_id === cell.id && nextCell.can_store
        ? { ...l, storage_type: nextCell.type }
        : l,
    );
    if (!nextCell.can_store)
      locations = locations.filter((l) => l.cell_id !== cell.id || l.id);
    if (nextCell.can_store && !old) {
      let code = `${nextCell.type === "floor_storage" ? "FLOOR" : nextCell.type === "rack" ? "RACK" : "LOC"}-${String.fromCharCode(65 + cell.col)}${String(cell.row + 1).padStart(2, "0")}`,
        suffix = 1;
      while (locations.some((l) => l.code === code)) code += `-${suffix++}`;
      locations.push({
        cell_id: cell.id,
        storage_type: nextCell.type,
        code,
        capacity: nextCell.type === "rack" ? 20 : 5,
        unit_capacity: 20,
        max_weight: nextCell.type === "rack" ? 200 : 100,
        max_size: "Large",
        category_id: null,
        status: "Available",
        row: cell.row,
        col: cell.col,
        occupancy: 0,
        used_units: 0,
        used_weight: 0,
        parcel_count: 0,
        stored_parcels: [],
      });
    }
    commit({
      ...draft,
      locations,
      cells: draft.cells.map((c) => (c.id === cell.id ? nextCell : c)),
    });
  }
  function click(cell) {
    setSelected(cell.id);
    if (tool !== "select") configureCell(cell, cellDefaults(tool));
  }
  function changeLocation(key, value) {
    commit({
      ...draft,
      locations: draft.locations.map((l) =>
        l.cell_id === selected ? { ...l, [key]: value } : l,
      ),
    });
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const w = await warehouseService.save(draft);
      recovery.clear();
      warehouse.setData(w);
      setWarnings(w.warnings || []);
      setDirty(false);
      setSuccess(
        "Layout saved. Inventory cells and both route directions now use this configuration.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const cell = draft?.cells.find((c) => c.id === selected),
    location = draft?.locations.find((l) => l.cell_id === selected);
  return (
    <>
      <PageTitle
        eyebrow="ADMINISTRATION"
        title="Warehouse layout editor"
        description="Configure the physical layout, inventory locations, and movement access."
      />
      <DraftNotice
        draft={recovery}
        label="Unfinished layout configuration found"
      />
      <ErrorMessage message={error} />
      {success && (
        <div role="status" className="alert alert-success">
          <Check size={18} />
          {success}
        </div>
      )}
      {warnings.map((w) => (
        <div className="alert alert-warning" key={w}>
          {w}
        </div>
      ))}
      <LoadState {...warehouse} />
      {draft && (
        <>
          <GridEditorToolbar
            tool={tool}
            onTool={setTool}
            dirty={dirty}
            busy={busy}
            onSave={save}
            onReset={() => {
              recovery.clear();
              setDraft(structuredClone(warehouse.data));
              setDirty(false);
              setError("");
              setSuccess("");
              setWarnings([]);
            }}
          />
          <div className="editor-layout">
            <Card
              title="Layout + inventory grid"
              description="Choose a tool to place a cell. Use Select to configure movement and storage."
            >
              <div className="card-body">
                <Field label="Warehouse name">
                  <input
                    value={draft.name}
                    onChange={(e) => commit({ ...draft, name: e.target.value })}
                    maxLength={80}
                  />
                </Field>
                <WarehouseGrid
                  warehouse={draft}
                  selected={selected}
                  onCellClick={click}
                />
                <div className="editor-note">
                  <Info size={17} />
                  <span>
                    Active parcels must stay reachable in both directions.
                    Relocate parcels before disabling their cell. Occupancy is
                    calculated from inventory, never entered manually.
                  </span>
                </div>
              </div>
            </Card>
            <Card
              title={
                cell
                  ? `${cellType(cell.type)} · ${selected}`
                  : "Cell configuration"
              }
            >
              <div className="card-body">
                {cell ? (
                  <>
                    <p className="eyebrow">LAYOUT & ROUTING</p>
                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={cell.active}
                        onChange={(e) =>
                          configureCell(cell, { active: e.target.checked })
                        }
                      />
                      Active cell
                    </label>
                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={cell.walkable}
                        disabled={["rack", "wall", "blocked", "door"].includes(
                          cell.type,
                        )}
                        onChange={(e) =>
                          configureCell(cell, { walkable: e.target.checked })
                        }
                      />
                      Walkable
                    </label>
                    <label className="toggle-field">
                      <input
                        type="checkbox"
                        checked={cell.can_store}
                        disabled={["wall", "blocked", "door"].includes(
                          cell.type,
                        )}
                        onChange={(e) =>
                          configureCell(cell, { can_store: e.target.checked })
                        }
                      />
                      Can store parcels
                    </label>
                    <Field label="Cell availability">
                      <select
                        value={cell.availability}
                        onChange={(e) =>
                          configureCell(cell, { availability: e.target.value })
                        }
                      >
                        <option>Available</option>
                        <option>Blocked</option>
                      </select>
                    </Field>
                    {cell.type === "door" && (
                      <Field label="Warehouse Access Point usage">
                        <select
                          value={cell.door_usage}
                          onChange={(e) =>
                            configureCell(cell, { door_usage: e.target.value })
                          }
                        >
                          <option value="both">Receiving + Dispatch</option>
                          <option value="receiving">Receiving only</option>
                          <option value="dispatch">Dispatch only</option>
                        </select>
                      </Field>
                    )}
                    <Field
                      label="Movement cost"
                      hint="Positive cost for entering this cell. Steps are counted separately."
                    >
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        max="100"
                        value={cell.movement_cost}
                        onChange={(e) =>
                          configureCell(cell, {
                            movement_cost: Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    {cell.walkable && (
                      <fieldset className="direction-fields">
                        <legend>Allowed movement directions</legend>
                        {["north", "south", "east", "west"].map((d) => (
                          <label key={d}>
                            <input
                              type="checkbox"
                              checked={cell.directions.includes(d)}
                              onChange={(e) =>
                                configureCell(cell, {
                                  directions: e.target.checked
                                    ? [...cell.directions, d]
                                    : cell.directions.filter((v) => v !== d),
                                })
                              }
                            />
                            {d}
                          </label>
                        ))}
                      </fieldset>
                    )}
                    {location && (
                      <>
                        <p className="eyebrow mt-6">
                          {cell.can_store
                            ? "STORAGE CONFIGURATION"
                            : "HISTORICAL STORAGE CONFIGURATION"}
                        </p>
                        <Field label="Location code">
                          <input
                            value={location.code}
                            onChange={(e) =>
                              changeLocation("code", e.target.value)
                            }
                            maxLength={20}
                          />
                        </Field>
                        <p className="muted text-sm mb-5">
                          {storageType(location.storage_type)} ·{" "}
                          {location.occupancy} current parcels ·{" "}
                          {location.parcel_count} records
                        </p>
                        <Field label="Maximum parcel capacity">
                          <input
                            type="number"
                            min="1"
                            max="10000"
                            value={location.capacity}
                            onChange={(e) =>
                              changeLocation("capacity", Number(e.target.value))
                            }
                          />
                        </Field>
                        <Field
                          label="Size-unit capacity"
                          hint="Small = 1, Medium = 2, Large = 4 units per item."
                        >
                          <input
                            type="number"
                            min="1"
                            max="40000"
                            value={location.unit_capacity}
                            onChange={(e) =>
                              changeLocation(
                                "unit_capacity",
                                Number(e.target.value),
                              )
                            }
                          />
                        </Field>
                        {[
                          ["width_cm", "Width"],
                          ["depth_cm", "Depth"],
                          ["height_cm", "Height"],
                        ].map(([key, label]) => (
                          <Field key={key} label={`${label} (cm)`}>
                            <input
                              type="number"
                              min="0.1"
                              max="10000"
                              step="0.1"
                              value={
                                location[key] ??
                                (key === "width_cm"
                                  ? 120
                                  : key === "depth_cm"
                                    ? 80
                                    : 180)
                              }
                              onChange={(e) =>
                                changeLocation(key, Number(e.target.value))
                              }
                            />
                          </Field>
                        ))}
                        <Field label="Maximum total weight (kg)">
                          <input
                            type="number"
                            min="0.1"
                            max="100000"
                            value={location.max_weight}
                            onChange={(e) =>
                              changeLocation(
                                "max_weight",
                                Number(e.target.value),
                              )
                            }
                          />
                        </Field>
                        <Field label="Maximum parcel size">
                          <select
                            value={location.max_size}
                            onChange={(e) =>
                              changeLocation("max_size", e.target.value)
                            }
                          >
                            {["Small", "Medium", "Large"].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Category restriction">
                          <select
                            value={location.category_id || ""}
                            onChange={(e) =>
                              changeLocation(
                                "category_id",
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                          >
                            <option value="">Any category</option>
                            {categories.data?.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Storage availability">
                          <select
                            value={location.status}
                            onChange={(e) =>
                              changeLocation("status", e.target.value)
                            }
                          >
                            {["Available", "Reserved", "Blocked"].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </Field>
                        <p className="muted text-sm">
                          Load: {location.used_units} size units ·{" "}
                          {Number(location.used_weight).toFixed(1)} kg
                        </p>
                        <h3 className="text-sm mt-4">Stored parcels</h3>
                        {location.stored_parcels?.length ? (
                          location.stored_parcels.map((p) => (
                            <Link
                              key={p.id}
                              className="stored-parcel"
                              to={`/parcels/${p.id}`}
                            >
                              <span className="mono">{p.code}</span>
                              <small>
                                ID {p.id} · Qty {p.quantity}
                              </small>
                            </Link>
                          ))
                        ) : (
                          <p className="muted text-sm mt-2">
                            Empty storage cell.
                          </p>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <p className="muted">
                    Select any cell to configure its layout, storage, active
                    status, or movement cost.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
