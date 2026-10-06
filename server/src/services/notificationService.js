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
  const settings = await get("SELECT * FROM system_settings WHERE id=1");
  if (!settings.notification_events.includes(type)) return;
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
  const location = await findLocation(locationId),
    settings = await get("SELECT * FROM system_settings WHERE id=1");
  if (!location) return;
  const percent = location.utilization * 100,
    level =
      percent >= 100
        ? "full"
        : percent >= settings.near_full_threshold
          ? "near_full"
          : "normal";
  const previous = await get(
    "SELECT level FROM storage_alert_state WHERE location_id=?",
    locationId,
  );
  await run(
    "INSERT INTO storage_alert_state(location_id,level) VALUES(?,?) ON CONFLICT(location_id) DO UPDATE SET level=excluded.level",
    locationId,
    level,
  );
  if (level !== previous?.level && level !== "normal")
    await notify(
      `capacity_${level}`,
      `${location.code} ${level === "full" ? "has reached a storage limit" : "is nearing a storage limit"} (${Math.round(percent)}% utilized).`,
      { severity: "warning", locationId },
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
