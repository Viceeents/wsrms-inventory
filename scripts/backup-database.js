import { createBackup } from "../server/src/services/backupService.js";
import { db } from "../server/src/config/database.js";
try {
  const result = await createBackup();
  console.log(`Backup completed: ${result.id}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
