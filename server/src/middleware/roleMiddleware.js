import { all, atomic } from "../config/database.js";
import { audit } from "../services/auditService.js";
import { notify } from "../services/notificationService.js";
export default function roleMiddleware(...roles) {
  return async (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    await atomic(async () => {
      await audit(req.user.id, "UNAUTHORIZED_ADMIN_ACTION", {
        metadata: { method: req.method, path: req.originalUrl.split("?")[0] },
      });
      for (const admin of await all(
        "SELECT id FROM users WHERE role='admin' AND active=1 AND suspended=false",
      ))
        await notify(
          "security",
          `${req.user.code} attempted an unauthorized administrative action.`,
          {
            userId: admin.id,
            severity: "warning",
            dedupeKey: `admin-denied:${req.user.id}:${admin.id}:${new Date().toISOString().slice(0, 13)}`,
          },
        );
    });
    return res
      .status(403)
      .json({ message: "Administrator access is required." });
  };
}
