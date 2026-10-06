import { Router } from "express";
import * as c from "../controllers/warehouseController.js";
import role from "../middleware/roleMiddleware.js";
import validate from "../middleware/validateRequest.js";
import { layoutSchema } from "../utils/schemas.js";
const r = Router();
r.get("/", c.details);
r.put("/", role("admin"), validate(layoutSchema), c.update);
export default r;
