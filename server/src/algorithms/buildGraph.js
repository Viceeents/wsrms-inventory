export const cellKey = (row, col) => `${row}-${col}`;
export const directions = {
  north: [-1, 0],
  south: [1, 0],
  east: [0, 1],
  west: [0, -1],
};
export const isWalkable = (cell) =>
  cell.active === true &&
  cell.walkable === true &&
  cell.availability !== "Blocked" &&
  !["rack", "wall", "blocked"].includes(cell.type);
export default function buildGraph(cells) {
  const accessible = new Map(cells.filter(isWalkable).map((c) => [c.id, c])),
    graph = new Map();
  for (const [id, c] of accessible) {
    const edges = (c.directions || Object.keys(directions))
      .map((d) => {
        const [dr, dc] = directions[d];
        return cellKey(c.row + dr, c.col + dc);
      })
      .filter((key) => accessible.has(key))
      .map((to) => ({ to, weight: accessible.get(to).movement_cost || 1 }));
    graph.set(id, edges);
  }
  return graph;
}
