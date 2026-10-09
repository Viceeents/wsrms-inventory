import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  writeFile,
  appendFile,
  readdir,
  stat,
  open,
  unlink,
} from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import pg from "pg";
import { env, root } from "../config/env.js";
import { directDatabaseUrl, postgresPoolConfig } from "../config/postgres.js";
import { get, all, run, atomic } from "../config/database.js";
import { audit } from "./auditService.js";
import { notify } from "./notificationService.js";
import { HttpError } from "../middleware/errorMiddleware.js";
const directory = path.resolve(
  process.env.BACKUP_DIRECTORY || path.join(root, ".local/backups"),
);
const supported = process.env.VERCEL !== "1";
const primary = () =>
  directDatabaseUrl(env.databaseUrl, env.databaseUrlUnpooled);
const backupTarget = () =>
  process.env.BACKUP_DATABASE_URL || process.env.EMERGENCY_DATABASE_URL;
function connection(url) {
  const u = new URL(url);
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.slice(1)),
    PGSSLMODE:
      u.searchParams.get("sslmode") ||
      (u.hostname.endsWith("neon.tech") ? "require" : "prefer"),
  };
}
function binary(name) {
  const local = `C:/Program Files/PostgreSQL/18/bin/${name}.exe`;
  return (
    process.env[
      {
        pg_dump: "PG_DUMP_PATH",
        pg_restore: "PG_RESTORE_PATH",
        psql: "PSQL_PATH",
      }[name]
    ] || (existsSync(local) ? local : name)
  );
}
function command(name, args, url) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary(name), args, {
      env: connection(url),
      windowsHide: true,
      stdio: ["ignore", "ignore", "pipe"],
      shell: false,
    });
    child.stderr.on("data", () => {}); // Never expose connection credentials or SQL data.
    let timedOut = false;
    const timeout = setTimeout(
      () => {
        timedOut = true;
        child.kill();
      },
      15 * 60 * 1000,
    );
    child.on("error", () => {
      clearTimeout(timeout);
      reject(new Error("PostgreSQL backup tools are unavailable."));
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error("Database operation timed out."));
        return;
      }
      code === 0
        ? resolve()
        : reject(
            new Error(
              "Database operation failed. Check database access and PostgreSQL tools.",
            ),
          );
    });
  });
}
async function checksum(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
async function saveRecord(manifest, record) {
  await writeFile(manifest, JSON.stringify(record));
  await run(
    "INSERT INTO database_backups(id,schema_name,status,started_at,completed_at,size_bytes,checksum,error,created_by,backup_synced_at,backup_database_name) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,completed_at=excluded.completed_at,size_bytes=excluded.size_bytes,checksum=excluded.checksum,error=excluded.error,backup_synced_at=excluded.backup_synced_at,backup_database_name=excluded.backup_database_name",
    record.id,
    env.schema,
    record.status,
    record.started_at,
    record.completed_at || null,
    record.size_bytes || null,
    record.checksum || null,
    record.error || null,
    record.created_by,
    record.backup_synced_at || null,
    record.backup_database_name || null,
  ).catch(() =>
    console.error(
      "Backup monitoring metadata could not be stored; local recovery history retained.",
    ),
  );
}
async function history() {
  if (!supported)
    return all(
      "SELECT * FROM database_backups WHERE schema_name=? ORDER BY started_at DESC LIMIT 100",
      env.schema,
    ).catch(() => []);
  await mkdir(directory, { recursive: true });
  const names = (await readdir(directory)).filter((n) =>
    /^[0-9T.Z-]+\.json$/.test(n),
  );
  const rows = await Promise.all(
    names.map(async (name) => {
      try {
        return JSON.parse(await readFile(path.join(directory, name), "utf8"));
      } catch {
        return null;
      }
    }),
  );
  return rows
    .filter(Boolean)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}
async function lock(fn) {
  if (!supported)
    throw new HttpError(
      503,
      "Backups require a persistent server with PostgreSQL tools. Configure a scheduled backup worker for this deployment.",
    );
  await mkdir(directory, { recursive: true });
  let file;
  try {
    file = await open(path.join(directory, "operation.lock"), "wx");
  } catch {
    throw new HttpError(
      409,
      "A database operation is running, or an interrupted operation needs administrator review.",
    );
  }
  try {
    return await fn();
  } finally {
    await file.close();
    await unlink(path.join(directory, "operation.lock"));
  }
}
async function event(type, message, userId, severity = "info") {
  await atomic(async () => {
    if (userId)
      await audit(
        userId,
        type === "restore_completed" ? "DATABASE_RESTORE" : type.toUpperCase(),
        { metadata: { message } },
      );
    for (const user of await all(
      "SELECT id FROM users WHERE role='admin' AND active=1 AND suspended=false",
    ))
      await notify(type, message, { userId: user.id, severity });
  });
}
export async function databaseHealth() {
  let online = false,
    lastActivity = null;
  try {
    await get("SELECT 1 AS ok");
    online = true;
    lastActivity = (
      await get("SELECT MAX(created_at) AS last_activity FROM transactions")
    ).last_activity;
  } catch {}
  const items = await history(),
    last = items.find((i) => i.status === "Completed" && i.backup_synced_at);
  const age = last ? Date.now() - Date.parse(last.completed_at) : Infinity;
  const latest = items[0];
  const interrupted =
    latest?.status === "Running" &&
    Date.now() - Date.parse(latest.started_at) > 20 * 60000;
  const status =
    latest?.status === "Failed" || interrupted
      ? "Failed"
      : !supported && !last
        ? "Unavailable"
        : !last
          ? "Warning"
          : age <= Number(process.env.BACKUP_WARNING_HOURS || 6) * 3600000
            ? "Healthy"
            : "Warning";
  return {
    primary: {
      name: env.databaseUrl
        ? decodeURIComponent(new URL(env.databaseUrl).pathname.slice(1))
        : "wsrms_inventory_db",
      status: online ? "Online" : "Offline",
      last_activity: lastActivity,
    },
    backup: {
      name: backupTarget()
        ? decodeURIComponent(new URL(backupTarget()).pathname.slice(1))
        : last?.backup_database_name || "wsrms_inventory_backup",
      status,
      last_success: last?.completed_at || null,
      size_bytes: last?.size_bytes || null,
    },
    history: items.slice(0, 100),
    can_backup: supported,
    can_restore: supported && Boolean(backupTarget()),
    schedule_hours: Number(process.env.BACKUP_INTERVAL_HOURS) || null,
    operation_locked:
      supported && existsSync(path.join(directory, "operation.lock")),
    replication: "Not configured",
  };
}
export async function createBackup(userId = null) {
  return lock(async () => {
    const id = new Date().toISOString().replace(/[:.]/g, "-"),
      file = path.join(directory, `${id}.dump`),
      manifest = path.join(directory, `${id}.json`);
    const record = {
      id,
      status: "Running",
      started_at: new Date().toISOString(),
      created_by: userId,
      schema_name: env.schema,
    };
    await saveRecord(manifest, record);
    try {
      await command(
        "pg_dump",
        [
          "-Fc",
          "--no-owner",
          "--no-acl",
          "--schema",
          env.schema,
          "--file",
          file,
        ],
        primary(),
      );
      await command("pg_restore", ["--list", file], primary());
      Object.assign(record, {
        status: "Completed",
        completed_at: new Date().toISOString(),
        size_bytes: (await stat(file)).size,
        checksum: await checksum(file),
      });
      if (backupTarget()) {
        await restoreBackup(id, userId, {
          alreadyLocked: true,
          synchronization: true,
          recordOverride: record,
        });
        record.completed_at = new Date().toISOString();
        record.backup_synced_at = record.completed_at;
        record.backup_database_name = decodeURIComponent(
          new URL(backupTarget()).pathname.slice(1),
        );
      }
      await saveRecord(manifest, record);
      await event(
        "backup_completed",
        "Backup completed successfully.",
        userId,
        "success",
      ).catch(() => console.error("Backup notification could not be stored."));
      return record;
    } catch (error) {
      Object.assign(record, {
        status: "Failed",
        completed_at: new Date().toISOString(),
        error: error.message,
      });
      await saveRecord(manifest, record);
      await event("backup_failed", error.message, userId, "critical").catch(
        () => {},
      );
      throw new HttpError(503, error.message);
    }
  });
}
function sameDatabase(a, b) {
  const x = new URL(a),
    y = new URL(b);
  return (
    x.hostname.replace("-pooler", "") === y.hostname.replace("-pooler", "") &&
    (x.port || "5432") === (y.port || "5432") &&
    x.pathname === y.pathname
  );
}
export async function restoreBackup(
  id,
  userId,
  {
    alreadyLocked = false,
    synchronization = false,
    recordOverride = null,
  } = {},
) {
  const restore = async () => {
    const target = backupTarget();
    if (!target)
      throw new HttpError(
        503,
        "Configure a separate emergency database before restoring.",
      );
    if (sameDatabase(primary(), target))
      throw new HttpError(
        400,
        "The emergency database must be different from the primary database.",
      );
    const record =
      recordOverride ||
      (await history()).find(
        (i) =>
          i.id === id &&
          i.status === "Completed" &&
          i.schema_name === env.schema,
      );
    if (!record) throw new HttpError(404, "Completed backup not found.");
    const file = path.join(directory, `${id}.dump`);
    if (!record.checksum || (await checksum(file)) !== record.checksum)
      throw new HttpError(
        409,
        "Backup integrity check failed. Choose another recovery copy.",
      );
    await command("pg_restore", ["--list", file], primary());
    const recovery = new pg.Pool(postgresPoolConfig(target, env.schema));
    try {
      const identity = (
        await recovery.query(
          "SELECT current_database() AS name, inet_server_addr()::text AS address, inet_server_port() AS port",
        )
      ).rows[0];
      const source = await get(
        "SELECT current_database() AS name, inet_server_addr()::text AS address, inet_server_port() AS port",
      );
      if (
        identity.name === source.name &&
        identity.address === source.address &&
        identity.port === source.port
      )
        throw new HttpError(
          400,
          "Recovery target resolves to the primary database.",
        );
      if (userId)
        await audit(
          userId,
          synchronization
            ? "BACKUP_DATABASE_SYNC"
            : "DATABASE_RESTORE_REQUESTED",
          {
            metadata: { backupId: id, target: "Emergency database" },
          },
        );
      const sqlFile = path.join(directory, `${id}.restore.sql`);
      const transactionFile = path.join(directory, `${id}.transaction.sql`);
      try {
        await command(
          "pg_restore",
          ["--no-owner", "--no-acl", "--file", sqlFile, file],
          target,
        );
        // The dedicated recovery schema may contain constraints absent from the
        // source archive. Replace it atomically instead of relying on --clean.
        await writeFile(
          transactionFile,
          `DROP SCHEMA IF EXISTS "${env.schema}" CASCADE;\n`,
          { mode: 0o600 },
        );
        for await (const chunk of createReadStream(sqlFile))
          await appendFile(transactionFile, chunk);
        await appendFile(
          transactionFile,
          `\nSET LOCAL search_path TO "${env.schema}";\nSELECT COUNT(*) FROM parcels;\nSELECT COUNT(*) FROM storage_locations;\nDELETE FROM sessions;\n`,
        );
        await command(
          "psql",
          [
            "--no-psqlrc",
            "--set",
            "ON_ERROR_STOP=1",
            "--single-transaction",
            "--file",
            transactionFile,
          ],
          target,
        );
      } finally {
        await unlink(sqlFile).catch(() => {});
        await unlink(transactionFile).catch(() => {});
      }
      const client = await recovery.connect();
      try {
        await client.query("BEGIN");
        await client.query(`SET LOCAL search_path TO "${env.schema}"`);
        await client.query("SELECT COUNT(*) FROM parcels");
        await client.query("SELECT COUNT(*) FROM storage_locations");
        await client.query("DELETE FROM sessions"); // Recovery copy cannot revive old login sessions.
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      if (!synchronization)
        await event(
          "restore_completed",
          "Emergency database restored and checked. Primary database remains in use.",
          userId,
          "success",
        );
      return {
        ok: true,
        message:
          "Emergency database restored. Primary database remains in use.",
      };
    } catch (error) {
      if (userId)
        await audit(userId, "DATABASE_RESTORE_FAILED", {
          metadata: { backupId: id },
        }).catch(() => {});
      if (!synchronization)
        await event(
          "backup_failed",
          "Emergency database restore failed. Review recovery logs.",
          userId,
          "critical",
        ).catch(() => {});
      throw error instanceof HttpError
        ? error
        : new HttpError(
            503,
            "Emergency restore failed. Primary database remains in use.",
          );
    } finally {
      await recovery.end();
    }
  };
  return alreadyLocked ? restore() : lock(restore);
}
export function startBackupSchedule() {
  const hours = Number(process.env.BACKUP_INTERVAL_HOURS);
  if (!supported || !Number.isFinite(hours) || hours < 1 || hours > 168) return;
  const due = async () => {
    try {
      const last = (await history()).find(
        (i) =>
          i.status === "Completed" && (!backupTarget() || i.backup_synced_at),
      );
      if (
        !last ||
        Date.now() - Date.parse(last.completed_at) >= hours * 3600000
      )
        await createBackup();
    } catch (error) {
      console.error(`Scheduled backup: ${error.message}`);
    }
  };
  void due();
  const timer = setInterval(due, 60000);
  timer.unref();
  return timer;
}
