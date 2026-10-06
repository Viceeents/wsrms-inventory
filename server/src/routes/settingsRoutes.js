import { Router } from "express";
import { z } from "zod";
import validate from "../middleware/validateRequest.js";
import role from "../middleware/roleMiddleware.js";
import * as c from "../controllers/settingsController.js";
import { notificationTypes } from "../services/notificationService.js";
const r = Router();
r.get("/preferences", c.preferences);
r.put(
  "/preferences",
  validate(
    z.object({
      font_size: z.enum(["small", "medium", "large"]),
      accent_color: z.enum(["blue", "teal", "green", "purple", "orange"]),
    }),
  ),
  c.savePreferences,
);
r.get("/system-settings", role("admin"), c.systemSettings);
r.put(
  "/system-settings",
  role("admin"),
  validate(
    z.object({
      revision: z.number().int().positive(),
      floor_storage_enabled: z.boolean(),
      near_full_threshold: z.number().int().min(50).max(99),
      notification_events: z
        .array(z.enum(notificationTypes))
        .max(notificationTypes.length)
        .refine((v) => new Set(v).size === v.length),
    }),
  ),
  c.saveSystemSettings,
);
r.get("/notifications", c.notifications);
r.post("/notifications/read-all", c.readAll);
r.post("/notifications/:id/read", c.readNotification);
export default r;
