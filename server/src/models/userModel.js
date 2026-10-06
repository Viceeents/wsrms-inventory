import { all } from "../config/database.js";
export const listUsers = async () =>
  await all(
    "SELECT id,code,name,email,role,active,created_at FROM users ORDER BY id",
  );
