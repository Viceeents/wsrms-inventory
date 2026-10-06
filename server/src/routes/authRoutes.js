import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import * as controller from "../controllers/authController.js";
import validate from "../middleware/validateRequest.js";
import auth from "../middleware/authMiddleware.js";
const router = Router();
router.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    message: {
      message: "Too many sign-in attempts. Please try again in 15 minutes.",
    },
  }),
  validate(
    z.object({
      email: z.email().max(200),
      password: z.string().min(1).max(128),
    }),
  ),
  controller.login,
);
router.post("/logout", controller.logout);
router.get("/me", auth, controller.me);
export default router;
