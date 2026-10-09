import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import path from "node:path";
import { env, root } from "./env.js";
import { directDatabaseUrl, postgresPoolConfig } from "./postgres.js";
pg.types.setTypeParser(20, Number);
if (!/^[a-z][a-z0-9_]*$/.test(env.schema))
  throw new Error("Invalid database schema name.");
export const pool = new pg.Pool(
  postgresPoolConfig(env.databaseUrl, env.schema),
);
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
export async function atomic(fn, transactionPool = pool) {
  if (context.getStore()) return fn();
  const client = await transactionPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(87654321)");
    const result = await context.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
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
  const directUrl = directDatabaseUrl(env.databaseUrl, env.databaseUrlUnpooled);
  const migrationPool =
    directUrl === env.databaseUrl
      ? pool
      : new pg.Pool(postgresPoolConfig(directUrl, env.schema));
  try {
    // Warm serverless instances need no schema DDL or global mutation lock.
    // New databases and pending migrations still use the locked setup below.
    try {
      const { rows } = await migrationPool.query(
        "SELECT COUNT(*)::integer AS applied FROM schema_migrations WHERE version = ANY($1::text[])",
        [
          [
            "002_inventory_cells",
            "003_recovery_physical",
            "004_backup_neutral",
            "005_deleted_users",
            "006_team_messaging",
            "007_chat_activity",
          ],
        ],
      );
      if (rows[0].applied === 6) return;
    } catch (error) {
      if (error.code !== "42P01") throw error;
    }
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
      if (
        !(await get(
          "SELECT version FROM schema_migrations WHERE version=?",
          "003_recovery_physical",
        ))
      ) {
        await query(
          readFileSync(
            path.join(root, "database/migrations/003_recovery_physical.sql"),
            "utf8",
          ),
        );
        await run(
          "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
          "003_recovery_physical",
          new Date().toISOString(),
        );
      }
      const { seed } = await import("../../../database/seeds/demo.js");
      if (
        !(await get(
          "SELECT version FROM schema_migrations WHERE version=?",
          "004_backup_neutral",
        ))
      ) {
        await query(
          readFileSync(
            path.join(root, "database/migrations/004_backup_neutral.sql"),
            "utf8",
          ),
        );
        await run(
          "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
          "004_backup_neutral",
          new Date().toISOString(),
        );
      }
      if (
        !(await get(
          "SELECT version FROM schema_migrations WHERE version=?",
          "005_deleted_users",
        ))
      ) {
        await query(
          readFileSync(
            path.join(root, "database/migrations/005_deleted_users.sql"),
            "utf8",
          ),
        );
        await run(
          "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
          "005_deleted_users",
          new Date().toISOString(),
        );
      }
      if (
        !(await get(
          "SELECT version FROM schema_migrations WHERE version=?",
          "006_team_messaging",
        ))
      ) {
        await query(
          readFileSync(
            path.join(root, "database/migrations/006_team_messaging.sql"),
            "utf8",
          ),
        );
        await run(
          "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
          "006_team_messaging",
          new Date().toISOString(),
        );
      }
      if (
        !(await get(
          "SELECT version FROM schema_migrations WHERE version=?",
          "007_chat_activity",
        ))
      ) {
        await query(
          readFileSync(
            path.join(root, "database/migrations/007_chat_activity.sql"),
            "utf8",
          ),
        );
        await run(
          "INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)",
          "007_chat_activity",
          new Date().toISOString(),
        );
      }
      await seed();
    }, migrationPool);
  } finally {
    if (migrationPool !== pool) await migrationPool.end();
  }
}
