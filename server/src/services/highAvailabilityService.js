// Read-only monitoring. Leader election, promotion, fencing and rejoining are
// owned by Patroni, not by each Vercel process.
export function summarizeCluster(nodes, checkedAt = new Date().toISOString()) {
  const leaders = nodes.filter((n) => n.online && n.leader);
  const active = leaders.length === 1 ? leaders[0] : null;
  const standby =
    active &&
    nodes.find((n) => n !== active && n.online && n.role === "replica");
  const sameCluster =
    active &&
    standby &&
    active.systemId &&
    active.systemId === standby.systemId &&
    active.scope === standby.scope;
  const stream =
    sameCluster &&
    active.replication?.find(
      (r) => r.application_name === standby.name && r.state === "streaming",
    );
  const paused = nodes.some((n) => n.paused);
  const replication =
    !active || !sameCluster || !stream || paused
      ? "Failed"
      : stream.sync_state === "sync" &&
          standby.timeline === active.timeline &&
          !standby.replayPaused
        ? "Healthy"
        : "Delayed";
  return {
    configured: true,
    checked_at: checkedAt,
    active_database: active?.id || null,
    replication_status: replication,
    last_synchronization: sameCluster ? standby.replayedAt || null : null,
    split_brain_detected: leaders.length > 1,
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.name,
      status: n.online ? "Online" : "Offline",
      role:
        n.leader && n.online
          ? "Active"
          : n.role === "replica" && n.online
            ? "Standby"
            : "Unknown",
    })),
  };
}
export async function highAvailabilityHealth(fetcher = fetch) {
  if (!process.env.HA_DATABASE_URL)
    return {
      configured: false,
      replication_status: "Not configured",
      nodes: [],
      active_database: null,
      last_synchronization: null,
    };
  const definitions = [
    {
      id: "Database A",
      url: process.env.HA_NODE_A_URL,
      expected: process.env.HA_NODE_A_NAME || "wsrms_inventory_db",
    },
    {
      id: "Database B",
      url: process.env.HA_NODE_B_URL,
      expected: process.env.HA_NODE_B_NAME || "wsrms_inventory_backup",
    },
  ];
  const nodes = await Promise.all(
    definitions.map(async ({ id, url, expected }) => {
      const unavailable = { id, name: expected, online: false, leader: false };
      try {
        const endpoint = new URL(url);
        if (
          endpoint.username ||
          endpoint.password ||
          endpoint.search ||
          endpoint.hash
        )
          return unavailable;
        if (
          endpoint.protocol !== "https:" &&
          !(
            process.env.NODE_ENV !== "production" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
          )
        )
          return unavailable;
        const options = {
          signal: AbortSignal.timeout(3000),
          redirect: "error",
          headers:
            process.env.HA_MONITOR_USER && process.env.HA_MONITOR_PASSWORD
              ? {
                  Authorization: `Basic ${Buffer.from(`${process.env.HA_MONITOR_USER}:${process.env.HA_MONITOR_PASSWORD}`).toString("base64")}`,
                }
              : {},
        };
        // /primary is 200 only for a running primary that holds Patroni's leader lock.
        const response = await fetcher(
          new URL("primary", `${endpoint.href.replace(/\/$/, "")}/`),
          options,
        );
        if (![200, 503].includes(response.status)) return unavailable;
        const data = await response.json();
        if (data.patroni?.name !== expected) return unavailable;
        return {
          id,
          name: expected,
          online: data.state === "running",
          leader:
            response.status === 200 &&
            ["primary", "master"].includes(data.role),
          role: data.role,
          systemId: data.database_system_identifier,
          scope: data.patroni.scope,
          timeline: data.timeline,
          replication: data.replication,
          replayedAt: data.xlog?.replayed_timestamp,
          replayPaused: data.xlog?.paused,
          paused: data.pause || data.cluster_unlocked,
        };
      } catch {
        return unavailable;
      }
    }),
  );
  return summarizeCluster(nodes);
}
