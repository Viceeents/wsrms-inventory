const points = (path) =>
  path
    .map((id) => {
      const [r, c] = id.split("-").map(Number);
      return `${c + 0.5},${r + 0.5}`;
    })
    .join(" ");
export default function RouteOverlay({
  route,
  rows,
  cols,
  direction = "inbound",
}) {
  const path =
    direction === "outbound"
      ? route?.outbound?.path
      : route?.inbound?.path || route?.path;
  if (!path?.length) return null;
  const [r, c] = path[0].split("-").map(Number);
  return (
    <svg
      className="route-overlay"
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points(path)}
        fill="none"
        stroke="var(--accent)"
        strokeWidth=".10"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={direction === "outbound" ? ".18 .10" : undefined}
      />
      <circle cx={c + 0.5} cy={r + 0.5} r=".16" fill="var(--accent)" />
    </svg>
  );
}
