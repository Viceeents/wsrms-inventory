import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../../server/src/app.js";
import {
  initializeDatabase,
  db,
  get,
} from "../../server/src/config/database.js";
const admin = request.agent(app),
  staff = request.agent(app);
let warehouse, parcel;
const payload = {
  description: "Integration test parcel",
  tracking_number: "TEST-001",
  category_id: 1,
  size: "Small",
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
  assert.ok(!route.path.includes(route.target));
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
  const logs = (await admin.get("/api/transactions?type=Layout%20change")).body;
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
  assert.equal(route.inbound.path[0], route.accessPointId);
  assert.equal(route.outbound.path[0], route.inbound.path.at(-1));
  assert.equal(route.outbound.path.at(-1), route.dispatchAccessPointId);
  assert.equal(route.totalSteps, route.inboundSteps + route.returnSteps);
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
    .send({ font_size: "large", accent_color: "purple" })
    .expect(200);
  assert.deepEqual((await staff.get("/api/preferences")).body, {
    font_size: "large",
    accent_color: "purple",
  });
  assert.deepEqual((await admin.get("/api/preferences")).body, {
    font_size: "medium",
    accent_color: "green",
  });
  for (const body of [
    { font_size: "huge", accent_color: "green" },
    { font_size: "small", accent_color: "#000000" },
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

test("Cross-origin mutations and signed-out sessions are denied", async () => {
  await staff
    .post("/api/parcels")
    .set("Origin", "https://untrusted.example")
    .send({ ...payload, location_id: 1 })
    .expect(403);
  await staff.post("/api/auth/logout").expect(200);
  await staff.get("/api/parcels").expect(401);
});
