const center = ({ row, col }) => [col + 0.5, row + 0.5];
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
  const points = path.map((id) => center(id).join(",")).join(" "),
    [sx, sy] = center(path[0]),
    [ex, ey] = center(path[path.length - 1]),
    target = route.destination ? center(route.destination) : [ex, ey];
  return (
    <svg
      className="route-overlay"
      viewBox={`0 0 ${cols} ${rows}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={
        direction === "outbound"
          ? "Warehouse return route to access point"
          : "Warehouse route from access point to destination"
      }
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--route-halo)"
        strokeWidth=".23"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--route-color)"
        strokeWidth=".12"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={direction === "outbound" ? ".20 .10" : undefined}
      />
      <circle
        cx={sx}
        cy={sy}
        r=".18"
        fill="var(--route-color)"
        stroke="var(--route-halo)"
        strokeWidth=".05"
      />
      <circle
        cx={ex}
        cy={ey}
        r=".16"
        fill="var(--route-color)"
        stroke="var(--route-halo)"
        strokeWidth=".05"
      />
      {route.target && (
        <rect
          x={target[0] - 0.24}
          y={target[1] - 0.24}
          width=".48"
          height=".48"
          rx=".08"
          fill="none"
          stroke="var(--destination-color)"
          strokeWidth=".09"
        />
      )}
    </svg>
  );
}
