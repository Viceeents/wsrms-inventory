import { test } from "node:test";
import assert from "node:assert/strict";
import buildGraph from "../../server/src/algorithms/buildGraph.js";
import dijkstra from "../../server/src/algorithms/dijkstra.js";
import { routeToLocation } from "../../server/src/services/pathfindingService.js";
import { fitsLocation } from "../../server/src/algorithms/storageScoring.js";
import {
  directDatabaseUrl,
  postgresPoolConfig,
} from "../../server/src/config/postgres.js";
test("Neon pooled requests omit unsupported startup options and migrations use direct connections", () => {
  const pooled =
    "postgresql://user:example@ep-test-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  const direct = directDatabaseUrl(pooled);
  assert.equal(
    new URL(direct).hostname,
    "ep-test.c-4.ap-southeast-1.aws.neon.tech",
  );
  assert.equal(new URL(direct).searchParams.get("sslmode"), "require");
  assert.equal(postgresPoolConfig(pooled).connectionString, pooled);
  assert.equal("options" in postgresPoolConfig(pooled), false);
  assert.equal(
    postgresPoolConfig(pooled, "wsrms_test").connectionString,
    direct,
  );
  assert.equal(
    postgresPoolConfig(pooled, "wsrms_test").options,
    "-c search_path=wsrms_test",
  );
  assert.equal(
    directDatabaseUrl("postgresql://localhost/wsrms"),
    "postgresql://localhost/wsrms",
  );
  assert.equal(
    directDatabaseUrl(pooled, "postgresql://localhost/migrations"),
    "postgresql://localhost/migrations",
  );
});
const cells = Array.from({ length: 25 }, (_, i) => ({
  id: `${Math.floor(i / 5)}-${i % 5}`,
  row: Math.floor(i / 5),
  col: i % 5,
  active: true,
  walkable: i !== 12,
  can_store: i === 12,
  availability: "Available",
  movement_cost: 1,
  door_usage: i === 20 ? "both" : null,
  type: i === 20 ? "door" : i === 12 ? "rack" : "walkway",
}));
test("Dijkstra honors weights rather than taking the fewest edges", () => {
  const g = new Map([
    [
      "s",
      [
        { to: "a", weight: 9 },
        { to: "b", weight: 1 },
      ],
    ],
    ["a", [{ to: "t", weight: 1 }]],
    ["b", [{ to: "c", weight: 1 }]],
    ["c", [{ to: "t", weight: 1 }]],
    ["t", []],
  ]);
  assert.deepEqual(dijkstra(g, "s", "t"), {
    path: ["s", "b", "c", "t"],
    distance: 3,
  });
});
test("Graph excludes locations, walls, and blocked cells", () => {
  const g = buildGraph([
    ...cells,
    { id: "9-9", row: 9, col: 9, type: "wall" },
    { id: "9-8", row: 9, col: 8, type: "blocked" },
  ]);
  assert.equal(g.has("2-2"), false);
  assert.equal(g.has("9-9"), false);
  assert.equal(g.has("9-8"), false);
});
test("Routing ends adjacent to the target rack", () => {
  const route = routeToLocation(
    { cells },
    { id: 1, code: "A-01", row: 2, col: 2, cell_id: "2-2" },
  );
  assert.equal(route.distance, 3);
  assert.equal(route.path.includes("2-2"), false);
  const [r, c] = route.path.at(-1).split("-").map(Number);
  assert.equal(Math.abs(r - 2) + Math.abs(c - 2), 1);
});
test("Blocked aisles produce a detour and never appear in the path", () => {
  const changed = cells.map((c) =>
    c.col === 1 && c.row > 0 ? { ...c, type: "blocked" } : c,
  );
  const route = routeToLocation(
    { cells: changed },
    { id: 1, code: "A", row: 2, col: 2, cell_id: "2-2" },
  );
  assert.ok(route.distance > 3);
  assert.ok(
    route.path.every(
      (id) => changed.find((c) => c.id === id).type !== "blocked",
    ),
  );
});
test("Unreachable rack returns null", () => {
  const closed = cells.map((c) =>
    [
      [1, 2],
      [3, 2],
      [2, 1],
      [2, 3],
    ].some(([r, k]) => c.row === r && c.col === k)
      ? { ...c, type: "blocked" }
      : c,
  );
  assert.equal(
    routeToLocation(
      { cells: closed },
      { id: 1, row: 2, col: 2, cell_id: "2-2" },
    ),
    null,
  );
});
test("Start on a nonwalkable cell is rejected", () => {
  assert.throws(
    () => routeToLocation({ cells }, { row: 2, col: 2, cell_id: "2-2" }, "2-2"),
    /accessible start cell/,
  );
});
test("Rack compatibility includes quantity, size, total weight, category, and status", () => {
  const rack = {
    status: "Available",
    active: true,
    can_store: true,
    availability: "Available",
    occupancy: 7,
    unit_capacity: 10,
    storage_type: "rack",
    max_size: "Medium",
    used_units: 7,
    capacity: 10,
    used_weight: 7,
    max_weight: 10,
    category_id: 1,
  };
  const p = { size: "Small", quantity: 2, weight: 1, category_id: 1 };
  assert.equal(fitsLocation(rack, p), true);
  for (const delta of [
    { quantity: 4 },
    { weight: 2 },
    { size: "Large" },
    { category_id: 2 },
  ])
    assert.equal(fitsLocation(rack, { ...p, ...delta }), false);
  assert.equal(fitsLocation({ ...rack, status: "Reserved" }, p), false);
});

test("One shared access point produces independent outbound and return paths", () => {
  const loop = [
    {
      id: "0-0",
      row: 0,
      col: 0,
      type: "door",
      door_usage: "both",
      directions: ["east"],
    },
    { id: "0-1", row: 0, col: 1, type: "walkway", directions: ["east"] },
    { id: "0-2", row: 0, col: 2, type: "floor_storage", directions: ["south"] },
    { id: "1-2", row: 1, col: 2, type: "walkway", directions: ["west"] },
    { id: "1-1", row: 1, col: 1, type: "walkway", directions: ["west"] },
    { id: "1-0", row: 1, col: 0, type: "walkway", directions: ["north"] },
  ].map((c) => ({
    ...c,
    active: true,
    walkable: true,
    availability: "Available",
    movement_cost: 1,
  }));
  const route = routeToLocation(
    { cells: loop, revision: 7 },
    { cell_id: "0-2", id: 1 },
  );
  assert.equal(route.inboundSteps, 2);
  assert.equal(route.returnSteps, 4);
  assert.equal(route.totalSteps, 6);
  assert.deepEqual(route.outbound.path, ["0-2", "1-2", "1-1", "1-0", "0-0"]);
  assert.equal(route.revision, 7);
  assert.equal(route.path.at(-1), "0-2");
  const closed = loop.map((c) =>
    c.id === "1-1" ? { ...c, active: false } : c,
  );
  assert.equal(routeToLocation({ cells: closed }, { cell_id: "0-2" }), null);
});

test("Floor storage may be walkable or served from an adjacent aisle", () => {
  for (const walkable of [true, false]) {
    const draft = cells.map((c) =>
      c.id === "2-2" ? { ...c, type: "floor_storage", walkable } : c,
    );
    const route = routeToLocation({ cells: draft }, { cell_id: "2-2" });
    assert.equal(route.path.includes("2-2"), walkable);
    assert.equal(route.returnSteps, route.inboundSteps);
  }
  const g = buildGraph(
    cells.map((c) => (c.id === "3-0" ? { ...c, availability: "Blocked" } : c)),
  );
  assert.equal(g.has("3-0"), false);
});

test("Entry costs can differ on the return trip without changing step counts", () => {
  const line = [0, 1, 2].map((col) => ({
    id: `0-${col}`,
    row: 0,
    col,
    type: col === 0 ? "door" : "floor_storage",
    active: true,
    walkable: true,
    availability: "Available",
    movement_cost: col === 0 ? 4 : 1,
    door_usage: col === 0 ? "both" : null,
  }));
  const route = routeToLocation({ cells: line }, { cell_id: "0-2" });
  assert.equal(route.inboundSteps, 2);
  assert.equal(route.returnSteps, 2);
  assert.equal(route.inbound.cost, 2);
  assert.equal(route.outbound.cost, 5);
  assert.equal(route.totalCost, 7);
});

test("Rack and floor storage use the same capacity and compatibility checks", () => {
  const l = {
    active: true,
    can_store: true,
    availability: "Available",
    status: "Available",
    capacity: 5,
    occupancy: 4,
    unit_capacity: 20,
    used_units: 4,
    max_weight: 100,
    used_weight: 4,
    max_size: "Large",
    category_id: null,
  };
  const p = { size: "Small", quantity: 1, weight: 1, category_id: 1 };
  for (const storage_type of ["rack", "floor_storage"]) {
    assert.equal(fitsLocation({ ...l, storage_type }, p), true);
    assert.equal(
      fitsLocation({ ...l, storage_type }, { ...p, quantity: 2 }),
      false,
    );
  }
  assert.equal(
    fitsLocation({ ...l, storage_type: "floor_storage" }, p, {
      floor_storage_enabled: false,
    }),
    false,
  );
  assert.equal(fitsLocation({ ...l, active: false }, p), false);
});
