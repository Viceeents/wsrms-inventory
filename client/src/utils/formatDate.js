export default function formatDate(value, { time = true } = {}) {
  return value
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
        ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
      }).format(new Date(value))
    : "—";
}
