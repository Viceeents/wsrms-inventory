import pg from "pg";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { env, root } from "../server/src/config/env.js";
const schema = `wsrms_test_${randomUUID().replaceAll("-", "")}`;
const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  connectionTimeoutMillis: 5000,
});
if (!/^wsrms_test_[a-f0-9]{32}$/.test(schema))
  throw new Error("Unsafe test schema identifier.");
try {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  const production = process.argv[2] === "production";
  const ui = production || process.argv[2] === "ui";
  const args = ui
    ? ["node_modules/@playwright/test/cli.js", "test"]
    : [
        "--test",
        "tests/pathfinding/routing.test.js",
        "tests/backend/api.test.js",
      ];
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      DB_SCHEMA: schema,
      SEED_DEMO: "false",
      ADMIN_PASSWORD: "Warehouse@2026",
      STAFF_PASSWORD: "Staff@2026",
      PORT: production ? "5174" : "3002",
      UI_PRODUCTION: production ? "true" : "false",
      API_PORT: "3002",
      APP_ORIGIN: "http://127.0.0.1:5174",
    },
  });
  process.exitCode = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(
    `Test setup failed${error.code ? ` (${error.code})` : ""}. Check DATABASE_URL and PostgreSQL CREATE SCHEMA permission.`,
  );
  process.exitCode = 1;
} finally {
  await pool
    .query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    .catch(() =>
      console.error(`Could not remove temporary test schema ${schema}.`),
    );
  await pool.end();
}
