import { get, run, atomic } from "../config/database.js";
import { getWarehouse } from "../models/warehouseModel.js";
import { routeToLocation } from "../services/pathfindingService.js";
import { audit } from "../services/auditService.js";
import { notify, capacityAlerts } from "../services/notificationService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import { sizeUnits } from "../algorithms/storageScoring.js";
export const details = async (req, res) => res.json(await getWarehouse());
export async function update(req, res) {
  try {
    const warehouse = await atomic(async () => {
      const before = await getWarehouse(),
        draft = req.body;
      if (draft.revision !== before.revision)
        throw new HttpError(
          409,
          "Another user changed the layout. Reload before saving.",
        );
      if (
        draft.cells.length !== before.rows * before.cols ||
        new Set(draft.cells.map((c) => c.id)).size !== draft.cells.length
      )
        throw new HttpError(
          400,
          "The grid must contain every cell exactly once.",
        );
      if (
        draft.cells.some(
          (c) =>
            c.id !== `${c.row}-${c.col}` ||
            c.row >= before.rows ||
            c.col >= before.cols,
        )
      )
        throw new HttpError(400, "Invalid grid coordinates.");
      for (const c of draft.cells) {
        if (["wall", "blocked"].includes(c.type) && (c.walkable || c.can_store))
          throw new HttpError(
            400,
            "Walls and blocked cells cannot be walkable or store parcels.",
          );
        if (c.type === "rack" && c.walkable)
          throw new HttpError(400, "Racks cannot be walked through.");
        if (c.type === "door" && (!c.walkable || c.can_store || !c.door_usage))
          throw new HttpError(
            400,
            "A Warehouse Access Point must be walkable, have a usage, and remain free of stored parcels.",
          );
        if (c.type !== "door" && c.door_usage !== null)
          throw new HttpError(400, "Only access points may have a door usage.");
      }
      const doors = draft.cells.filter(
        (c) =>
          c.type === "door" &&
          c.active &&
          c.walkable &&
          c.availability === "Available",
      );
      if (
        !doors.some((c) => ["both", "receiving"].includes(c.door_usage)) ||
        !doors.some((c) => ["both", "dispatch"].includes(c.door_usage))
      )
        throw new HttpError(
          400,
          "Keep a valid Warehouse Access Point for receiving and dispatch. One door may handle both.",
        );
      if (
        new Set(draft.locations.map((l) => l.cell_id)).size !==
          draft.locations.length ||
        new Set(draft.locations.map((l) => l.code.toLowerCase())).size !==
          draft.locations.length ||
        new Set(draft.locations.filter((l) => l.id).map((l) => l.id)).size !==
          draft.locations.filter((l) => l.id).length
      )
        throw new HttpError(
          400,
          "Storage codes, cells, and identifiers must be unique.",
        );
      const byCell = new Map(draft.cells.map((c) => [c.id, c])),
        configured = new Map(draft.locations.map((l) => [l.cell_id, l])),
        original = new Map(before.locations.map((l) => [l.id, l])),
        warnings = [];
      for (const c of draft.cells)
        if (c.can_store && !configured.has(c.id))
          throw new HttpError(
            400,
            `Storage cell ${c.id} needs a location configuration.`,
          );
      let reachable = 0;
      for (const l of draft.locations) {
        const c = byCell.get(l.cell_id),
          old = original.get(l.id);
        if (!c) throw new HttpError(400, "Invalid storage position.");
        if (l.id && !old)
          throw new HttpError(400, "Unknown storage identifier.");
        if (old && old.cell_id !== l.cell_id)
          throw new HttpError(
            400,
            "Storage identities cannot be moved. Transfer parcels to another location.",
          );
        if (
          c.can_store &&
          (!["rack", "floor_storage", "walkway"].includes(c.type) ||
            l.storage_type !== c.type)
        )
          throw new HttpError(
            400,
            "Storage type must match the configured cell.",
          );
        if (!old && !c.can_store)
          throw new HttpError(
            400,
            "New locations need a storage-capable cell.",
          );
        if (
          l.category_id &&
          !(await get("SELECT id FROM categories WHERE id=?", l.category_id))
        )
          throw new HttpError(400, "Invalid storage category.");
        if (old?.parcel_count) {
          if (
            !c.active ||
            !c.can_store ||
            ["wall", "blocked"].includes(c.type) ||
            c.availability === "Blocked"
          )
            throw new HttpError(
              409,
              `${old.code} contains active parcels. Relocate them before disabling or blocking this cell.`,
            );
          if (
            l.capacity < old.occupancy ||
            l.unit_capacity < old.used_units ||
            l.max_weight < old.used_weight
          )
            throw new HttpError(
              409,
              `${old.code} cannot be reduced below its current load.`,
            );
          if (
            await get(
              "SELECT id FROM parcels WHERE location_id=? AND status!='Dispatched' AND (?::integer IS NOT NULL AND category_id!=? OR CASE size WHEN 'Small' THEN 1 WHEN 'Medium' THEN 2 ELSE 4 END>?)",
              old.id,
              l.category_id,
              l.category_id,
              sizeUnits[l.max_size],
            )
          )
            throw new HttpError(
              409,
              `${old.code} contains incompatible parcels.`,
            );
        }
        const route =
          c.active && c.can_store
            ? routeToLocation(
                { ...before, cells: draft.cells },
                { ...l, row: c.row, col: c.col },
              )
            : null;
        if (old?.parcel_count && !route)
          throw new HttpError(
            409,
            `${old.code} would be isolated. Restore both retrieval and return access before saving.`,
          );
        if (c.active && c.can_store) {
          if (route) reachable++;
          else
            warnings.push(
              `${l.code} is unreachable and will not be recommended.`,
            );
        }
      }
      if (!reachable)
        throw new HttpError(
          400,
          "At least one active storage area must be reachable from a receiving access point and return to a dispatch access point.",
        );
      for (const old of before.locations)
        if (!draft.locations.some((l) => l.id === old.id)) {
          if (
            old.parcel_count ||
            (await get("SELECT id FROM parcels WHERE location_id=?", old.id))
          )
            throw new HttpError(
              409,
              `${old.code} has parcel history. Retain its configuration and disable parcel storage after relocating active parcels.`,
            );
          await run("DELETE FROM storage_locations WHERE id=?", old.id);
        }
      for (const l of draft.locations.filter((l) => l.id))
        await run(
          "UPDATE storage_locations SET code=? WHERE id=?",
          `__draft-${l.id}`,
          l.id,
        );
      for (const c of draft.cells)
        await run(
          "UPDATE grid_cells SET type=?,walkable=?,active=?,can_store=?,availability=?,movement_cost=?,door_usage=?,directions=?::jsonb WHERE id=?",
          c.type,
          c.walkable,
          c.active,
          c.can_store,
          c.availability,
          c.movement_cost,
          c.door_usage,
          JSON.stringify(c.directions),
          c.id,
        );
      for (const l of draft.locations) {
        const values = [
          l.code,
          l.storage_type,
          l.capacity,
          l.unit_capacity,
          l.max_weight,
          l.max_size,
          l.category_id,
          l.status,
        ];
        if (l.id)
          await run(
            "UPDATE storage_locations SET code=?,storage_type=?,capacity=?,unit_capacity=?,max_weight=?,max_size=?,category_id=?,status=? WHERE id=?",
            ...values,
            l.id,
          );
        else
          await run(
            "INSERT INTO storage_locations(code,storage_type,capacity,unit_capacity,max_weight,max_size,category_id,status,cell_id) VALUES(?,?,?,?,?,?,?,?,?)",
            ...values,
            l.cell_id,
          );
      }
      await run(
        "UPDATE warehouse SET name=?,revision=revision+1 WHERE id=1",
        draft.name,
      );
      await audit(req.user.id, "Layout change", {
        metadata: {
          before: {
            revision: before.revision,
            cells: before.cells,
            locations: before.locations,
          },
          after: {
            revision: before.revision + 1,
            cells: draft.cells,
            locations: draft.locations,
          },
          warnings,
        },
      });
      await notify(
        "layout_change",
        `Warehouse layout updated to revision ${before.revision + 1}.${warnings.length ? ` ${warnings.join(" ")}` : " Retrieval and return access validated."}`,
        { severity: warnings.length ? "warning" : "info" },
      );
      for (const l of await getWarehouse().then((w) => w.locations))
        await capacityAlerts(l.id);
      return { ...(await getWarehouse()), warnings };
    });
    res.json(warehouse);
  } catch (error) {
    if (error.status === 400 || error.status === 409)
      await atomic(() =>
        notify("blocked_route", `Layout was not saved: ${error.message}`, {
          userId: req.user.id,
          severity: "warning",
          dedupeKey: `layout:${req.user.id}:${req.body.revision}:${error.message}`,
        }),
      );
    throw error;
  }
}
