import buildGraph, { cellKey } from "../algorithms/buildGraph.js";
import dijkstra from "../algorithms/dijkstra.js";
import { HttpError } from "../middleware/errorMiddleware.js";
const neighbors = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const enrich = (result) => ({
  ...result,
  steps: result.path.length - 1,
  cost: result.distance,
});
export function routeToLocation(warehouse, location, start) {
  const graph = buildGraph(warehouse.cells),
    target = warehouse.cells.find((c) => c.id === location.cell_id);
  if (!target?.active) return null;
  const doors = warehouse.cells.filter(
    (c) => c.type === "door" && graph.has(c.id),
  );
  const receiving = doors.filter((c) =>
      ["receiving", "both"].includes(c.door_usage),
    ),
    dispatch = doors.filter((c) => ["dispatch", "both"].includes(c.door_usage));
  if (!receiving.length || !dispatch.length) return null;
  if (start && !graph.has(start))
    throw new HttpError(400, "Choose an active, accessible start cell.");
  const origins = start ? [start] : receiving.map((c) => c.id);
  const pickups = graph.has(target.id)
    ? [target.id]
    : neighbors
        .map(([dr, dc]) => cellKey(target.row + dr, target.col + dc))
        .filter((id) => graph.has(id));
  const candidates = [];
  for (const origin of origins)
    for (const pickup of pickups) {
      const inbound = dijkstra(graph, origin, pickup);
      if (!inbound) continue;
      // Run Dijkstra again from the actual pickup point. Never double inbound distance.
      const preferred = dispatch.find((c) => c.id === origin);
      const returns = dispatch
        .map((door) => ({ door, result: dijkstra(graph, pickup, door.id) }))
        .filter((v) => v.result);
      returns.sort(
        (a, b) =>
          (a.door.id === preferred?.id
            ? -1
            : b.door.id === preferred?.id
              ? 1
              : 0) || a.result.distance - b.result.distance,
      );
      if (!returns.length) continue;
      const chosen = returns[0],
        outbound = chosen.result;
      candidates.push({
        path: inbound.path,
        distance: inbound.path.length - 1,
        start: origin,
        target: target.id,
        locationId: location.id,
        locationCode: location.code,
        accessPointId:
          receiving.find((d) => d.id === origin)?.id || receiving[0].id,
        dispatchAccessPointId: chosen.door.id,
        inbound: enrich(inbound),
        outbound: enrich(outbound),
        inboundSteps: inbound.path.length - 1,
        returnSteps: outbound.path.length - 1,
        totalSteps: inbound.path.length + outbound.path.length - 2,
        totalCost: inbound.distance + outbound.distance,
        revision: warehouse.revision,
      });
    }
  candidates.sort(
    (a, b) => a.inbound.cost - b.inbound.cost || a.totalCost - b.totalCost,
  );
  return candidates[0] || null;
}
