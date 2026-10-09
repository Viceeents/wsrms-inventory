import { run, nextCode } from "../config/database.js";
export async function audit(
  userId,
  type,
  {
    parcelId = null,
    previousStatus = null,
    newStatus = null,
    previousLocation = null,
    newLocation = null,
    verified = null,
    metadata = {},
  } = {},
) {
  const code = await nextCode("TXN");
  await run(
    "INSERT INTO transactions(code,parcel_id,user_id,type,previous_status,new_status,previous_location,new_location,verified,metadata,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    code,
    parcelId,
    userId,
    type,
    previousStatus,
    newStatus,
    previousLocation,
    newLocation,
    verified === null ? null : Number(verified),
    JSON.stringify(metadata),
    new Date().toISOString(),
  );
  const update = {
    WAREHOUSE_LAYOUT_CHANGED: [
      "Warehouse map updated",
      "The warehouse layout has changed. Refresh the map before planning your next route.",
    ],
    DATABASE_RESTORE: [
      "Backup database restored",
      "An administrator restored and checked the standby database.",
    ],
    BACKUP_COMPLETED: [
      "Backup completed",
      "A warehouse backup completed successfully.",
    ],
    DATABASE_FAILOVER: [
      "Database connection updated",
      "Storix switched its database connection. Check database status for availability.",
    ],
  }[type];
  if (update)
    await run(
      "INSERT INTO messages(channel,title,message,created_at) VALUES(?,?,?,?)",
      "updates",
      update[0],
      update[1],
      new Date().toISOString(),
    );
  return code;
}
