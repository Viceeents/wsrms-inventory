import { startBackupSchedule } from "./services/backupService.js";
import app from "./app.js";
import { env } from "./config/env.js";
import { db, initializeDatabase } from "./config/database.js";
try {
  await initializeDatabase();
} catch (error) {
  console.error(
    error.code
      ? `PostgreSQL setup failed (${error.code}). Check DATABASE_URL and create the wsrms database.`
      : error.message,
  );
  await db.close();
  process.exit(1);
}
startBackupSchedule();
const server = app.listen(env.port, env.host, () =>
  console.log(`WSRMS API: http://${env.host}:${env.port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
