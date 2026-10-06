// Nonnegative weighted shortest path. Destinations may include several rack-side cells.
export default function dijkstra(graph, start, destinations) {
  const targets = new Set(
    Array.isArray(destinations) ? destinations : [destinations],
  );
  if (!graph.has(start)) return null;
  const distances = new Map([[start, 0]]),
    previous = new Map(),
    visited = new Set();
  const queue = [
    {
      id: start,
      distance: 0,
    },
  ];
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance);
    const { id, distance } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    if (targets.has(id)) {
      const path = [id];
      while (previous.has(path[0])) path.unshift(previous.get(path[0]));
      return {
        path,
        distance,
      };
    }
    for (const { to, weight } of graph.get(id) || []) {
      if (weight < 0) throw new Error("Dijkstra requires nonnegative weights");
      const candidate = distance + weight;
      if (candidate < (distances.get(to) ?? Infinity)) {
        distances.set(to, candidate);
        previous.set(to, id);
        queue.push({
          id: to,
          distance: candidate,
        });
      }
    }
  }
  return null;
}
