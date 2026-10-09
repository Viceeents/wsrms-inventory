export default function StatusBadge({ status }) {
  return (
    <span
      className={`badge badge-${String(status).toLowerCase().replaceAll(" ", "-")}`}
    >
      <span />
      {{ Stored: "In Storage", Retrieved: "Retrieval" }[status] || status}
    </span>
  );
}
