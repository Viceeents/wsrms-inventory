import app from "../server/src/app.js";
import { recoveryMessage } from "../server/src/utils/databaseAvailability.js";
import { initializeDatabase } from "../server/src/config/database.js";

let initialization;

export default async function handler(req, res) {
  try {
    initialization ??= initializeDatabase();
    await initialization;
  } catch (error) {
    initialization = undefined;
    // Log only the error code: connection errors can contain private details.
    console.error(
      "Database initialization failed:",
      error.code || "configuration",
    );
    res.writeHead(503, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        message: recoveryMessage,
      }),
    );
  }
  return app(req, res);
}
