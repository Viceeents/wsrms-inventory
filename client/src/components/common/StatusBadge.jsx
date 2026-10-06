export default function StatusBadge({ status }) {
  return (
    <span
      className={`badge badge-${String(status).toLowerCase().replaceAll(" ", "-")}`}
    >
      <span />
      {status}
    </span>
  );
}
