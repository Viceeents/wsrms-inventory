import { Router } from "express";
import * as c from "../controllers/userController.js";
import validate from "../middleware/validateRequest.js";
import { userSchema, userUpdateSchema } from "../utils/schemas.js";
const r = Router();
r.get("/", c.list);
r.post("/", validate(userSchema), c.create);
r.put("/:id", validate(userUpdateSchema), c.update);
export default r;
