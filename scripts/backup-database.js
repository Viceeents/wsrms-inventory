import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { env, root } from "../server/src/config/env.js";
const url = new URL(env.databaseUrl),
  directory = path.join(root, ".local/backups");
mkdirSync(directory, { recursive: true });
const output = path.join(
  directory,
  `wsrms-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`,
);
const localBinary = "C:/Program Files/PostgreSQL/18/bin/pg_dump.exe";
const binary =
  process.env.PG_DUMP_PATH ||
  (existsSync(localBinary) ? localBinary : "pg_dump");
const result = spawnSync(
  binary,
  ["-Fc", "--no-owner", "--no-acl", "--schema", env.schema, "--file", output],
  {
    env: {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port || "5432",
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    },
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  },
);
if (result.status !== 0) {
  console.error(
    "Database backup failed. Check PostgreSQL connectivity and pg_dump availability.",
  );
  process.exit(1);
}
console.log(`Database backup saved: ${output}`);
