import { Router } from "express";
import * as c from "../controllers/reportController.js";
const r = Router();
r.get("/", c.summary);
r.get("/export/:kind", c.exportCsv);
export default r;
