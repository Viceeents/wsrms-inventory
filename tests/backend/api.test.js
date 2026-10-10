import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { randomUUID } from "node:crypto";
import {
  directDatabaseUrl,
  postgresPoolConfig,
} from "../../server/src/config/postgres.js";
import sharp from "sharp";
import { env } from "../../server/src/config/env.js";
import request from "supertest";
import app from "../../server/src/app.js";
import vercelHandler from "../../api/index.js";
import {
  initializeDatabase,
  db,
  get,
  run,
  query,
} from "../../server/src/config/database.js";
const admin = request.agent(app),
  staff = request.agent(app);
let warehouse, parcel;
const payload = {
  description: "Integration test parcel",
  tracking_number: "TEST-001",
  category_id: 1,
  size: "Small",
  length_cm: 20,
  width_cm: 15,
  height_cm: 10,
  weight: 2,
  quantity: 2,
};
before(async () => {
  await initializeDatabase();
  await admin
    .post("/api/auth/login")
    .send({ email: "admin@wsrms.local", password: "Warehouse@2026" })
    .expect(200);
  await staff
    .post("/api/auth/login")
    .send({ email: "staff@wsrms.local", password: "Staff@2026" })
    .expect(200);
  warehouse = (await staff.get("/api/warehouse").expect(200)).body;
});
after(async () => await db.close());
test("Vercel entry point initializes the database and preserves API routing", async () => {
  const results = await Promise.all([
    request(vercelHandler).get("/api/health").expect(200),
    request(vercelHandler).get("/api/auth/me").expect(401),
  ]);
  assert.deepEqual(results[0].body, { status: "ok" });
  const visitor = request.agent(vercelHandler);
  await visitor
    .post("/api/auth/login")
    .send({ email: "staff@wsrms.local", password: "Staff@2026" })
    .expect(200);
  await visitor.get("/api/warehouse").expect(200);
  await visitor.post("/api/auth/logout").expect(200);
});

test("Authentication and staff/admin permissions are enforced", async () => {
  await request(app).get("/api/parcels").expect(401);
  await staff.get("/api/users").expect(403);
  await staff.get("/api/reports").expect(403);
  await staff.put("/api/warehouse").send(warehouse).expect(403);
  await request(app)
    .post("/api/auth/login")
    .send({ email: "staff@wsrms.local", password: "wrong" })
    .expect(401);
});
test("Check-in stores parcel, consumes capacity, and logs both actions", async () => {
  const options = (
    await staff.post("/api/parcels/recommendations").send(payload).expect(200)
  ).body;
  assert.ok(options.length);
  assert.equal(options[0].category_id, 1);
  parcel = (
    await staff
      .post("/api/parcels")
      .send({ ...payload, location_id: options[0].id })
      .expect(201)
  ).body;
  assert.match(parcel.code, /^PRC-\d{4}-\d{6}$/);
  const w = (await staff.get("/api/warehouse")).body;
  assert.equal(
    w.locations.find((r) => r.id === parcel.location_id).used_units,
    2,
  );
  const logs = (await staff.get(`/api/transactions?parcel=${parcel.id}`)).body;
  assert.deepEqual(
    new Set(logs.map((t) => t.type)),
    new Set(["Check-in", "Storage assignment"]),
  );
});
test("Duplicate tracking number rolls back the entire check-in", async () => {
  const before = await get("SELECT COUNT(*) AS count FROM parcels");
  await staff
    .post("/api/parcels")
    .send({ ...payload, location_id: parcel.location_id })
    .expect(409);
  assert.equal(
    (await get("SELECT COUNT(*) AS count FROM parcels")).count,
    before.count,
  );
});
test("Capacity, size, category, weight, and invalid input are rejected", async () => {
  await staff
    .post("/api/parcels")
    .send({
      ...payload,
      tracking_number: "OVER",
      quantity: 100,
      location_id: parcel.location_id,
    })
    .expect(409);
  await staff
    .post("/api/parcels")
    .send({
      ...payload,
      tracking_number: "WRONG-CAT",
      category_id: 2,
      location_id: parcel.location_id,
    })
    .expect(409);
  await staff
    .post("/api/parcels")
    .send({
      ...payload,
      tracking_number: "HEAVY",
      weight: 500,
      location_id: parcel.location_id,
    })
    .expect(409);
  await staff
    .post("/api/parcels")
    .send({ ...payload, quantity: 0, location_id: parcel.location_id })
    .expect(400);
  await staff.get("/api/parcels/invalid").expect(400);
});
test("Search finds internal and external codes and filters statuses", async () => {
  assert.equal(
    (await staff.get(`/api/parcels?q=${parcel.code}`)).body[0].id,
    parcel.id,
  );
  assert.equal(
    (await staff.get("/api/parcels?q=test-001")).body[0].id,
    parcel.id,
  );
  assert.equal(
    (await staff.get("/api/parcels?status=Dispatched")).body.length,
    0,
  );
});
test("Concurrent check-ins cannot overfill the same rack", async () => {
  const rack = warehouse.locations.find((r) => r.category_id === 3);
  const body = {
    ...payload,
    category_id: 3,
    quantity: 15,
    location_id: rack.id,
  };
  const results = await Promise.all([
    staff
      .post("/api/parcels")
      .send({ ...body, tracking_number: "CONCURRENT-1" }),
    staff
      .post("/api/parcels")
      .send({ ...body, tracking_number: "CONCURRENT-2" }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  const w = (await staff.get("/api/warehouse")).body;
  assert.equal(w.locations.find((r) => r.id === rack.id).used_units, 15);
});
test("Transfer updates both occupancy and parcel history", async () => {
  const options = (
    await staff.get(`/api/parcels/${parcel.id}/transfer-options`)
  ).body;
  const previous = parcel.location_id;
  parcel = (
    await staff
      .post(`/api/parcels/${parcel.id}/transfer`)
      .send({ location_id: options[0].id })
      .expect(200)
  ).body;
  assert.notEqual(parcel.location_id, previous);
  const w = (await staff.get("/api/warehouse")).body;
  assert.equal(w.locations.find((r) => r.id === previous).used_units, 0);
  assert.equal(
    w.locations.find((r) => r.id === parcel.location_id).used_units,
    2,
  );
});
test("Retrieval path is adjacent to rack, then retrieval changes status", async () => {
  const route = (await staff.get(`/api/parcels/${parcel.id}/route`).expect(200))
    .body;
  assert.ok(route.path.length);
  assert.ok(
    !route.path.some(({ row, col }) => `${row}-${col}` === route.target),
  );
  await staff
    .post(`/api/parcels/${parcel.id}/dispatch`)
    .send({ scanned_code: parcel.code })
    .expect(409);
  parcel = (await staff.post(`/api/parcels/${parcel.id}/retrieve`).expect(200))
    .body;
  assert.equal(parcel.status, "Retrieved");
});
test("Wrong-code dispatch leaves status and occupancy untouched", async () => {
  const before = (await staff.get("/api/warehouse")).body.locations.find(
    (r) => r.id === parcel.location_id,
  ).used_units;
  await staff
    .post(`/api/parcels/${parcel.id}/dispatch`)
    .send({ scanned_code: "PRC-WRONG" })
    .expect(409);
  assert.equal(
    (await staff.get(`/api/parcels/${parcel.id}`)).body.status,
    "Retrieved",
  );
  assert.equal(
    (await staff.get("/api/warehouse")).body.locations.find(
      (r) => r.id === parcel.location_id,
    ).used_units,
    before,
  );
});
test("Verified dispatch frees capacity exactly once and records verification", async () => {
  parcel = (
    await staff
      .post(`/api/parcels/${parcel.id}/dispatch`)
      .send({ scanned_code: parcel.code })
      .expect(200)
  ).body;
  assert.equal(parcel.status, "Dispatched");
  assert.equal(
    (await staff.get("/api/warehouse")).body.locations.find(
      (r) => r.id === parcel.location_id,
    ).used_units,
    0,
  );
  await staff
    .post(`/api/parcels/${parcel.id}/dispatch`)
    .send({ scanned_code: parcel.code })
    .expect(409);
  const logs = (await staff.get(`/api/transactions?parcel=${parcel.id}`)).body;
  assert.equal(logs.filter((t) => t.type === "Dispatch").length, 1);
  assert.equal(logs.find((t) => t.type === "Dispatch").verified, 1);
  await staff.get(`/api/parcels/${parcel.id}/route`).expect(409);
});
test("Layout saves routes and audit snapshots; stale revisions are rejected", async () => {
  warehouse = (await admin.get("/api/warehouse")).body;
  const draft = structuredClone(warehouse);
  Object.assign(
    draft.cells.find((c) => c.id === "1-12"),
    { type: "blocked", walkable: false, can_store: false },
  );
  const saved = (await admin.put("/api/warehouse").send(draft).expect(200))
    .body;
  assert.equal(saved.revision, warehouse.revision + 1);
  await admin.put("/api/warehouse").send(draft).expect(409);
  warehouse = saved;
  const logs = (
    await admin.get("/api/transactions?type=WAREHOUSE_LAYOUT_CHANGED")
  ).body;
  assert.equal(logs[0].metadata.after.revision, saved.revision);
});
test("Layout rejects unreachable locations, removal of historical locations, and overloaded capacities", async () => {
  let draft = structuredClone(warehouse);
  Object.assign(
    draft.cells.find((c) => c.type === "door"),
    { type: "wall", walkable: false, can_store: false, door_usage: null },
  );
  await admin.put("/api/warehouse").send(draft).expect(400);
  draft = structuredClone(warehouse);
  const historyRack = draft.locations.find((r) => r.id === parcel.location_id);
  draft.locations = draft.locations.filter((r) => r.id !== historyRack.id);
  Object.assign(
    draft.cells.find((c) => c.id === historyRack.cell_id),
    { type: "walkway", walkable: true, can_store: false },
  );
  await admin.put("/api/warehouse").send(draft).expect(409);
  draft = structuredClone(warehouse);
  draft.locations.find((r) => r.used_units > 0).capacity = 1;
  await admin.put("/api/warehouse").send(draft).expect(409);
  draft = structuredClone(warehouse);
  for (const cell of draft.cells)
    if (cell.type === "walkway")
      Object.assign(cell, {
        type: "blocked",
        walkable: false,
        can_store: false,
      });
  await admin.put("/api/warehouse").send(draft).expect(409);
  assert.equal(
    (await admin.get("/api/warehouse")).body.revision,
    warehouse.revision,
  );
});
test("Category and user management are audited and disable live sessions", async () => {
  await admin
    .post("/api/categories")
    .send({ name: "Cold chain", color: "#448899", active: 1 })
    .expect(201);
  const created = (
    await admin
      .post("/api/users")
      .send({
        name: "New Worker",
        email: "worker@test.local",
        password: "NewPassword2026",
        role: "staff",
        active: 1,
      })
      .expect(201)
  ).body;
  const worker = request.agent(app);
  await worker
    .post("/api/auth/login")
    .send({ email: created.email, password: "NewPassword2026" })
    .expect(200);
  await admin
    .put(`/api/users/${created.id}`)
    .send({ ...created, password: "", active: 0 })
    .expect(200);
  await worker.get("/api/parcels").expect(401);
  const self = (await admin.get("/api/auth/me")).body;
  await admin
    .put(`/api/users/${self.id}`)
    .send({ ...self, password: "", active: 0 })
    .expect(400);
});
test("Manual corrections are admin-only and preserve original values in the audit log", async () => {
  const stored = (await admin.get("/api/parcels?status=Stored")).body[0];
  await admin
    .patch(`/api/parcels/${stored.id}`)
    .send({
      ...stored,
      tracking_number: stored.tracking_number || "",
      quantity: stored.quantity + 100,
      reason: "Testing load protection on corrections",
    })
    .expect(409);
  assert.equal(
    (await admin.get(`/api/parcels/${stored.id}`)).body.quantity,
    stored.quantity,
  );
  const body = {
    ...parcel,
    description: "Corrected parcel description",
    tracking_number: parcel.tracking_number,
    reason: "Correcting a data entry mistake",
  };
  await staff.patch(`/api/parcels/${parcel.id}`).send(body).expect(403);
  await admin.patch(`/api/parcels/${parcel.id}`).send(body).expect(200);
  const logs = (
    await admin.get(
      `/api/transactions?parcel=${parcel.id}&type=Manual%20correction`,
    )
  ).body;
  assert.equal(logs[0].metadata.before.description, parcel.description);
  assert.equal(logs[0].metadata.after.description, body.description);
  assert.equal(logs[0].metadata.reason, body.reason);
});
test("Reports and CSV exports contain saved operational data", async () => {
  const report = (await admin.get("/api/reports").expect(200)).body;
  assert.equal(report.dispatched, 1);
  assert.equal(report.days.length, 7);
  const csv = await admin.get("/api/reports/export/transactions").expect(200);
  assert.match(csv.headers["content-type"], /text\/csv/);
  assert.ok(csv.text.includes(parcel.code));
  await staff.get("/api/reports/export/parcels").expect(403);
});
test("Floor inventory, independent routes, verification and capacity release stay consistent", async () => {
  let w = (await staff.get("/api/warehouse")).body;
  const floor = w.locations.find((l) => l.storage_type === "floor_storage");
  assert.equal(w.cells.filter((c) => c.type === "door").length, 1);
  assert.equal(w.cells.find((c) => c.type === "door").door_usage, "both");
  const data = {
    ...payload,
    tracking_number: "FLOOR-TEST",
    quantity: 4,
    location_id: floor.id,
  };
  const options = (
    await staff.post("/api/parcels/recommendations").send(data).expect(200)
  ).body;
  assert.ok(options.some((l) => l.id === floor.id));
  let p = (await staff.post("/api/parcels").send(data).expect(201)).body;
  w = (await staff.get("/api/warehouse")).body;
  let cell = w.cells.find((c) => c.id === floor.cell_id);
  assert.equal(cell.occupancy, 4);
  assert.equal(cell.capacity, 5);
  assert.equal(cell.parcel_count, 1);
  assert.equal(cell.storage.inventory_status, "Occupied");
  assert.equal(cell.stored_parcels[0].id, p.id);
  assert.equal(
    (await staff.get(`/api/parcels?location=${floor.id}`)).body.length,
    1,
  );
  const route = (await staff.get(`/api/parcels/${p.id}/route`).expect(200))
    .body;
  assert.equal(
    `${route.inbound.path[0].row}-${route.inbound.path[0].col}`,
    route.accessPointId,
  );
  assert.deepEqual(route.outbound.path[0], route.inbound.path.at(-1));
  assert.equal(
    `${route.outbound.path.at(-1).row}-${route.outbound.path.at(-1).col}`,
    route.dispatchAccessPointId,
  );
  assert.equal(route.totalSteps, route.inboundSteps + route.returnSteps);
  const locationRoute = (
    await staff.get(`/api/warehouse/locations/${floor.id}/route`).expect(200)
  ).body;
  assert.deepEqual(locationRoute.inbound.path, route.inbound.path);
  assert.deepEqual(locationRoute.destination, { row: cell.row, col: cell.col });
  assert.ok(
    locationRoute.inbound.path.every(
      ({ row, col }) => Number.isInteger(row) && Number.isInteger(col),
    ),
  );
  await staff.get("/api/warehouse/locations/999999/route").expect(404);
  const second = (
    await staff
      .post("/api/parcels")
      .send({ ...data, tracking_number: "FLOOR-LAST", quantity: 1 })
      .expect(201)
  ).body;
  w = (await staff.get("/api/warehouse")).body;
  assert.equal(
    w.locations.find((l) => l.id === floor.id).inventory_status,
    "Full",
  );
  await staff
    .post("/api/parcels")
    .send({ ...data, tracking_number: "FLOOR-OVER", quantity: 1 })
    .expect(409);
  await staff.post(`/api/parcels/${p.id}/retrieve`).expect(200);
  assert.equal(
    (await staff.get("/api/warehouse")).body.locations.find(
      (l) => l.id === floor.id,
    ).occupancy,
    5,
  );
  assert.equal(
    (
      await staff
        .post(`/api/parcels/${p.id}/verify`)
        .send({ scanned_code: "WRONG" })
        .expect(200)
    ).body.verified,
    false,
  );
  assert.equal(
    (
      await staff
        .post(`/api/parcels/${p.id}/verify`)
        .send({ scanned_code: p.code })
        .expect(200)
    ).body.verified,
    true,
  );
  await staff
    .post(`/api/parcels/${p.id}/dispatch`)
    .send({ scanned_code: p.code })
    .expect(200);
  const final = (await staff.get("/api/warehouse")).body.locations.find(
    (l) => l.id === floor.id,
  );
  assert.equal(final.occupancy, 1);
  assert.equal(final.stored_parcels[0].id, second.id);
  const notes = (await staff.get("/api/notifications")).body.items;
  for (const type of [
    "capacity_near_full",
    "capacity_full",
    "verification_failed",
    "dispatch",
  ])
    assert.ok(notes.some((n) => n.type === type));
  const logs = (await staff.get(`/api/transactions?parcel=${p.id}`)).body;
  assert.ok(
    logs.some((t) => t.type === "QR verification failed" && t.verified === 0),
  );
  assert.equal(
    logs.find((t) => t.type === "Dispatch").metadata.totalSteps,
    route.totalSteps,
  );
});

test("Layout protects occupied cells and reports unreachable empty storage", async () => {
  let w = (await admin.get("/api/warehouse")).body;
  const occupied = w.locations.find(
    (l) => l.parcel_count > 0 && l.storage_type === "floor_storage",
  );
  for (const change of [
    { active: false },
    { can_store: false },
    { type: "wall", walkable: false, can_store: false },
    { availability: "Blocked" },
  ]) {
    const draft = structuredClone(w);
    Object.assign(
      draft.cells.find((c) => c.id === occupied.cell_id),
      change,
    );
    const result = await admin.put("/api/warehouse").send(draft).expect(409);
    assert.match(result.body.message, /Relocate/);
  }
  let draft = structuredClone(w),
    location = draft.locations.find(
      (l) => l.storage_type === "rack" && l.parcel_count === 0 && l.row === 2,
    );
  for (const c of draft.cells)
    if (Math.abs(c.row - location.row) + Math.abs(c.col - location.col) === 1)
      Object.assign(c, { type: "blocked", walkable: false, can_store: false });
  const saved = (await admin.put("/api/warehouse").send(draft).expect(200))
    .body;
  assert.ok(saved.warnings.some((v) => v.includes(location.code)));
  const options = (
    await staff
      .post("/api/parcels/recommendations")
      .send({ ...payload, tracking_number: "UNREACHABLE" })
  ).body;
  assert.ok(!options.some((l) => l.id === location.id));
  w.revision = saved.revision;
  await admin.put("/api/warehouse").send(w).expect(200);
});

test("Floor policy, notification settings and account preferences enforce permissions", async () => {
  await staff.get("/api/system-settings").expect(403);
  let settings = (await admin.get("/api/system-settings")).body;
  const saved = (
    await admin
      .put("/api/system-settings")
      .send({ ...settings, floor_storage_enabled: false })
      .expect(200)
  ).body;
  await admin.put("/api/system-settings").send(settings).expect(409);
  const options = (
    await staff.post("/api/parcels/recommendations").send(payload)
  ).body;
  assert.ok(options.every((l) => l.storage_type !== "floor_storage"));
  const floor = (await staff.get("/api/warehouse")).body.locations.find(
    (l) => l.storage_type === "floor_storage",
  );
  await staff
    .post("/api/parcels")
    .send({
      ...payload,
      tracking_number: "DISABLED-FLOOR",
      quantity: 1,
      location_id: floor.id,
    })
    .expect(409);
  const current = (
    await staff.get(`/api/parcels?location=${floor.id}&status=Stored`)
  ).body[0];
  await staff.get(`/api/parcels/${current.id}/route`).expect(200);
  await admin
    .put("/api/system-settings")
    .send({ ...saved, near_full_threshold: 10 })
    .expect(400);
  await admin
    .put("/api/system-settings")
    .send({ ...saved, floor_storage_enabled: true })
    .expect(200);
  await staff
    .put("/api/preferences")
    .send({ font_size: "large", theme: "dark" })
    .expect(200);
  assert.deepEqual((await staff.get("/api/preferences")).body, {
    font_size: "large",
    theme: "dark",
  });
  assert.deepEqual((await admin.get("/api/preferences")).body, {
    font_size: "medium",
    theme: "light",
  });
  for (const body of [
    { font_size: "huge", theme: "light" },
    { font_size: "small", theme: "invalid" },
    { font_size: "small", theme: "system" },
  ])
    await staff.put("/api/preferences").send(body).expect(400);
  assert.ok(
    (await admin.get("/api/transactions?type=System%20settings%20updated")).body
      .length >= 2,
  );
});

test("Notification read state is per account and private events stay private", async () => {
  const staffNotes = (await staff.get("/api/notifications")).body;
  const privateNote = staffNotes.items.find(
    (n) => n.type === "verification_failed",
  );
  await admin.post(`/api/notifications/${privateNote.id}/read`).expect(404);
  const adminNotes = (await admin.get("/api/notifications")).body;
  assert.ok(!adminNotes.items.some((n) => n.id === privateNote.id));
  const shared = staffNotes.items.find((n) => n.type === "capacity_full");
  await staff.post(`/api/notifications/${shared.id}/read`).expect(200);
  assert.ok(
    (await staff.get("/api/notifications")).body.items.find(
      (n) => n.id === shared.id,
    ).read_at,
  );
  assert.equal(
    (await admin.get("/api/notifications")).body.items.find(
      (n) => n.id === shared.id,
    ).read_at,
    null,
  );
  await staff.post("/api/notifications/read-all").expect(200);
  assert.equal((await staff.get("/api/notifications")).body.unread, 0);
});

test("Database initialization is idempotent and preserves parcel assignments", async () => {
  const before = await get(
    "SELECT COUNT(*) AS count,SUM(location_id) AS assignments FROM parcels",
  );
  const w = (await admin.get("/api/warehouse")).body;
  await initializeDatabase();
  assert.deepEqual(
    await get(
      "SELECT COUNT(*) AS count,SUM(location_id) AS assignments FROM parcels",
    ),
    before,
  );
  assert.equal((await admin.get("/api/warehouse")).body.revision, w.revision);
});

test("Measured parcels are classified by configured thresholds and compatible racks outrank floor storage", async () => {
  const body = {
    ...payload,
    tracking_number: "PHYSICAL-001",
    length_cm: 35,
    width_cm: 25,
    height_cm: 18,
    quantity: 1,
    size: "Large",
  };
  const options = (
    await staff.post("/api/parcels/recommendations").send(body).expect(200)
  ).body;
  assert.ok(options.length);
  assert.equal(options[0].storage_type, "rack");
  assert.ok(options[0].reason.includes("compatible rack"));
  const stored = (
    await staff
      .post("/api/parcels")
      .send({ ...body, location_id: options[0].id })
      .expect(201)
  ).body;
  assert.equal(stored.size, "Medium");
  assert.equal(stored.length_cm, 35);
  const over = {
    ...body,
    tracking_number: "OVERSIZED",
    length_cm: 5000,
    width_cm: 20,
    height_cm: 20,
  };
  assert.equal(
    (await staff.post("/api/parcels/recommendations").send(over).expect(200))
      .body.length,
    0,
  );
  await staff
    .post("/api/parcels")
    .send({ ...over, location_id: options[0].id })
    .expect(409);
  const missing = { ...body };
  delete missing.length_cm;
  await staff
    .post("/api/parcels")
    .send({ ...missing, location_id: options[0].id })
    .expect(400);
  const layout = (await admin.get("/api/warehouse")).body;
  layout.locations.find((l) => l.id === stored.location_id).width_cm = 1;
  await admin.put("/api/warehouse").send(layout).expect(409);
  const prefs = (await admin.get("/api/system-settings")).body;
  await admin
    .put("/api/system-settings")
    .send({
      ...prefs,
      size_limits: { Small: [10, 10, 10], Medium: [20, 20, 20] },
    })
    .expect(200);
  const changed = (
    await staff.post("/api/parcels/recommendations").send(body).expect(200)
  ).body;
  const compatible =
    changed.find((l) => l.storage_type === "rack" && l.max_size === "Large") ||
    changed[0];
  if (compatible) {
    const p = (
      await staff
        .post("/api/parcels")
        .send({
          ...body,
          tracking_number: "RECLASSIFIED",
          location_id: compatible.id,
        })
        .expect(201)
    ).body;
    assert.equal(p.size, "Large");
  }
  const fresh = (await admin.get("/api/system-settings")).body;
  await admin
    .put("/api/system-settings")
    .send({ ...fresh, size_limits: prefs.size_limits })
    .expect(200);
});

test("Presence requires a live connection and recent activity; heartbeat writes are throttled", async () => {
  const sid = (await staff.get("/api/auth/me")).body.id;
  const current = new Date().toISOString();
  await staff
    .post("/api/presence/heartbeat")
    .send({ activity_at: current })
    .expect(200);
  assert.equal(
    (await admin.get("/api/users")).body.find((u) => u.id === sid).presence,
    "Online",
  );
  await run(
    "UPDATE sessions SET last_seen_at=?,last_activity_at=? WHERE user_id=?",
    current,
    new Date(Date.now() - 6 * 60000).toISOString(),
    sid,
  );
  assert.equal(
    (await admin.get("/api/users")).body.find((u) => u.id === sid).presence,
    "Idle",
  );
  await run(
    "UPDATE sessions SET last_seen_at=? WHERE user_id=?",
    new Date(Date.now() - 4 * 60000).toISOString(),
    sid,
  );
  assert.equal(
    (await admin.get("/api/users")).body.find((u) => u.id === sid).presence,
    "Offline",
  );
  await staff
    .post("/api/presence/heartbeat")
    .send({ activity_at: current })
    .expect(200);
  const before = await get(
    "SELECT last_activity_at FROM users WHERE id=?",
    sid,
  );
  await staff
    .post("/api/presence/heartbeat")
    .send({ activity_at: new Date().toISOString() })
    .expect(200);
  assert.deepEqual(
    await get("SELECT last_activity_at FROM users WHERE id=?", sid),
    before,
  );
  await run(
    "UPDATE sessions SET last_activity_at=? WHERE user_id=?",
    new Date(Date.now() - 31 * 60000).toISOString(),
    sid,
  );
  assert.equal(
    (await admin.get("/api/users")).body.find((u) => u.id === sid).presence,
    "Offline",
  );
  await run(
    "UPDATE sessions SET last_seen_at=?,last_activity_at=? WHERE user_id=?",
    current,
    current,
    sid,
  );
});

test("Admin images save immediately while staff images require validated approval", async () => {
  const image = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#245d46" },
  })
    .png()
    .toBuffer();
  const body = { image: `data:image/png;base64,${image.toString("base64")}` },
    sid = (await staff.get("/api/auth/me")).body.id;
  const saved = (
    await admin.post("/api/profile/requests").send(body).expect(200)
  ).body;
  assert.equal(saved.status, "Saved");
  assert.equal(
    (await admin.get("/api/auth/me")).body.profile_image,
    saved.profile_image,
  );
  assert.equal((await admin.get("/api/profile/requests")).body.length, 0);
  await admin.post("/api/profile/requests").send(body).expect(200);
  const request = (
    await staff.post("/api/profile/requests").send(body).expect(201)
  ).body;
  assert.equal((await staff.get("/api/auth/me")).body.profile_image, null);
  await staff.post("/api/profile/requests").send(body).expect(409);
  await staff.get("/api/admin/profile-requests").expect(403);
  await staff
    .post(`/api/admin/profile-requests/${request.id}/review`)
    .send({ status: "Approved" })
    .expect(403);
  const pending = (await admin.get("/api/admin/profile-requests")).body.find(
    (r) => r.id === request.id,
  );
  assert.equal(pending.status, "Pending");
  assert.ok(pending.requested_image.startsWith("data:image/webp;base64,"));
  await admin
    .post(`/api/admin/profile-requests/${request.id}/review`)
    .send({ status: "Approved" })
    .expect(200);
  const active = (await staff.get("/api/auth/me")).body.profile_image;
  assert.equal(active, pending.requested_image);
  await admin
    .post(`/api/admin/profile-requests/${request.id}/review`)
    .send({ status: "Rejected" })
    .expect(409);
  const next = (
    await staff.post("/api/profile/requests").send(body).expect(201)
  ).body;
  await admin
    .post(`/api/admin/profile-requests/${next.id}/review`)
    .send({ status: "Rejected" })
    .expect(200);
  assert.equal((await staff.get("/api/auth/me")).body.profile_image, active);
  const approved = await get(
    "SELECT * FROM profile_image_requests WHERE id=?",
    request.id,
  );
  assert.ok(approved.reviewed_at);
  assert.equal(approved.user_id, sid);
  assert.ok(approved.reviewed_by);
  const notes = (await staff.get("/api/notifications")).body.items;
  assert.ok(notes.some((n) => n.type === "profile_approved"));
  assert.ok(notes.some((n) => n.type === "profile_rejected"));
  for (const image of [
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/png;base64,YXJiaXRyYXJ5",
    "data:image/png;base64," + "A".repeat(680000),
  ])
    for (const account of [staff, admin])
      await account.post("/api/profile/requests").send({ image }).expect(400);
  assert.ok(
    (await admin.get("/api/transactions?type=PROFILE_IMAGE_APPROVED")).body
      .length,
  );
});

test("Backup creation, failure monitoring, and restore permissions do not change primary data", async () => {
  await staff.get("/api/admin/database").expect(403);
  await staff.post("/api/admin/database/backups").expect(403);
  await staff.post("/api/admin/database/restore").send({}).expect(403);
  const before = await get("SELECT COUNT(*) AS count FROM parcels");
  const initialHealth = (await admin.get("/api/admin/database").expect(200)).body;
  assert.equal(
    initialHealth.primary.status,
    "Online",
    "Primary database must be online before backup",
  );
  const backupResponse = await admin.post("/api/admin/database/backups");
  assert.equal(backupResponse.status, 201, JSON.stringify(backupResponse.body));
  const backup = backupResponse.body;
  assert.equal(backup.status, "Completed");
  assert.ok(backup.size_bytes > 0);
  const health = (await admin.get("/api/admin/database").expect(200)).body;
  assert.equal(health.primary.status, "Online");
  assert.equal(health.backup.status, "Warning");
  await admin
    .post("/api/admin/database/restore")
    .send({
      backup_id: backup.id,
      confirmation: "RESTORE EMERGENCY DATABASE",
      password: "wrong",
    })
    .expect(403);
  process.env.EMERGENCY_DATABASE_URL = env.databaseUrl;
  try {
    await admin
      .post("/api/admin/database/restore")
      .send({
        backup_id: backup.id,
        confirmation: "RESTORE EMERGENCY DATABASE",
        password: "Warehouse@2026",
      })
      .expect(400);
  } finally {
    delete process.env.EMERGENCY_DATABASE_URL;
  }
  // Exercise a real restore only against a freshly created, isolated recovery database.
  const name = `wsrms_recovery_test_${randomUUID().replaceAll("-", "")}`;
  assert.match(name, /^wsrms_recovery_test_[a-f0-9]{32}$/);
  const direct = directDatabaseUrl(env.databaseUrl, env.databaseUrlUnpooled),
    operator = new pg.Pool(postgresPoolConfig(direct, "public"));
  let created = false;
  try {
    await operator.query(`CREATE DATABASE "${name}"`);
    created = true;
    const target = new URL(direct);
    target.pathname = `/${name}`;
    process.env.EMERGENCY_DATABASE_URL = target.toString();
    process.env.BACKUP_DATABASE_URL = target.toString();
    const synchronized = (
      await admin.post("/api/admin/database/backups").expect(201)
    ).body;
    assert.equal(synchronized.status, "Completed");
    assert.ok(synchronized.backup_synced_at);
    assert.equal(synchronized.backup_database_name, name);
    assert.equal(
      (await admin.get("/api/admin/database")).body.backup.status,
      "Healthy",
    );
    const legacy = new pg.Pool(
      postgresPoolConfig(target.toString(), env.schema),
    );
    try {
      await legacy.query(
        "CREATE TABLE recovery_only_dependency (cell_id TEXT REFERENCES grid_cells(id))",
      );
    } finally {
      await legacy.end();
    }
    await admin
      .post("/api/admin/database/restore")
      .send({
        backup_id: backup.id,
        confirmation: "RESTORE EMERGENCY DATABASE",
        password: "Warehouse@2026",
      })
      .expect(200);
    const recovery = new pg.Pool(
      postgresPoolConfig(target.toString(), env.schema),
    );
    try {
      assert.deepEqual(
        (await recovery.query("SELECT COUNT(*) AS count FROM parcels")).rows[0],
        before,
      );
      assert.equal(
        (await recovery.query("SELECT COUNT(*) AS count FROM sessions")).rows[0]
          .count,
        0,
      );
      assert.equal(
        (
          await recovery.query(
            "SELECT to_regclass('recovery_only_dependency') AS name",
          )
        ).rows[0].name,
        null,
      );
    } finally {
      await recovery.end();
    }
    assert.ok(
      (await admin.get("/api/transactions?type=DATABASE_RESTORE_REQUESTED"))
        .body.length,
    );
  } finally {
    delete process.env.BACKUP_DATABASE_URL;
    delete process.env.EMERGENCY_DATABASE_URL;
    if (created) await operator.query(`DROP DATABASE "${name}"`);
    await operator.end();
  }
  const old = process.env.PG_DUMP_PATH;
  process.env.PG_DUMP_PATH = "C:/__wsrms_missing_pg_dump__.exe";
  try {
    await admin.post("/api/admin/database/backups").expect(503);
  } finally {
    if (old) process.env.PG_DUMP_PATH = old;
    else delete process.env.PG_DUMP_PATH;
  }
  assert.equal(
    (await admin.get("/api/admin/database")).body.backup.status,
    "Failed",
  );
  assert.deepEqual(await get("SELECT COUNT(*) AS count FROM parcels"), before);
  const notes = (await admin.get("/api/notifications")).body.items;
  assert.ok(
    notes.some((n) => n.type === "backup_failed" && n.severity === "critical"),
  );
});

test("Cross-origin mutations and signed-out sessions are denied", async () => {
  await staff
    .post("/api/parcels")
    .set("Origin", "https://untrusted.example")
    .send({ ...payload, location_id: 1 })
    .expect(403);
  await staff.post("/api/auth/logout").expect(200);
  await staff.get("/api/parcels").expect(401);
});

test("Account deletion is admin-only, permanent, revokes sessions and retains history", async () => {
  await staff
    .post("/api/auth/login")
    .send({ email: "staff@wsrms.local", password: "Staff@2026" })
    .expect(200);
  const self = (await admin.get("/api/auth/me").expect(200)).body;
  await admin.delete(`/api/users/${self.id}`).expect(400);
  const created = (
    await admin
      .post("/api/users")
      .send({
        name: "Deletion test",
        email: "delete-test@wsrms.local",
        password: "DeleteTest@2026",
        role: "staff",
        active: 1,
      })
      .expect(201)
  ).body;
  const victim = request.agent(app);
  await victim
    .post("/api/auth/login")
    .send({ email: created.email, password: "DeleteTest@2026" })
    .expect(200);
  await staff.delete(`/api/users/${created.id}`).expect(403);
  await run(
    "INSERT INTO transactions(code,user_id,type,created_at) VALUES(?,?,?,?)",
    `DELETE-TEST-${created.id}`,
    created.id,
    "Historical test",
    new Date().toISOString(),
  );
  await admin.delete(`/api/users/${created.id}`).expect(200);
  await victim.get("/api/auth/me").expect(401);
  await victim
    .post("/api/auth/login")
    .send({ email: created.email, password: "DeleteTest@2026" })
    .expect(401);
  assert.ok(
    !(await admin.get("/api/users").expect(200)).body.some(
      (u) => u.id === created.id,
    ),
  );
  const archived = (
    await admin.get("/api/users?archived=true").expect(200)
  ).body.find((u) => u.id === created.id);
  assert.ok(archived.deleted_at);
  assert.equal(archived.active, 0);
  assert.ok(
    await get(
      "SELECT id FROM transactions WHERE user_id=? AND type=?",
      created.id,
      "Historical test",
    ),
  );
  await admin
    .put(`/api/users/${created.id}`)
    .send({
      name: created.name,
      email: created.email,
      role: "staff",
      active: 1,
      password: "",
    })
    .expect(404);
});
test("Messaging persists safely, enforces permissions and tracks reads per user", async () => {
  await request(app).get("/api/messages/team").expect(401);
  await staff
    .post("/api/messages/announcements")
    .send({ title: "Not allowed", message: "Staff announcement" })
    .expect(403);
  await staff
    .post("/api/messages/updates")
    .send({ message: "Fake update" })
    .expect(400);
  await staff.post("/api/messages/team").send({ message: "   " }).expect(400);
  await staff
    .post("/api/messages/team")
    .send({ message: "x".repeat(2001) })
    .expect(400);
  await staff.get("/api/messages/team?before=bad").expect(400);
  const sent = (
    await staff
      .post("/api/messages/team")
      .send({
        message: "<script>alert(1)</script> Parcel unloading completed.",
      })
      .expect(201)
  ).body;
  const history = (await admin.get("/api/messages/team").expect(200)).body;
  const saved = history.items.find((m) => m.id === sent.id);
  assert.ok(saved.unread);
  assert.equal(saved.sender_name, (await staff.get("/api/auth/me")).body.name);
  assert.equal(
    saved.message,
    "<script>alert(1)</script> Parcel unloading completed.",
  );
  assert.equal(saved.password_hash, undefined);
  assert.ok(
    (await admin.get("/api/messages/unread").expect(200)).body.channels.team >
      0,
  );
  await admin
    .post("/api/messages/team/read")
    .send({ through: sent.id })
    .expect(200);
  assert.equal(
    (await admin.get("/api/messages/unread").expect(200)).body.channels.team,
    0,
  );
  const announcement = (
    await admin
      .post("/api/messages/announcements")
      .send({
        title: "Maintenance",
        message: "Tomorrow at 9 AM.",
        priority: "Urgent",
      })
      .expect(201)
  ).body;
  const staffHistory = (
    await staff.get("/api/messages/announcements").expect(200)
  ).body;
  assert.equal(
    staffHistory.items.find((m) => m.id === announcement.id).priority,
    "Urgent",
  );
  assert.ok(
    (await staff.get("/api/messages/unread").expect(200)).body.channels
      .announcements > 0,
  );
  await staff
    .post("/api/messages/team/read")
    .send({ through: announcement.id })
    .expect(404);
  await staff
    .post("/api/messages/announcements/read")
    .send({ through: announcement.id })
    .expect(200);
  assert.equal(
    (await staff.get("/api/messages/unread").expect(200)).body.channels
      .announcements,
    0,
  );
  await staff
    .delete(`/api/messages/announcements/${announcement.id}`)
    .expect(403);
  await admin
    .delete(`/api/messages/announcements/${announcement.id}`)
    .expect(200);
  assert.ok(
    !(await staff.get("/api/messages/announcements")).body.items.some(
      (m) => m.id === announcement.id,
    ),
  );
  assert.ok(
    await get("SELECT archived_at FROM messages WHERE id=?", announcement.id),
  );
  const updates = (await staff.get("/api/messages/updates").expect(200)).body
    .items;
  assert.ok(updates.some((m) => m.title === "Warehouse map updated"));
  assert.ok(updates.every((m) => !m.message.includes("postgres://")));
});

test("Typing activity is authenticated, expires, excludes self and clears on send", async () => {
  await request(app).get("/api/messages/team/activity").expect(401);
  await request(app)
    .post("/api/messages/team/typing")
    .send({ typing: true })
    .expect(401);
  await staff
    .post("/api/messages/team/typing")
    .send({ typing: "yes" })
    .expect(400);
  const current = (await staff.get("/api/auth/me")).body;
  await staff
    .post("/api/messages/team/typing")
    .send({ typing: true })
    .expect(200);
  assert.ok(
    (await admin.get("/api/messages/team/activity")).body.typing.some(
      (u) => u.id === current.id,
    ),
  );
  assert.ok(
    !(await staff.get("/api/messages/team/activity")).body.typing.some(
      (u) => u.id === current.id,
    ),
  );
  await run(
    "UPDATE message_typing SET expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE user_id=?",
    current.id,
  );
  assert.ok(
    !(await admin.get("/api/messages/team/activity")).body.typing.some(
      (u) => u.id === current.id,
    ),
  );
  await staff
    .post("/api/messages/team/typing")
    .send({ typing: true })
    .expect(200);
  const message = (
    await staff
      .post("/api/messages/team")
      .send({ message: "Typing has finished." })
      .expect(201)
  ).body;
  assert.ok(
    !(await admin.get("/api/messages/team/activity")).body.typing.some(
      (u) => u.id === current.id,
    ),
  );
  const heads = (await admin.get("/api/messages/unread")).body.heads;
  assert.ok(
    heads.some(
      (u) => u.id === current.id && u.latest_id === message.id && u.unread > 0,
    ),
  );
  await admin
    .post("/api/messages/team/read")
    .send({ through: message.id })
    .expect(200);
  assert.equal((await admin.get("/api/messages/unread")).body.heads.length, 0);
  await staff
    .post("/api/messages/team/typing")
    .send({ typing: false })
    .expect(200);
});

test("Message history is bounded and older pages have no duplicates", async () => {
  for (let i = 0; i < 55; i++)
    await run(
      "INSERT INTO messages(channel,sender_user_id,message,created_at) VALUES(?,?,?,?)",
      "team",
      1,
      `History ${i}`,
      new Date().toISOString(),
    );
  const latest = (await staff.get("/api/messages/team").expect(200)).body;
  assert.equal(latest.items.length, 50);
  assert.equal(latest.hasMore, true);
  const earlier = (
    await staff
      .get(`/api/messages/team?before=${latest.items[0].id}`)
      .expect(200)
  ).body;
  assert.ok(earlier.items.length > 0);
  assert.ok(earlier.items.every((m) => m.id < latest.items[0].id));
  assert.equal(earlier.hasMore, false);
});

test("Rack group paths use the existing router and validate destinations", async () => {
  for (const rack of ["A", "B", "C"]) {
    const result = (
      await staff.get(`/api/warehouse/racks/${rack}/route`).expect(200)
    ).body;
    assert.equal(result.rackLabel, `Rack ${rack}`);
    assert.ok(result.locationCode.startsWith(`${rack}-`));
    assert.ok(result.inbound.path.length);
    assert.equal(result.totalSteps, result.inboundSteps + result.returnSteps);
  }
  await staff.get("/api/warehouse/racks/Z/route").expect(400);
});

test("Existing databases apply the pending manager migration", async () => {
  await query("DELETE FROM schema_migrations WHERE version='008_manager_role'");
  await query("ALTER TABLE users DROP CONSTRAINT users_role_check");
  await query(
    "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','staff'))",
  );
  await initializeDatabase();
  assert.ok(
    await get(
      "SELECT version FROM schema_migrations WHERE version=?",
      "008_manager_role",
    ),
  );
});

test("Managers can manage warehouse operations while account management stays restricted", async () => {
  const account = {
    name: "Warehouse Manager",
    email: "manager@test.example",
    password: "Manager@2026",
    role: "manager",
    active: 1,
  };
  const created = (await admin.post("/api/users").send(account).expect(201))
    .body;
  assert.equal(created.role, "manager");
  const manager = request.agent(app);
  await manager
    .post("/api/auth/login")
    .send({ email: account.email, password: account.password })
    .expect(200);
  await manager.get("/api/reports").expect(200);
  await manager.get("/api/reports/export/parcels").expect(200);
  await manager.get("/api/parcels").expect(200);
  await manager.get("/api/transactions").expect(200);
  await manager.get("/api/users").expect(403);
  await manager.post("/api/users").send(account).expect(403);
  await manager.put("/api/warehouse").send({}).expect(400);
  await staff.put("/api/warehouse").send({}).expect(403);
  await manager.get("/api/system-settings").expect(200);
  await manager.put("/api/system-settings").send({}).expect(400);
  await staff.get("/api/system-settings").expect(403);
  await manager
    .post("/api/categories")
    .send({ name: "Manager category", color: "#123456" })
    .expect(201);
  await manager.patch("/api/parcels/1").send({}).expect(400);
  await staff.patch("/api/parcels/1").send({}).expect(403);
  await manager.get("/api/admin/profile-requests").expect(200);
  await manager
    .post("/api/admin/profile-requests/999999/review")
    .send({ status: "Approved" })
    .expect(404);
  await staff.get("/api/admin/profile-requests").expect(403);
  await manager.get("/api/admin/database").expect(403);
  await staff.get("/api/reports").expect(403);
});
