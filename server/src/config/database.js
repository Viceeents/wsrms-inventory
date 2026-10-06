import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import path from "node:path";
import { env, root } from "./env.js";
pg.types.setTypeParser(20, Number);
if (!/^[a-z][a-z0-9_]*$/.test(env.schema))
  throw new Error("Invalid database schema name.");
export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  options: `-c search_path=${env.schema}`,
  max: 10,
  connectionTimeoutMillis: 5000,
});
pool.on("error", () => console.error("PostgreSQL connection interrupted."));
export const db = { close: () => pool.end() };
const context = new AsyncLocalStorage();
export async function query(sql, params = []) {
  let i = 0;
  return (context.getStore() || pool).query(
    sql.replace(/\?/g, () => `$${++i}`),
    params,
  );
}
export const all = async (sql, ...params) => (await query(sql, params)).rows;
export const get = async (sql, ...params) => (await query(sql, params)).rows[0];
export async function run(sql, ...params) {
  if (
    /^INSERT INTO (users|categories|storage_locations|parcels|transactions|notifications)\b/i.test(
      sql,
    ) &&
    !/RETURNING/i.test(sql)
  )
    sql += " RETURNING id";
  const result = await query(sql, params);
  return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
}
export async function atomic(fn) {
  if (context.getStore()) return fn();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(87654321)");
    const result = await context.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function nextCode(prefix, year = true) {
  const y = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Manila",
    year: "numeric",
  }).format(new Date());
  const name = year ? `${prefix}-${y}` : prefix;
  const { value } = await get(
    "INSERT INTO counters(name,value) VALUES(?,1) ON CONFLICT(name) DO UPDATE SET value=counters.value+1 RETURNING value",
    name,
  );
  return `${name}-${String(value).padStart(year ? 6 : 5, "0")}`;
}
export async function initializeDatabase() {
  if (!env.databaseUrl)
    throw new Error(
      "Set DATABASE_URL in .env. See README.md for PostgreSQL setup.",
    );
  await atomic(async () => {
    await query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
    );
    if (
      !(await get(
        "SELECT version FROM schema_migrations WHERE version=?",
        "002_inventory_cells",
      ))
    ) {
      await query(
        readFileSync(
          path.join(root, "database/migrations/002_inventory_cells.sql"),
          "utf8",
        ),
      );
      await run(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
        "002_inventory_cells",
        new Date().toISOString(),
      );
    }
    await query(readFileSync(path.join(root, "database/schema.sql"), "utf8"));
    const { seed } = await import("../../../database/seeds/demo.js");
    await seed();
  });
}
