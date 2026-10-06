import { Router } from "express";
import * as c from "../controllers/transactionController.js";
const r = Router();
r.get("/", c.list);
r.get("/:id", c.details);
export default r;
