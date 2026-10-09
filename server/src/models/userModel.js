import { all } from "../config/database.js";
const idle = Math.max(
  1,
  Math.min(60, Number(process.env.PRESENCE_IDLE_MINUTES) || 5),
);
const offline = Math.max(
  idle + 1,
  Math.min(1440, Number(process.env.PRESENCE_OFFLINE_MINUTES) || 30),
);
export const listUsers = async (archived = false) =>
  await all(
    `SELECT u.id,u.code,u.name,u.email,u.role,u.active,u.deleted_at,u.suspended,u.profile_image,u.last_login_at,u.last_activity_at,u.last_logout_at,u.created_at,
 CASE WHEN u.active=0 OR u.suspended OR NOT EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=u.id AND s.expires_at::timestamptz>now() AND s.last_seen_at::timestamptz>now()-interval '3 minutes' AND s.last_activity_at::timestamptz>now()-(? * interval '1 minute')) THEN 'Offline'
 WHEN EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=u.id AND s.expires_at::timestamptz>now() AND s.last_seen_at::timestamptz>now()-interval '3 minutes' AND s.last_activity_at::timestamptz>now()-(? * interval '1 minute')) THEN 'Online' ELSE 'Idle' END AS presence FROM users u WHERE u.deleted_at IS ${archived ? "NOT NULL" : "NULL"} ORDER BY u.id`,
    offline,
    idle,
  );
