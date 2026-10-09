import { all, get, run, query, atomic } from "../config/database.js";
import { getWarehouse } from "../models/warehouseModel.js";
import { routeToLocation } from "../services/pathfindingService.js";
import { audit } from "../services/auditService.js";
import {
  notify,
  capacityAlertsForLocations,
} from "../services/notificationService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import { sizeUnits } from "../algorithms/storageScoring.js";
import { dimensionsFit } from "../algorithms/parcelDimensions.js";
export const details = async (req, res) => res.json(await getWarehouse());
export async function rackRoute(req, res) {
  const rack = String(req.params.rack).toUpperCase();
  if (!["A", "B", "C"].includes(rack))
    throw new HttpError(400, "Choose Rack A, B, or C.");
  const warehouse = await getWarehouse();
  const candidates = warehouse.locations.filter(
    (l) =>
      l.storage_type === "rack" &&
      l.active &&
      l.can_store &&
      l.status !== "Blocked" &&
      new RegExp(`^${rack}(?:[- .]|$)`, "i").test(l.code),
  );
  if (!candidates.length)
    throw new HttpError(
      409,
      `Rack ${rack} has no available storage destinations.`,
    );
  const routes = candidates
    .map((l) => ({
      location: l,
      route: routeToLocation(warehouse, l, req.query.start),
    }))
    .filter((r) => r.route);
  routes.sort(
    (a, b) =>
      a.route.inbound.cost - b.route.inbound.cost ||
      a.route.inboundSteps - b.route.inboundSteps ||
      a.location.id - b.location.id,
  );
  if (!routes.length)
    throw new HttpError(
      409,
      `Rack ${rack} cannot currently be reached. Check for blocked paths.`,
    );
  res.json({
    ...routes[0].route,
    rackLabel: `Rack ${rack}`,
    locationCode: routes[0].location.code,
  });
}
export async function route(req, res) {
  const warehouse = await getWarehouse();
  const location = warehouse.locations.find(
    (l) => l.id === Number(req.params.id),
  );
  if (!location) throw new HttpError(404, "Storage location not found.");
  if (!location.active || !location.can_store || location.status === "Blocked")
    throw new HttpError(409, "This storage location is unavailable.");
  const result = routeToLocation(warehouse, location, req.query.start);
  if (!result)
    throw new HttpError(
      409,
      "The selected storage location cannot currently be reached. Check for blocked warehouse paths.",
    );
  res.json(result);
}
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
      const categories = new Set(
        (await all("SELECT id FROM categories")).map((c) => c.id),
      );
      const occupied = await all(
        "SELECT location_id,category_id,size,length_cm,width_cm,height_cm FROM parcels WHERE status!='Dispatched'",
      );
      const parcelsByLocation = new Map();
      for (const p of occupied) {
        if (!parcelsByLocation.has(p.location_id))
          parcelsByLocation.set(p.location_id, []);
        parcelsByLocation.get(p.location_id).push(p);
      }
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
        if (l.category_id && !categories.has(l.category_id))
          throw new HttpError(400, "Invalid storage category.");
        if (old?.parcel_count) {
          const stored = parcelsByLocation.get(old.id) || [];
          if (stored.some((p) => !dimensionsFit(p, l)))
            throw new HttpError(
              409,
              `${old.code} dimensions would exclude an occupied parcel.`,
            );
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
            stored.some(
              (p) =>
                (l.category_id !== null && p.category_id !== l.category_id) ||
                sizeUnits[p.size] > sizeUnits[l.max_size],
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
      await query(
        "UPDATE storage_locations SET code='__draft-' || id WHERE id=ANY(?::integer[])",
        [draft.locations.filter((l) => l.id).map((l) => l.id)],
      );
      await query(
        `UPDATE grid_cells c SET type=v.type,walkable=v.walkable,active=v.active,can_store=v.can_store,availability=v.availability,movement_cost=v.movement_cost,door_usage=v.door_usage,directions=v.directions
        FROM jsonb_to_recordset(?::jsonb) AS v(id text,type text,walkable boolean,active boolean,can_store boolean,availability text,movement_cost double precision,door_usage text,directions jsonb) WHERE c.id=v.id`,
        [JSON.stringify(draft.cells)],
      );
      await query(
        `UPDATE storage_locations l SET code=v.code,storage_type=v.storage_type,capacity=v.capacity,unit_capacity=v.unit_capacity,max_weight=v.max_weight,max_size=v.max_size,category_id=v.category_id,status=v.status,width_cm=v.width_cm,depth_cm=v.depth_cm,height_cm=v.height_cm
        FROM jsonb_to_recordset(?::jsonb) AS v(id integer,code text,storage_type text,capacity integer,unit_capacity integer,max_weight numeric,max_size text,category_id integer,status text,width_cm numeric,depth_cm numeric,height_cm numeric) WHERE l.id=v.id`,
        [JSON.stringify(draft.locations.filter((l) => l.id))],
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
        if (!l.id)
          await run(
            "INSERT INTO storage_locations(code,storage_type,capacity,unit_capacity,max_weight,max_size,category_id,status,cell_id,width_cm,depth_cm,height_cm) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
            ...values,
            l.cell_id,
            l.width_cm,
            l.depth_cm,
            l.height_cm,
          );
      }
      await run(
        "UPDATE warehouse SET name=?,revision=revision+1 WHERE id=1",
        draft.name,
      );
      await audit(req.user.id, "WAREHOUSE_LAYOUT_CHANGED", {
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
      const updated = await getWarehouse();
      await capacityAlertsForLocations(updated.locations);
      return { ...updated, warnings };
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
