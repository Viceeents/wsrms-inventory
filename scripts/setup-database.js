import { initializeDatabase, db } from "../server/src/config/database.js";
try {
  await initializeDatabase();
  console.log("PostgreSQL schema and seed data are ready.");
} catch (error) {
  console.error(
    `Setup failed${error.code ? ` (${error.code})` : ""}. Set DATABASE_URL in .env and create the wsrms database first.`,
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
