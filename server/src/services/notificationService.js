import { all, get, run } from "../config/database.js";
import { findLocation } from "../models/storageLocationModel.js";
export const notificationTypes = [
  "capacity_near_full",
  "capacity_full",
  "check_in",
  "dispatch",
  "verification_failed",
  "blocked_route",
  "storage_unavailable",
  "layout_change",
  "backup_completed",
  "backup_failed",
  "restore_completed",
  "profile_request",
  "profile_approved",
  "profile_rejected",
  "floor_assignment",
  "security",
];
export async function notify(
  type,
  message,
  {
    userId = null,
    severity = "info",
    parcelId = null,
    locationId = null,
    dedupeKey = null,
  } = {},
) {
  if (type === "verification_failed") {
    const attempts = await get(
      "SELECT COUNT(*) AS count FROM transactions WHERE user_id=? AND parcel_id=? AND verified=0 AND created_at>?",
      userId,
      parcelId,
      new Date(Date.now() - 15 * 60000).toISOString(),
    );
    if (attempts.count >= 3) {
      severity = "critical";
      message = "Repeated QR verification failure. " + message;
      dedupeKey = `qr-failures:${userId}:${parcelId}:${new Date().toISOString().slice(0, 13)}`;
    }
  }
  const settings = await get("SELECT * FROM system_settings WHERE id=1");
  if (
    !settings.notification_events.includes(type) &&
    ![
      "backup_completed",
      "backup_failed",
      "restore_completed",
      "profile_request",
      "profile_approved",
      "profile_rejected",
      "security",
    ].includes(type)
  )
    return;
  await run(
    "INSERT INTO notifications(user_id,type,severity,message,parcel_id,location_id,dedupe_key,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(dedupe_key) DO NOTHING",
    userId,
    type,
    severity,
    message,
    parcelId,
    locationId,
    dedupeKey,
    new Date().toISOString(),
  );
}
export async function capacityAlerts(locationId) {
  const location = await findLocation(locationId);
  if (location) await capacityAlertsForLocations([location]);
}
export async function capacityAlertsForLocations(locations) {
  if (!locations.length) return;
  const settings = await get("SELECT * FROM system_settings WHERE id=1");
  const previous = new Map(
    (
      await all(
        "SELECT location_id,level FROM storage_alert_state WHERE location_id=ANY(?::integer[])",
        locations.map((l) => l.id),
      )
    ).map((s) => [s.location_id, s.level]),
  );
  const states = locations.map((location) => ({
    location,
    location_id: location.id,
    percent: location.utilization * 100,
    level:
      location.utilization >= 1
        ? "full"
        : location.utilization * 100 >= settings.near_full_threshold
          ? "near_full"
          : "normal",
  }));
  await run(
    "INSERT INTO storage_alert_state(location_id,level) SELECT location_id,level FROM jsonb_to_recordset(?::jsonb) AS v(location_id integer,level text) ON CONFLICT(location_id) DO UPDATE SET level=excluded.level",
    JSON.stringify(
      states.map(({ location_id, level }) => ({ location_id, level })),
    ),
  );
  for (const { location, level, percent } of states)
    if (level !== previous.get(location.id) && level !== "normal")
      await notify(
        `capacity_${level}`,
        `${location.code} ${level === "full" ? "has reached a storage limit" : "is nearing a storage limit"} (${Math.round(percent)}% utilized).`,
        { severity: "warning", locationId: location.id },
      );
}
export async function listNotifications(userId) {
  const items = await all(
    "SELECT n.*,r.read_at FROM notifications n LEFT JOIN notification_reads r ON r.notification_id=n.id AND r.user_id=? WHERE n.user_id IS NULL OR n.user_id=? ORDER BY n.id DESC LIMIT 200",
    userId,
    userId,
  );
  const { unread } = await get(
    "SELECT COUNT(*) AS unread FROM notifications n WHERE (n.user_id IS NULL OR n.user_id=?) AND NOT EXISTS(SELECT 1 FROM notification_reads r WHERE r.notification_id=n.id AND r.user_id=?)",
    userId,
    userId,
  );
  return { items, unread };
}
