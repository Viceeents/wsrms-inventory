import { all, get, run, atomic } from "../config/database.js";
import { audit } from "../services/auditService.js";
import {
  capacityAlerts,
  listNotifications,
} from "../services/notificationService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
export const preferences = async (req, res) => {
  const preference = (await get(
    "SELECT font_size,theme FROM user_preferences WHERE user_id=?",
    req.user.id,
  )) || { font_size: "medium", theme: "light" };
  res.json({
    ...preference,
    theme: preference.theme === "dark" ? "dark" : "light",
  });
};
export async function savePreferences(req, res) {
  const { font_size, theme } = req.body;
  await run(
    "INSERT INTO user_preferences(user_id,font_size,theme) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET font_size=excluded.font_size,theme=excluded.theme",
    req.user.id,
    font_size,
    theme,
  );
  res.json(req.body);
}
export const systemSettings = async (req, res) =>
  res.json(await get("SELECT * FROM system_settings WHERE id=1"));
export async function saveSystemSettings(req, res) {
  const result = await atomic(async () => {
    const before = await get("SELECT * FROM system_settings WHERE id=1");
    if (before.revision !== req.body.revision)
      throw new HttpError(409, "Settings changed. Reload before saving.");
    await run(
      "UPDATE system_settings SET floor_storage_enabled=?,near_full_threshold=?,notification_events=?::jsonb,revision=revision+1 WHERE id=1",
      req.body.floor_storage_enabled,
      req.body.near_full_threshold,
      JSON.stringify(req.body.notification_events),
    );
    if (req.body.size_limits)
      await run(
        "UPDATE system_settings SET size_limits=?::jsonb WHERE id=1",
        JSON.stringify(req.body.size_limits),
      );
    await audit(req.user.id, "System settings updated", {
      metadata: { before, after: req.body },
    });
    for (const { id } of await all("SELECT id FROM storage_locations"))
      await capacityAlerts(id);
    return await get("SELECT * FROM system_settings WHERE id=1");
  });
  res.json(result);
}
export const notifications = async (req, res) =>
  res.json(await listNotifications(req.user.id));
export async function readNotification(req, res) {
  const notification = await get(
    "SELECT id FROM notifications WHERE id=? AND (user_id IS NULL OR user_id=?)",
    req.params.id,
    req.user.id,
  );
  if (!notification) throw new HttpError(404, "Notification not found.");
  await run(
    "INSERT INTO notification_reads(notification_id,user_id,read_at) VALUES(?,?,?) ON CONFLICT DO NOTHING",
    notification.id,
    req.user.id,
    new Date().toISOString(),
  );
  res.json({ ok: true });
}
export async function readAll(req, res) {
  await run(
    "INSERT INTO notification_reads(notification_id,user_id,read_at) SELECT id,?,? FROM notifications WHERE user_id IS NULL OR user_id=? ON CONFLICT DO NOTHING",
    req.user.id,
    new Date().toISOString(),
    req.user.id,
  );
  res.json({ ok: true });
}
