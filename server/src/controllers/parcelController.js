import { get, run, atomic, nextCode } from "../config/database.js";
import { findParcel, listParcels } from "../models/parcelModel.js";
import { findLocation } from "../models/storageLocationModel.js";
import { getWarehouse } from "../models/warehouseModel.js";
import { recommendStorage } from "../services/storageService.js";
import { routeToLocation } from "../services/pathfindingService.js";
import { audit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
import { fitsLocation, sizeUnits } from "../algorithms/storageScoring.js";
import { notify, capacityAlerts } from "../services/notificationService.js";
const requireParcel = async (id) => {
  const p = await findParcel(id);
  if (!p) throw new HttpError(404, "Parcel not found.");
  return p;
};
export const list = async (req, res) => res.json(await listParcels(req.query));
export const details = async (req, res) =>
  res.json(await requireParcel(req.params.id));
export async function recommendations(req, res) {
  if (
    !(await get(
      "SELECT id FROM categories WHERE id=? AND active=1",
      req.body.category_id,
    ))
  )
    throw new HttpError(400, "Choose an active category.");
  const options = await recommendStorage(req.body);
  if (!options.length)
    await atomic(() =>
      notify(
        "storage_unavailable",
        "No compatible, reachable storage location is available for this parcel.",
        { userId: req.user.id, severity: "warning" },
      ),
    );
  res.json(options);
}
export async function create(req, res) {
  const result = await atomic(async () => {
    const p = req.body,
      rack = await findLocation(p.location_id);
    if (
      !(await get(
        "SELECT id FROM categories WHERE id=? AND active=1",
        p.category_id,
      ))
    )
      throw new HttpError(400, "Choose an active category.");
    if (
      !rack ||
      !fitsLocation(
        rack,
        p,
        await get("SELECT * FROM system_settings WHERE id=1"),
      )
    )
      throw new HttpError(
        409,
        "This storage location no longer fits the parcel. Request new recommendations.",
      );
    if (!routeToLocation(await getWarehouse(), rack))
      throw new HttpError(
        409,
        "This storage location is not accessible. Choose another location.",
      );
    const code = await nextCode("PRC");
    const id = Number(
      (
        await run(
          "INSERT INTO parcels(code,tracking_number,description,category_id,size,weight,quantity,status,location_id,checked_in_by,checked_in_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          code,
          p.tracking_number || null,
          p.description,
          p.category_id,
          p.size,
          p.weight,
          p.quantity,
          "Stored",
          rack.id,
          req.user.id,
          new Date().toISOString(),
        )
      ).lastInsertRowid,
    );
    await audit(req.user.id, "Check-in", {
      parcelId: id,
      newStatus: "Stored",
      newLocation: rack.code,
      metadata: {
        quantity: p.quantity,
        weight: p.weight,
        size: p.size,
      },
    });
    await audit(req.user.id, "Storage assignment", {
      parcelId: id,
      newStatus: "Stored",
      newLocation: rack.code,
    });
    await notify("check_in", `${code} checked in at ${rack.code}.`, {
      userId: req.user.id,
      parcelId: id,
      locationId: rack.id,
    });
    await capacityAlerts(rack.id);
    return await findParcel(id);
  });
  res.status(201).json(result);
}
export async function route(req, res) {
  const p = await requireParcel(req.params.id);
  if (p.status === "Dispatched")
    throw new HttpError(409, "This parcel has already left the warehouse.");
  const warehouse = await getWarehouse();
  const route = routeToLocation(
    warehouse,
    await findLocation(p.location_id),
    req.query.start,
  );
  if (!route) {
    await atomic(() =>
      notify(
        "blocked_route",
        `${p.code}: no retrieval and return route is available for ${p.location_code}.`,
        {
          userId: req.user.id,
          severity: "warning",
          parcelId: p.id,
          locationId: p.location_id,
          dedupeKey: `route:${p.id}:${req.user.id}:${warehouse.revision}`,
        },
      ),
    );
    throw new HttpError(
      409,
      "No accessible route to this storage location. Ask an administrator to review the layout.",
    );
  }
  res.json(route);
}
export async function retrieve(req, res) {
  const p = await atomic(async () => {
    const p = await requireParcel(req.params.id);
    if (p.status !== "Stored")
      throw new HttpError(
        409,
        "Only stored parcels can be marked as retrieved.",
      );
    const route = routeToLocation(
      await getWarehouse(),
      await findLocation(p.location_id),
    );
    if (!route) {
      await notify(
        "blocked_route",
        `${p.code}: retrieval was blocked because no round-trip route is available.`,
        { userId: req.user.id, severity: "warning", parcelId: p.id },
      );
      return {
        error:
          "The retrieval and return route is blocked. Review the current layout.",
      };
    }
    await run("UPDATE parcels SET status='Retrieved' WHERE id=?", p.id);
    await audit(req.user.id, "Retrieval", {
      parcelId: p.id,
      previousStatus: p.status,
      newStatus: "Retrieved",
      previousLocation: p.location_code,
      newLocation: p.location_code,
      metadata: {
        routeRevision: route.revision,
        inboundSteps: route.inboundSteps,
        returnSteps: route.returnSteps,
        totalSteps: route.totalSteps,
      },
    });
    return await findParcel(p.id);
  });
  if (p.error) throw new HttpError(409, p.error);
  res.json(p);
}
export async function dispatch(req, res) {
  const p = await atomic(async () => {
    const p = await requireParcel(req.params.id);
    if (p.status === "Dispatched")
      throw new HttpError(409, "This parcel has already been dispatched.");
    if (p.status !== "Retrieved")
      throw new HttpError(409, "Mark the parcel as retrieved before dispatch.");
    if (req.body.scanned_code.trim() !== p.code) {
      await audit(req.user.id, "QR verification failed", {
        parcelId: p.id,
        previousStatus: p.status,
        newStatus: p.status,
        previousLocation: p.location_code,
        newLocation: p.location_code,
        verified: false,
      });
      await notify(
        "verification_failed",
        `Wrong parcel scanned for ${p.code}. Dispatch was blocked.`,
        { userId: req.user.id, parcelId: p.id, severity: "error" },
      );
      return {
        error:
          "Wrong parcel. Scan the code on the selected parcel before dispatching.",
      };
    }
    const route = routeToLocation(
      await getWarehouse(),
      await findLocation(p.location_id),
    );
    if (!route) {
      await notify(
        "blocked_route",
        `${p.code}: dispatch was blocked because no round-trip route is available.`,
        { userId: req.user.id, severity: "warning", parcelId: p.id },
      );
      return {
        error:
          "No return route is available. Restore access before dispatching.",
      };
    }
    await run(
      "UPDATE parcels SET status='Dispatched',dispatched_at=? WHERE id=?",
      new Date().toISOString(),
      p.id,
    );
    await audit(req.user.id, "Dispatch", {
      parcelId: p.id,
      previousStatus: p.status,
      newStatus: "Dispatched",
      previousLocation: p.location_code,
      verified: true,
      metadata: {
        routeRevision: route.revision,
        inboundSteps: route.inboundSteps,
        returnSteps: route.returnSteps,
        totalSteps: route.totalSteps,
      },
    });
    await notify(
      "dispatch",
      `${p.code} dispatched. Storage at ${p.location_code} released.`,
      { userId: req.user.id, parcelId: p.id, locationId: p.location_id },
    );
    await capacityAlerts(p.location_id);
    return await findParcel(p.id);
  });
  if (p.error) throw new HttpError(409, p.error);
  res.json(p);
}
export async function transfer(req, res) {
  const result = await atomic(async () => {
    const p = await requireParcel(req.params.id);
    if (p.status !== "Stored")
      throw new HttpError(409, "Only stored parcels can be transferred.");
    if (p.location_id === req.body.location_id)
      throw new HttpError(400, "Choose a different storage location.");
    const rack = await findLocation(req.body.location_id);
    if (
      !rack ||
      !fitsLocation(
        rack,
        p,
        await get("SELECT * FROM system_settings WHERE id=1"),
      ) ||
      !routeToLocation(await getWarehouse(), rack)
    )
      throw new HttpError(
        409,
        "The selected storage location cannot store this parcel.",
      );
    await run("UPDATE parcels SET location_id=? WHERE id=?", rack.id, p.id);
    await audit(req.user.id, "Storage transfer", {
      parcelId: p.id,
      previousStatus: p.status,
      newStatus: p.status,
      previousLocation: p.location_code,
      newLocation: rack.code,
    });
    await capacityAlerts(p.location_id);
    await capacityAlerts(rack.id);
    return await findParcel(p.id);
  });
  res.json(result);
}
export async function transferOptions(req, res) {
  const p = await requireParcel(req.params.id);
  res.json(await recommendStorage(p, p.location_id));
}
export async function verify(req, res) {
  const result = await atomic(async () => {
    const p = await requireParcel(req.params.id);
    if (p.status !== "Retrieved")
      throw new HttpError(
        409,
        "Retrieve the selected parcel before verifying dispatch.",
      );
    const verified = req.body.scanned_code.trim() === p.code;
    await audit(
      req.user.id,
      verified ? "QR verification" : "QR verification failed",
      {
        parcelId: p.id,
        previousStatus: p.status,
        newStatus: p.status,
        previousLocation: p.location_code,
        newLocation: p.location_code,
        verified,
      },
    );
    if (!verified)
      await notify(
        "verification_failed",
        `Wrong parcel scanned for ${p.code}. Dispatch was blocked.`,
        { userId: req.user.id, parcelId: p.id, severity: "error" },
      );
    return { verified, code: verified ? p.code : null };
  });
  res.json(result);
}
export async function correct(req, res) {
  const result = await atomic(async () => {
    const old = await requireParcel(req.params.id),
      p = req.body;
    if (!(await get("SELECT id FROM categories WHERE id=?", p.category_id)))
      throw new HttpError(400, "Category not found.");
    if (old.status !== "Dispatched") {
      const rack = await findLocation(old.location_id);
      const withoutParcel = {
        ...rack,
        status: "Available",
        used_units: rack.used_units - sizeUnits[old.size] * old.quantity,
        occupancy: rack.occupancy - old.quantity,
        used_weight: rack.used_weight - old.weight * old.quantity,
      };
      if (!fitsLocation(withoutParcel, p))
        throw new HttpError(
          409,
          "These corrected details exceed the assigned storage location limits or category restriction. Transfer the parcel first.",
        );
    }
    await run(
      "UPDATE parcels SET description=?,tracking_number=?,category_id=?,size=?,weight=?,quantity=? WHERE id=?",
      p.description,
      p.tracking_number || null,
      p.category_id,
      p.size,
      p.weight,
      p.quantity,
      old.id,
    );
    const updated = await findParcel(old.id),
      fields = [
        "description",
        "tracking_number",
        "category_id",
        "size",
        "weight",
        "quantity",
      ];
    const snapshot = (record) =>
      Object.fromEntries(fields.map((key) => [key, record[key]]));
    await audit(req.user.id, "Manual correction", {
      parcelId: old.id,
      previousStatus: old.status,
      newStatus: old.status,
      previousLocation: old.location_code,
      newLocation: old.location_code,
      metadata: {
        reason: p.reason,
        before: snapshot(old),
        after: snapshot(updated),
      },
    });
    await capacityAlerts(old.location_id);
    return updated;
  });
  res.json(result);
}
