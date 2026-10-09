import { createHash } from "node:crypto";
import { get } from "../config/database.js";
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export function readToken(req) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("wsrms_session="));
  return cookie ? cookie.slice("wsrms_session=".length) : "";
}
export default async function authMiddleware(req, res, next) {
  const user = await get(
    "SELECT u.id,u.code,u.name,u.email,u.role,u.active,u.profile_image FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1 AND u.suspended=false AND u.deleted_at IS NULL",
    tokenHash(readToken(req)),
    new Date().toISOString(),
  );
  if (!user)
    return res.status(401).json({
      message: "Please sign in to continue.",
    });
  req.user = user;
  next();
}
