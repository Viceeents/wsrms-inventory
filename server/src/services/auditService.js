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
  return code;
}
