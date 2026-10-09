import { initializeDatabase, db } from "../server/src/config/database.js";
import { startBackupSchedule } from "../server/src/services/backupService.js";

if (process.env.VERCEL === "1")
  throw new Error("Run the backup worker on a persistent host.");
if (!process.env.BACKUP_DATABASE_URL && !process.env.EMERGENCY_DATABASE_URL)
  throw new Error(
    "Set BACKUP_DATABASE_URL to the separate backup PostgreSQL server.",
  );
const hours = Number(process.env.BACKUP_INTERVAL_HOURS);
if (!Number.isFinite(hours) || hours < 1 || hours > 168)
  throw new Error("Set BACKUP_INTERVAL_HOURS between 1 and 168.");
await initializeDatabase();
const timer = startBackupSchedule();
timer.ref();
console.log(`Backup worker running every ${hours} hours.`);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    clearInterval(timer);
    await db.close();
    process.exit(0);
  });
