import express from "express";
import helmet from "helmet";
import { existsSync } from "node:fs";
import path from "node:path";
import { env, root } from "./config/env.js";
import auth from "./middleware/authMiddleware.js";
import role from "./middleware/roleMiddleware.js";
import errorMiddleware from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import parcelRoutes from "./routes/parcelRoutes.js";
import warehouseRoutes from "./routes/warehouseRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import { summary } from "./controllers/reportController.js";
const app = express();
if (process.env.VERCEL === "1") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.production ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  express.json({
    limit: "1mb",
  }),
);
app.use("/api", (req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    ![env.origin, `${req.protocol}://${req.get("host")}`].includes(
      req.headers.origin,
    )
  )
    return res.status(403).json({
      message: "Request origin is not allowed.",
    });
  next();
});
app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
  }),
);
app.use("/api/auth", authRoutes);
app.use("/api", auth);
app.use("/api", settingsRoutes);
app.get("/api/dashboard", summary);
app.use("/api/parcels", parcelRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/users", role("admin"), userRoutes);
app.use("/api/reports", role("admin"), reportRoutes);
app.use("/api", (req, res) =>
  res.status(404).json({
    message: "API endpoint not found.",
  }),
);
const dist = path.join(root, "client/dist");
if (existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
}
app.use(errorMiddleware);
export default app;
