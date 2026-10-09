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
      theme: z.enum(["light", "dark"]).default("light"),
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
      size_limits: z
        .object({
          Small: z.array(z.number().positive().max(10000)).length(3),
          Medium: z.array(z.number().positive().max(10000)).length(3),
        })
        .refine(
          (v) =>
            v.Small.slice()
              .sort((a, b) => a - b)
              .every((n, i) => n <= v.Medium.slice().sort((a, b) => a - b)[i]),
          "Small dimensions must fit Medium limits.",
        )
        .optional(),
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
