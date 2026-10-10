import { Router } from "express";
import { z } from "zod";
import * as c from "../controllers/parcelController.js";
import validate from "../middleware/validateRequest.js";
import role from "../middleware/roleMiddleware.js";
import { parcelSchema, checkInSchema, id } from "../utils/schemas.js";
const r = Router();
r.get("/", c.list);
r.post("/recommendations", validate(parcelSchema), c.recommendations);
r.post("/", validate(checkInSchema), c.create);
r.get("/:id", c.details);
r.patch(
  "/:id",
  role("admin", "manager"),
  validate(parcelSchema.extend({ reason: z.string().trim().min(5).max(250) })),
  c.correct,
);
r.get("/:id/route", c.route);
r.get("/:id/transfer-options", c.transferOptions);
r.post("/:id/retrieve", c.retrieve);
r.post(
  "/:id/verify",
  validate(z.object({ scanned_code: z.string().min(1).max(100) })),
  c.verify,
);
r.post(
  "/:id/dispatch",
  validate(
    z.object({
      scanned_code: z.string().min(1).max(100),
    }),
  ),
  c.dispatch,
);
r.post(
  "/:id/transfer",
  validate(
    z.object({
      location_id: id,
    }),
  ),
  c.transfer,
);
export default r;
