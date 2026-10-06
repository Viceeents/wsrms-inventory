import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
dotenv.config({
  path: path.join(root, ".env"),
  quiet: true,
});
export const env = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "127.0.0.1",
  databaseUrl: process.env.DATABASE_URL,
  schema: process.env.DB_SCHEMA || "public",
  production: process.env.NODE_ENV === "production",
  seedDemo: process.env.SEED_DEMO !== "false",
  adminPassword: process.env.ADMIN_PASSWORD || "Warehouse@2026",
  staffPassword: process.env.STAFF_PASSWORD || "Staff@2026",
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
};
