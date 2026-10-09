import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeCluster,
  highAvailabilityHealth,
} from "../../server/src/services/highAvailabilityService.js";
import { isDatabaseUnavailable } from "../../server/src/utils/databaseAvailability.js";
const a = {
  id: "Database A",
  name: "wsrms_inventory_db",
  online: true,
  leader: true,
  role: "primary",
  systemId: "1",
  scope: "wsrms",
  timeline: 1,
  replication: [
    {
      application_name: "wsrms_inventory_backup",
      state: "streaming",
      sync_state: "sync",
    },
  ],
};
const b = {
  id: "Database B",
  name: "wsrms_inventory_backup",
  online: true,
  leader: false,
  role: "replica",
  systemId: "1",
  scope: "wsrms",
  timeline: 1,
  replayedAt: "2026-10-07T06:00:00Z",
};
test("HA monitoring distinguishes synchronized, delayed, and inconsistent clusters", () => {
  assert.equal(summarizeCluster([a, b]).replication_status, "Healthy");
  assert.equal(
    summarizeCluster([a, { ...b, timeline: 2 }]).replication_status,
    "Delayed",
  );
  assert.equal(
    summarizeCluster([a, { ...b, systemId: "2" }]).replication_status,
    "Failed",
  );
  assert.equal(
    summarizeCluster([{ ...a, paused: true }, b]).replication_status,
    "Failed",
  );
  const split = summarizeCluster([a, { ...b, leader: true, role: "primary" }]);
  assert.equal(split.active_database, null);
  assert.equal(split.split_brain_detected, true);
});
test("A returning former primary remains standby until a controlled switchover", () => {
  const promoted = {
    ...b,
    leader: true,
    role: "primary",
    timeline: 2,
    replication: [
      { application_name: a.name, state: "streaming", sync_state: "sync" },
    ],
  };
  assert.equal(
    summarizeCluster([{ ...a, online: false, leader: false }, promoted])
      .active_database,
    "Database B",
  );
  const recovered = { ...a, leader: false, role: "replica", timeline: 2 };
  assert.equal(
    summarizeCluster([recovered, promoted]).active_database,
    "Database B",
  );
  assert.equal(
    summarizeCluster([recovered, promoted]).replication_status,
    "Healthy",
  );
});
test("Monitoring uses read-only leader checks and rejects insecure production endpoints", async () => {
  const keys = [
    "HA_DATABASE_URL",
    "HA_NODE_A_URL",
    "HA_NODE_B_URL",
    "NODE_ENV",
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    process.env.HA_DATABASE_URL =
      "postgresql://example.invalid/wsrms_inventory_db";
    process.env.HA_NODE_A_URL = "https://a.invalid";
    process.env.HA_NODE_B_URL = "https://b.invalid";
    process.env.NODE_ENV = "production";
    const calls = [];
    const h = await highAvailabilityHealth(async (url, options) => {
      calls.push({ url: String(url), method: options.method || "GET" });
      const node = url.hostname === "a.invalid" ? a : b;
      return {
        status: node.leader ? 200 : 503,
        json: async () => ({
          state: "running",
          role: node.role,
          database_system_identifier: node.systemId,
          timeline: node.timeline,
          replication: node.replication,
          patroni: { name: node.name, scope: node.scope },
          xlog: { replayed_timestamp: node.replayedAt },
        }),
      };
    });
    assert.equal(h.replication_status, "Healthy");
    assert.ok(
      calls.every((c) => c.method === "GET" && c.url.endsWith("/primary")),
    );
    process.env.HA_NODE_A_URL = "http://a.invalid";
    const failed = await highAvailabilityHealth(async () => {
      throw new Error("Unreachable");
    });
    assert.equal(failed.replication_status, "Failed");
  } finally {
    for (const k of keys)
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
  }
});
test("Connection failures are recoverable without exposing or retrying transactions", () => {
  assert.equal(isDatabaseUnavailable({ code: "57P01" }), true);
  assert.equal(isDatabaseUnavailable({ code: "ECONNRESET" }), true);
  assert.equal(isDatabaseUnavailable({ code: "23505" }), false);
});
